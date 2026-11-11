"""
Import an existing CV from a Word (.docx) or PDF file.

1. Extract plain text (python-docx for Word, pypdf for PDF).
2. Structure it into CV fields with AI (DeepSeek, JSON mode) when a key is set.
3. Otherwise, or if the AI call fails, fall back to a rule-based parser that
   finds contact details and splits the text on common section headings.

The result is a dict of CV model fields ready for CVSerializer.
"""
import io
import json
import logging
import re
import urllib.error
import urllib.request

from django.conf import settings

from .deepseek import DEEPSEEK_URL, _strip_dashes

logger = logging.getLogger(__name__)

MAX_BYTES = 5 * 1024 * 1024
MAX_TEXT = 18_000  # characters sent to the model


class ImportError_(Exception):
    """User-facing import problem (bad file, no text...)."""


# ---------------------------------------------------------------- extraction
def extract_text(upload) -> str:
    name = (getattr(upload, 'name', '') or '').lower()
    if upload.size > MAX_BYTES:
        raise ImportError_('That file is over 5 MB. Export a smaller copy and try again.')
    data = upload.read()
    if name.endswith('.docx') or data[:2] == b'PK':
        text = _docx_text(data)
    elif name.endswith('.pdf') or data[:5] == b'%PDF-':
        text = _pdf_text(data)
    elif name.endswith('.doc'):
        raise ImportError_('Old .doc files are not supported. Save it as .docx or PDF in Word first.')
    else:
        raise ImportError_('Upload a Word (.docx) or PDF file.')
    text = re.sub(r'[ \t ]+', ' ', text)
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text).strip()
    if len(text) < 40:
        raise ImportError_(
            'We could not find any text in that file. If it is a scanned image, '
            'export your CV from Word or Google Docs as a PDF and try again.'
        )
    return text


def _docx_text(data: bytes) -> str:
    from docx import Document
    try:
        doc = Document(io.BytesIO(data))
    except Exception as exc:  # noqa: BLE001
        raise ImportError_('That Word file could not be opened. Is it a valid .docx?') from exc
    lines = []
    # Body paragraphs and tables in document order (many CV templates use tables for layout).
    body = doc.element.body
    for child in body.iterchildren():
        tag = child.tag.rsplit('}', 1)[-1]
        if tag == 'p':
            lines.append(''.join(t.text or '' for t in child.iter() if t.tag.endswith('}t')))
        elif tag == 'tbl':
            for row in child.iter():
                if row.tag.endswith('}tc'):
                    for p in row.iter():
                        if p.tag.endswith('}p'):
                            lines.append(''.join(t.text or '' for t in p.iter() if t.tag.endswith('}t')))
    # Headers often hold the name and contact details.
    for section in doc.sections:
        for p in section.header.paragraphs:
            if p.text.strip():
                lines.insert(0, p.text)
    out, prev = [], None
    for line in lines:
        line = line.strip()
        if line != prev:  # merged table cells repeat their text
            out.append(line)
        prev = line
    return '\n'.join(out)


def _pdf_text(data: bytes) -> str:
    from pypdf import PdfReader
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            try:
                reader.decrypt('')
            except Exception as exc:  # noqa: BLE001
                raise ImportError_('That PDF is password protected. Remove the password and try again.') from exc
        pages = [p.extract_text() or '' for p in reader.pages[:6]]
    except ImportError_:
        raise
    except Exception as exc:  # noqa: BLE001
        raise ImportError_('That PDF could not be read. Try exporting it again.') from exc
    return '\n\n'.join(pages)


# ---------------------------------------------------------------- AI parsing
AI_PROMPT = """You convert the plain text of a CV into JSON. Return ONLY a JSON object with these keys:
{
 "full_name": str, "headline": str (current or target job title), "email": str, "phone": str,
 "location": str (city, country), "links": [{"label": str, "url": str}],
 "summary": str,
 "experience_structured": [{"role": str, "company": str, "location": str, "start_date": str,
    "end_date": str, "current": bool, "bullets": str (one achievement per line, no bullet symbols)}],
 "education_structured": [{"degree": str, "institution": str, "location": str, "start_date": str,
    "end_date": str, "honors": str}],
 "skills_structured": [{"category": str, "items": str (comma separated)}],
 "certifications": [{"name": str, "issuer": str, "date": str, "url": ""}],
 "projects": [{"name": str, "description": str, "tech": str, "url": str}],
 "languages": [{"language": str, "proficiency": str}],
 "awards": [{"name": str, "issuer": str, "date": str, "description": str}],
 "references": [{"name": str, "title": str, "company": str, "email": str, "phone": str}]
}
Rules: copy the candidate's wording faithfully, do not invent or embellish anything. Dates short,
like "Jun 2024" or "2021". Use "" or [] when something is missing. Most recent roles first."""


def parse_with_ai(text: str):
    api_key = getattr(settings, 'DOCS_GENERATOR_API_KEY', None) or ''
    if not api_key:
        return None
    payload = {
        'model': 'deepseek-chat',
        'messages': [
            {'role': 'system', 'content': AI_PROMPT},
            {'role': 'user', 'content': text[:MAX_TEXT]},
        ],
        'response_format': {'type': 'json_object'},
        'max_tokens': 4000,
        'temperature': 0.1,
    }
    req = urllib.request.Request(
        DEEPSEEK_URL, data=json.dumps(payload).encode(), method='POST',
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            result = json.loads(resp.read().decode())
        content = (result.get('choices') or [{}])[0].get('message', {}).get('content', '')
        content = re.sub(r'^```(?:json)?|```$', '', content.strip(), flags=re.M).strip()
        data = json.loads(content)
        return data if isinstance(data, dict) else None
    except (urllib.error.URLError, ValueError, KeyError, TimeoutError) as exc:
        logger.warning('CV import AI parse failed: %s', exc)
        return None


# ---------------------------------------------------------------- rule-based fallback
HEADINGS = {
    'summary': r'(professional\s+)?(summary|profile|about me|objective|career objective|personal statement)',
    'experience': r'(work|professional|employment|relevant)?\s*(experience|history|employment)',
    'education': r'education(al background)?|academic (background|qualifications)|qualifications',
    'skills': r'(key\s+|technical\s+|core\s+)?(skills|competencies|expertise|technologies)',
    'projects': r'projects?',
    'certifications': r'certifications?|certificates?|licen[cs]es?( and certifications)?|courses?|training',
    'languages': r'languages?',
    'awards': r'awards?|honou?rs?|achievements?',
    'references': r'references?|referees?',
}
_HEADING_RE = {k: re.compile(rf'^\s*({v})\s*:?\s*$', re.I) for k, v in HEADINGS.items()}
EMAIL_RE = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')
PHONE_RE = re.compile(r'(\+?\d[\d\s().-]{7,}\d)')
URL_RE = re.compile(r'((?:https?://)?(?:www\.)?(?:linkedin\.com|github\.com|behance\.net|[\w-]+\.(?:dev|io|me|com))/[\w/.-]+)', re.I)
BULLET = re.compile('^\\s*[•●▪◦■‣⁃\x7f\\-*–—·>]\\s*')
MONTH = r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?'
DATE = rf'(?:{MONTH}\s*\d{{4}}|\d{{1,2}}/\d{{4}}|\d{{4}})'
RANGE_RE = re.compile(rf'({DATE})\s*(?:-|–|—|to|until|,)\s*({DATE}|present|current|now|today)', re.I)
SINGLE_DATE_RE = re.compile(rf'^\s*({DATE})\s*$', re.I)
LEVELS = {'native', 'fluent', 'professional', 'conversational', 'basic', 'intermediate', 'advanced', 'beginner',
          'mother tongue', 'bilingual', 'proficient', 'working proficiency', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2'}


def parse_basic(text: str) -> dict:
    lines = [l.strip() for l in text.split('\n')]
    sections, current = {'_head': []}, '_head'
    for line in lines:
        key = next((k for k, rx in _HEADING_RE.items() if line and len(line) < 45 and rx.match(line)), None)
        if key:
            current = key
            sections.setdefault(current, [])
            continue
        sections.setdefault(current, []).append(line)

    head = [l for l in sections.get('_head', []) if l]
    blob = '\n'.join(head[:12]) or text[:800]
    email_m = EMAIL_RE.search(blob) or EMAIL_RE.search(text)
    email = email_m.group(0) if email_m else ''
    phone_m = PHONE_RE.search(blob)
    links = [{'label': _link_label(u), 'url': u} for u in dict.fromkeys(URL_RE.findall(blob))][:3]
    name = next((l for l in head if not EMAIL_RE.search(l) and not PHONE_RE.search(l) and 2 <= len(l.split()) <= 5
                 and not any(ch.isdigit() for ch in l)), '')
    headline = ''
    if name and name in head:
        nxt = head[head.index(name) + 1:head.index(name) + 2]
        if nxt and not EMAIL_RE.search(nxt[0]) and not PHONE_RE.search(nxt[0]) and len(nxt[0]) < 60:
            headline = nxt[0]

    def block(key):
        return '\n'.join(l for l in sections.get(key, [])).strip()

    exp_struct = _entries(sections.get('experience', []), 'experience')
    edu_struct = _entries(sections.get('education', []), 'education')
    return {
        'full_name': name, 'headline': headline, 'email': email,
        'phone': phone_m.group(1).strip() if phone_m else '',
        'location': '', 'links': links,
        'summary': ' '.join(l for l in sections.get('summary', []) if l).strip(),
        # Anything we cannot structure stays as plain text the user can tidy in the editor.
        'experience': '' if exp_struct else _clean_block(block('experience')),
        'education': '' if edu_struct else _clean_block(block('education')),
        'skills_structured': _skills(sections.get('skills', [])),
        'languages': _languages(sections.get('languages', []))[:8],
        'certifications': _certs(sections.get('certifications', []))[:10],
        'projects': [], 'awards': [], 'references': [],
        'experience_structured': exp_struct, 'education_structured': edu_struct,
    }


def _is_bullet(line):
    return bool(BULLET.match(line)) and not RANGE_RE.match(BULLET.sub('', line))


def _entries(lines, kind):
    """Split a section into entries: heading lines (title, org, dates), then bullet lines."""
    entries, cur = [], None
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        text = BULLET.sub('', line).strip()
        if _is_bullet(line):
            if cur is None:
                cur = {'head': [], 'bullets': []}
                entries.append(cur)
            cur['bullets'].append(text)
            continue
        # A lower-case start continues the previous wrapped bullet line.
        if cur and cur['bullets'] and text[:1].islower():
            cur['bullets'][-1] += ' ' + text
            continue
        if cur and len(cur['head']) >= 2 and ':' in text and not RANGE_RE.search(text):
            cur['bullets'].append(text)  # "Dissertation: ...", "Tools: ..."
            continue
        long_sentence = len(text) > 70 or (text.endswith('.') and len(text) > 40)
        if long_sentence and cur and cur['head']:
            cur['bullets'].append(text)
            continue
        if cur is None or cur['bullets'] or len(cur['head']) >= 4:
            cur = {'head': [], 'bullets': []}
            entries.append(cur)
        cur['head'].append(text)

    out = []
    for e in entries:
        head, start_d, end_d, current = [], '', '', False
        for h in e['head']:
            m = RANGE_RE.search(h)
            if m and not start_d:
                start_d, end_d = m.group(1).strip(), m.group(2).strip()
                current = end_d.lower() in ('present', 'current', 'now', 'today')
                rest = (h[:m.start()] + h[m.end():]).strip(' ,|-–—()')
                if rest:
                    head.append(rest)
            elif SINGLE_DATE_RE.match(h) and not end_d:
                end_d = h.strip()
            else:
                head.append(h)
        if not head and not e['bullets']:
            continue
        if len(head) == 1:  # "Role at Company" or "Role | Company" on one line
            parts = re.split(r'\s+(?:at|@|\|)\s+', head[0], maxsplit=1)
            head = parts if len(parts) == 2 else head
        title = head[0] if head else ''
        org = head[1] if len(head) > 1 else ''
        loc = head[2] if len(head) > 2 and len(head[2]) < 40 else ''
        if kind == 'experience':
            out.append({'role': title, 'company': org, 'location': loc, 'start_date': start_d,
                        'end_date': '' if current else end_d, 'current': current,
                        'bullets': '\n'.join(e['bullets'])})
        else:
            out.append({'degree': title, 'institution': org, 'location': loc, 'start_date': start_d,
                        'end_date': end_d, 'honors': ' '.join(e['bullets'] + head[3:])})
    return out[:12]


def _split_items(text):
    return [i.strip() for i in re.split('[,;|•]', text) if i.strip()]


def _skills(lines):
    groups, cur = [], None
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        text = BULLET.sub('', line).strip()
        if ':' in text and len(text.split(':', 1)[0]) < 35:
            cat, items = text.split(':', 1)
            groups.append({'category': cat.strip(), 'items': _split_items(items)})
            cur = None
        elif _is_bullet(line) or ',' in text or '|' in text:
            if cur is None:
                cur = {'category': '', 'items': []}
                groups.append(cur)
            cur['items'] += _split_items(text)
        elif len(text) < 30:
            cur = {'category': text, 'items': []}
            groups.append(cur)
    return [{'category': g['category'], 'items': ', '.join(g['items'][:25])} for g in groups if g['items']][:8]


def _languages(lines):
    out = []
    for raw in lines:
        text = BULLET.sub('', raw).strip()
        if not text:
            continue
        if text.lower() in LEVELS and out and not out[-1]['proficiency']:
            out[-1]['proficiency'] = text
            continue
        m = re.match('^([^():,\\-–]+?)\\s*[(:,\\-–]\\s*([^)]+)\\)?$', text)
        out.append({'language': m.group(1).strip(), 'proficiency': m.group(2).strip()} if m
                   else {'language': text, 'proficiency': ''})
    return out


def _certs(lines):
    out = []
    for raw in lines:
        text = BULLET.sub('', raw).strip()
        if not text:
            continue
        year = re.search(r'\b(19|20)\d{2}\b', text)
        if out and year and len(text) < 40 and not out[-1]['date'] and not out[-1]['issuer']:
            out[-1]['issuer'] = text[:year.start()].strip(' ,')
            out[-1]['date'] = year.group(0)
            continue
        parts = [p.strip() for p in text.split(',')]
        date = parts.pop() if len(parts) > 1 and re.fullmatch(r'(19|20)\d{2}', parts[-1]) else ''
        out.append({'name': parts[0], 'issuer': ', '.join(parts[1:]), 'date': date, 'url': ''})
    return out


def _clean_block(s):
    return '\n'.join(BULLET.sub('- ', l) if BULLET.match(l) else l for l in s.split('\n')).strip()


def _link_label(url):
    u = url.lower()
    for key, label in (('linkedin', 'LinkedIn'), ('github', 'GitHub'), ('behance', 'Behance')):
        if key in u:
            return label
    return 'Website'


# ---------------------------------------------------------------- normalisation
LIST_SHAPES = {
    'experience_structured': ('role', 'company', 'location', 'start_date', 'end_date', 'bullets'),
    'education_structured': ('degree', 'institution', 'location', 'start_date', 'end_date', 'honors'),
    'skills_structured': ('category', 'items'),
    'certifications': ('name', 'issuer', 'date', 'url'),
    'projects': ('name', 'description', 'tech', 'url'),
    'languages': ('language', 'proficiency'),
    'awards': ('name', 'issuer', 'date', 'description'),
    'references': ('name', 'title', 'company', 'email', 'phone'),
    'links': ('label', 'url'),
}
TEXT_FIELDS = {'full_name': 200, 'headline': 200, 'email': 254, 'phone': 50, 'location': 200,
               'summary': 4000, 'experience': 8000, 'education': 4000}


def _txt(v, limit=2000):
    if isinstance(v, list):
        v = '\n'.join(str(x) for x in v)
    v = str(v or '').strip()
    # Keep date ranges as ranges before stripping dash punctuation.
    v = re.sub(rf'({DATE})\s*[\u2013\u2014]\s*', r'\1 - ', v, flags=re.I)
    return _strip_dashes(v)[:limit]


def normalise(data: dict) -> dict:
    out = {k: _txt(data.get(k), n) for k, n in TEXT_FIELDS.items()}
    if out['email'] and not EMAIL_RE.fullmatch(out['email']):
        out['email'] = ''
    for key, fields in LIST_SHAPES.items():
        items = data.get(key) if isinstance(data.get(key), list) else []
        clean = []
        for item in items[:15]:
            if not isinstance(item, dict):
                continue
            row = {f: _txt(item.get(f)) for f in fields}
            if key == 'experience_structured':
                row['current'] = bool(item.get('current')) or row['end_date'].lower() in ('present', 'current', 'now')
                if row['current']:
                    row['end_date'] = ''
                row['bullets'] = '\n'.join(BULLET.sub('', l).strip() for l in row['bullets'].split('\n') if l.strip())
            if any(row[f] for f in fields if f != 'current'):
                clean.append(row)
        out[key] = clean
    return out


def import_cv(upload):
    """Returns (fields, method) where method is 'ai' or 'basic'."""
    text = extract_text(upload)
    parsed = parse_with_ai(text)
    method = 'ai'
    if not parsed or not (parsed.get('full_name') or parsed.get('experience_structured')):
        parsed, method = parse_basic(text), 'basic'
    return normalise(parsed), method

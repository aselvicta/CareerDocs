"""
Normalises a CV row (structured JSON + legacy free text) into one shape for the
PDF and Word exporters. Mirrors frontend/src/cv/model.js so exports follow the
same rules as the on-screen templates.
"""
import re

_BULLET = re.compile(r'^\s*(?:[-*•·▪◦–—]|\d+[.)])\s*')

SECTION_LABELS = {
    'summary': 'Profile', 'experience': 'Experience', 'education': 'Education', 'skills': 'Skills',
    'projects': 'Projects', 'certifications': 'Certifications', 'languages': 'Languages',
    'awards': 'Awards', 'references': 'References',
}
ASIDE_SECTIONS = ('skills', 'languages', 'certifications')


def _s(v):
    return str(v or '').strip()


def split_lines(text):
    return [_BULLET.sub('', l).strip() for l in str(text or '').split('\n') if _BULLET.sub('', l).strip()]


def split_list(text):
    return [_BULLET.sub('', p).strip() for p in re.split(r'[,;\n]', str(text or '')) if _BULLET.sub('', p).strip()]


def date_range(start, end, current=False):
    s, e = _s(start), ('Present' if current else _s(end))
    if s and e:
        return f'{s} – {e}'
    return s or e


def build(cv):
    exp = [{
        'title': _s(e.get('role')), 'org': _s(e.get('company')), 'location': _s(e.get('location')),
        'dates': date_range(e.get('start_date'), e.get('end_date'), e.get('current')),
        'bullets': split_lines(e.get('bullets')),
    } for e in (cv.experience_structured or []) if isinstance(e, dict) and (_s(e.get('role')) or _s(e.get('company')) or _s(e.get('bullets')))]
    edu = [{
        'title': _s(e.get('degree')), 'org': _s(e.get('institution')), 'location': _s(e.get('location')),
        'dates': date_range(e.get('start_date'), e.get('end_date')),
        'bullets': split_lines(e.get('honors')),
    } for e in (cv.education_structured or []) if isinstance(e, dict) and (_s(e.get('degree')) or _s(e.get('institution')))]
    skills = [{'category': _s(s.get('category')), 'items': split_list(s.get('items'))}
              for s in (cv.skills_structured or []) if isinstance(s, dict) and _s(s.get('items'))]
    if not skills and _s(cv.skills):
        skills = [{'category': '', 'items': split_list(cv.skills)}]
    projects = [{'title': _s(p.get('name')), 'org': _s(p.get('tech')), 'location': '', 'dates': '',
                 'bullets': split_lines(p.get('description'))}
                for p in (cv.projects or []) if isinstance(p, dict) and _s(p.get('name'))]
    certs = [{'title': _s(c.get('name')), 'meta': ', '.join(x for x in (_s(c.get('issuer')), _s(c.get('date'))) if x)}
             for c in (cv.certifications or []) if isinstance(c, dict) and _s(c.get('name'))]
    langs = [{'title': _s(l.get('language')), 'meta': _s(l.get('proficiency'))}
             for l in (cv.languages or []) if isinstance(l, dict) and _s(l.get('language'))]
    awards = [{'title': _s(a.get('name')), 'org': _s(a.get('issuer')), 'location': '', 'dates': _s(a.get('date')),
               'bullets': split_lines(a.get('description'))}
              for a in (cv.awards or []) if isinstance(a, dict) and _s(a.get('name'))]
    refs = [{'name': _s(r.get('name')),
             'role': ', '.join(x for x in (_s(r.get('title')), _s(r.get('company'))) if x),
             'contact': [x for x in (_s(r.get('email')), _s(r.get('phone'))) if x]}
            for r in (cv.references or []) if isinstance(r, dict) and _s(r.get('name'))]
    links = [{'label': _s(l.get('label')), 'url': _s(l.get('url'))}
             for l in (getattr(cv, 'links', None) or []) if isinstance(l, dict) and _s(l.get('url'))]
    return {
        'name': _s(cv.full_name) or 'Your Name',
        'headline': _s(getattr(cv, 'headline', '')),
        'photo': getattr(cv, 'photo', '') or '',
        'email': _s(cv.email), 'phone': _s(cv.phone), 'location': _s(cv.location), 'links': links,
        'summary': _s(cv.summary),
        'experience': exp, 'experience_text': '' if exp else _s(cv.experience),
        'education': edu, 'education_text': '' if edu else _s(cv.education),
        'skills': skills, 'projects': projects, 'certifications': certs, 'languages': langs,
        'awards': awards, 'references': refs,
    }


def has_content(m, key):
    if key == 'summary':
        return bool(m['summary'])
    if key in ('experience', 'education'):
        return bool(m[key] or m[f'{key}_text'])
    return bool(m.get(key))


def contact_items(m):
    items = [m['email'], m['phone'], m['location']]
    items += [re.sub(r'^https?://(www\.)?', '', l['url']).rstrip('/') for l in m['links']]
    return [i for i in items if i]

"""
Word (.docx) export for CVs and letters (python-docx).

Word files are meant to be edited, so every template exports as a clean single
column with real headings, right-aligned dates on tab stops and the template's
accent colour and font. That keeps them ATS friendly and easy to tweak.
"""
import io

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

from ..catalog import resolve_design
from . import cv_model

WORD_FONTS = {'sans': 'Calibri', 'serif': 'Georgia', 'classic': 'Times New Roman', 'mono': 'Calibri'}
INK = RGBColor(0x1F, 0x29, 0x33)
MUTED = RGBColor(0x6B, 0x72, 0x80)


def _rgb(hex_value):
    h = (hex_value or '#111827').lstrip('#')
    try:
        return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    except ValueError:
        return RGBColor(0x11, 0x18, 0x27)


def _setup(doc, font_name):
    sec = doc.sections[0]
    sec.page_height, sec.page_width = Cm(29.7), Cm(21.0)
    sec.left_margin = sec.right_margin = Cm(1.9)
    sec.top_margin = sec.bottom_margin = Cm(1.6)
    normal = doc.styles['Normal']
    normal.font.name = font_name
    normal.font.size = Pt(10)
    normal.font.color.rgb = INK
    normal.element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), font_name)
    pf = normal.paragraph_format
    pf.space_after = Pt(0)
    pf.space_before = Pt(0)
    pf.line_spacing = 1.12
    return sec.page_width - sec.left_margin - sec.right_margin


def _bottom_border(paragraph, color_hex, size=8):
    p_pr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), str(size))
    bottom.set(qn('w:space'), '2')
    bottom.set(qn('w:color'), (color_hex or '#111827').lstrip('#'))
    borders.append(bottom)
    p_pr.append(borders)


def _run(p, text, bold=False, italic=False, size=None, color=None, font=None):
    r = p.add_run(text)
    r.bold, r.italic = bold, italic
    if size:
        r.font.size = Pt(size)
    if color is not None:
        r.font.color.rgb = color
    if font:
        r.font.name = font
    return r


def _heading(doc, label, d, head_font):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.keep_with_next = True
    accent = _rgb(d['accent']) if d['accent_headings'] else RGBColor(0x11, 0x18, 0x27)
    _run(p, label.upper(), bold=True, size=10.5, color=accent, font=head_font)
    if d['ruled_headings']:
        _bottom_border(p, d['accent'] if d['accent_headings'] else '#111827')
    return p


def _entry(doc, e, width):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(5)
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.tab_stops.add_tab_stop(width, WD_TAB_ALIGNMENT.RIGHT)
    _run(p, e['title'] or e['org'], bold=True)
    if e['dates']:
        _run(p, '\t' + e['dates'], size=9, color=MUTED)
    if e['title'] and (e['org'] or e['location']):
        p2 = doc.add_paragraph()
        p2.paragraph_format.tab_stops.add_tab_stop(width, WD_TAB_ALIGNMENT.RIGHT)
        p2.paragraph_format.keep_with_next = bool(e['bullets'])
        _run(p2, e['org'], color=RGBColor(0x4B, 0x55, 0x63))
        if e['location']:
            _run(p2, '\t' + e['location'], size=9, color=MUTED)
    if len(e['bullets']) == 1:
        doc.add_paragraph(e['bullets'][0])
    else:
        for b in e['bullets']:
            bp = doc.add_paragraph(b, style='List Bullet')
            bp.paragraph_format.space_after = Pt(1)


def build_cv_docx(cv) -> io.BytesIO:
    d = resolve_design(getattr(cv, 'template', 'classic'), getattr(cv, 'design', {}))
    m = cv_model.build(cv)
    font = WORD_FONTS.get(d['font'], 'Calibri')
    head_font = 'Consolas' if d['font'] == 'mono' else font
    doc = Document()
    width = _setup(doc, font)
    center = d['header'] == 'center'

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if center else WD_ALIGN_PARAGRAPH.LEFT
    name_color = _rgb(d['accent']) if d['id'] in ('corporate', 'modern', 'slate') else RGBColor(0x11, 0x18, 0x27)
    _run(p, m['name'], bold=True, size=22, color=name_color, font=head_font)
    if m['headline']:
        hp = doc.add_paragraph()
        hp.alignment = p.alignment
        _run(hp, m['headline'], size=12, color=_rgb(d['accent']))
    contact = cv_model.contact_items(m)
    if contact:
        cp = doc.add_paragraph()
        cp.alignment = p.alignment
        cp.paragraph_format.space_before = Pt(4)
        _run(cp, '  |  '.join(contact), size=9.5, color=RGBColor(0x4B, 0x55, 0x63))
        _bottom_border(cp, d['accent'] if d['id'] in ('executive', 'corporate', 'modern') else '#d9dde3', 6)

    for key in d['section_order']:
        if key in d['hidden'] or not cv_model.has_content(m, key):
            continue
        _heading(doc, cv_model.SECTION_LABELS[key], d, head_font)
        if key == 'summary':
            doc.add_paragraph(m['summary'])
        elif key in ('experience', 'education'):
            if m[f'{key}_text']:
                doc.add_paragraph(m[f'{key}_text'])
            for e in m[key]:
                _entry(doc, e, width)
        elif key in ('projects', 'awards'):
            for e in m[key]:
                _entry(doc, e, width)
        elif key == 'skills':
            for g in m['skills']:
                sp = doc.add_paragraph()
                sp.paragraph_format.space_after = Pt(2)
                if g['category']:
                    _run(sp, g['category'] + ': ', bold=True)
                _run(sp, ', '.join(g['items']))
        elif key in ('certifications', 'languages'):
            for c in m[key]:
                cp2 = doc.add_paragraph()
                cp2.paragraph_format.space_after = Pt(2)
                _run(cp2, c['title'], bold=True)
                if c['meta']:
                    _run(cp2, f" ({c['meta']})" if key == 'languages' else f", {c['meta']}", color=MUTED)
        elif key == 'references':
            for r in m['references']:
                rp = doc.add_paragraph()
                rp.paragraph_format.space_after = Pt(5)
                _run(rp, r['name'], bold=True)
                for line in ([r['role']] if r['role'] else []) + r['contact']:
                    rp.add_run().add_break()
                    _run(rp, line, size=9.5, color=RGBColor(0x4B, 0x55, 0x63))

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer


def build_letter_docx(letter) -> io.BytesIO:
    from .export_pdf import _letter_parts

    d = resolve_design(getattr(letter, 'template', 'classic'), getattr(letter, 'design', {}))
    font = WORD_FONTS.get(d['font'], 'Calibri')
    doc = Document()
    _setup(doc, font)
    normal = doc.styles['Normal']
    normal.font.size = Pt(11)
    center = d['header'] == 'center'

    name = (letter.sender_name or '').strip() or 'Your Name'
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if center else WD_ALIGN_PARAGRAPH.LEFT
    _run(p, name, bold=True, size=20, color=_rgb(d['accent']) if d['accent_headings'] else RGBColor(0x11, 0x18, 0x27))
    headline = (getattr(letter, 'sender_headline', '') or '').strip()
    if headline:
        hp = doc.add_paragraph()
        hp.alignment = p.alignment
        _run(hp, headline, size=11.5, color=_rgb(d['accent']))
    contact = [x.strip() for x in (letter.sender_email, letter.sender_phone, getattr(letter, 'sender_location', '')) if (x or '').strip()]
    cp = doc.add_paragraph()
    cp.alignment = p.alignment
    cp.paragraph_format.space_after = Pt(18)
    _run(cp, '  |  '.join(contact), size=9.5, color=RGBColor(0x4B, 0x55, 0x63))
    _bottom_border(cp, d['accent'] if d['accent_headings'] else '#111827', 8)

    when = getattr(letter, 'updated_at', None)
    if when:
        dp = doc.add_paragraph()
        dp.paragraph_format.space_after = Pt(12)
        _run(dp, f'{when.day} {when.strftime("%B %Y")}', color=MUTED)
    to = [x.strip() for x in (letter.recipient_name, letter.recipient_title, letter.company) if (x or '').strip()]
    if to:
        tp = doc.add_paragraph()
        tp.paragraph_format.space_after = Pt(14)
        for i, line in enumerate(to):
            if i:
                tp.add_run().add_break()
            _run(tp, line, bold=(i == 0))

    paragraphs, greeting, closing = _letter_parts(letter)
    for text in ([greeting] if greeting else []) + paragraphs:
        bp = doc.add_paragraph(text)
        bp.paragraph_format.space_after = Pt(9)
        bp.paragraph_format.line_spacing = 1.25
    if closing:
        sp = doc.add_paragraph(closing)
        sp.paragraph_format.space_before = Pt(6)
        sp.paragraph_format.space_after = Pt(26)
        np_ = doc.add_paragraph()
        _run(np_, name, bold=True)

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer

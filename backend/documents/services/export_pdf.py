"""
Server-side PDF export (ReportLab) for CVs and letters.

The pixel-exact PDF comes from the browser print view in the frontend. This
module produces the PDF used for email attachments and the API download: it
follows the chosen template's layout (one column, sidebar or banner), colours,
fonts, photo and section order, built from the same catalog as the frontend.
"""
import base64
import io
from datetime import date
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, FrameBreak, KeepTogether, NextPageTemplate, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)
from reportlab.platypus.flowables import HRFlowable

from ..catalog import resolve_design
from . import cv_model

PAGE_W, PAGE_H = A4
PX = 0.75  # the frontend lays out A4 at 794px wide; 1px = 0.75pt

FONT_FACES = {
    'sans': ('Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique'),
    'serif': ('Times-Roman', 'Times-Bold', 'Times-Italic'),
    'classic': ('Times-Roman', 'Times-Bold', 'Times-Italic'),
    'mono': ('Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique'),
}
INK = colors.HexColor('#1f2933')
INK_2 = colors.HexColor('#4b5563')
INK_3 = colors.HexColor('#6b7280')
LINE = colors.HexColor('#d9dde3')


def _p(text):
    """Escape XML and keep line breaks for a ReportLab Paragraph."""
    return escape(str(text or '')).replace('\n', '<br/>')


def _hex(value, fallback='#111827'):
    try:
        return colors.HexColor(value)
    except (ValueError, TypeError):
        return colors.HexColor(fallback)


def _on(color):
    """Dark or white text for a background colour."""
    def lin(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    lum = 0.2126 * lin(color.red) + 0.7152 * lin(color.green) + 0.0722 * lin(color.blue)
    return colors.HexColor('#111827') if lum > 0.4 else colors.white


def _mix(color, amount, base=colors.white):
    """Blend `amount` of color into base (flat tint, no gradients)."""
    return colors.Color(
        base.red + (color.red - base.red) * amount,
        base.green + (color.green - base.green) * amount,
        base.blue + (color.blue - base.blue) * amount,
    )


class Avatar(Flowable):
    """Round (or square) photo, or initials on a tinted disc when there is no photo."""

    def __init__(self, size, photo, initials, bg, fg, square=False, align='CENTER'):
        super().__init__()
        self.size, self.initials, self.bg, self.fg, self.square = size, initials, bg, fg, square
        self.hAlign = align
        self.image = None
        if photo and photo.startswith('data:image/'):
            try:
                raw = base64.b64decode(photo.split(',', 1)[1])
                self.image = ImageReader(io.BytesIO(raw))
            except Exception:  # noqa: BLE001 - a broken photo must never break the export
                self.image = None

    def wrap(self, *_):
        return self.size, self.size

    def draw(self):
        c, s = self.canv, self.size
        c.saveState()
        path = c.beginPath()
        if self.square:
            path.roundRect(0, 0, s, s, 4)
        else:
            path.circle(s / 2, s / 2, s / 2)
        if self.image:
            c.clipPath(path, stroke=0, fill=0)
            c.drawImage(self.image, 0, 0, s, s, preserveAspectRatio=True, anchor='c', mask='auto')
        else:
            c.setFillColor(self.bg)
            c.drawPath(path, stroke=0, fill=1)
            c.setFillColor(self.fg)
            c.setFont('Helvetica-Bold', s * 0.3)
            c.drawCentredString(s / 2, s / 2 - s * 0.105, self.initials or 'CV')
        c.restoreState()


class Styles:
    def __init__(self, d, dark_aside=False):
        self.d = d
        reg, bold, ital = FONT_FACES.get(d['font'], FONT_FACES['sans'])
        self.reg, self.bold, self.ital = reg, bold, ital
        head_bold = 'Courier-Bold' if d['font'] == 'mono' else bold
        scale = {'compact': 0.92, 'airy': 1.05}.get(d['density'], 1.0)
        self.gap = {'compact': 0.75, 'airy': 1.2}.get(d['density'], 1.0)
        self.accent = _hex(d['accent'])
        self.on_accent = _on(self.accent)
        fs = 9.6 * scale
        self.fs = fs
        center = d['header'] == 'center'
        head_color = self.accent if d['accent_headings'] else colors.HexColor('#111827')

        def ps(name, **kw):
            base = dict(fontName=reg, fontSize=fs, leading=fs * 1.42, textColor=INK)
            base.update(kw)
            return ParagraphStyle(name, **base)

        self.name = ps('name', fontName=head_bold, fontSize=24, leading=27,
                       alignment=TA_CENTER if center else TA_LEFT,
                       textColor=self.accent if d['id'] == 'corporate' else colors.HexColor('#111827'))
        self.headline = ps('headline', fontSize=11, leading=14, textColor=self.accent,
                           alignment=TA_CENTER if center else TA_LEFT, spaceBefore=2)
        self.contact = ps('contact', fontSize=fs * 0.95, textColor=INK_2,
                          alignment=TA_CENTER if center else TA_LEFT, spaceBefore=6)
        self.h = ps('h', fontName=head_bold, fontSize=9.4, leading=12, textColor=head_color,
                    alignment=TA_CENTER if d['id'] == 'elegant' else TA_LEFT)
        self.body = ps('body')
        self.title = ps('title', fontName=bold, textColor=colors.HexColor('#111827'))
        self.dates = ps('dates', fontSize=fs * 0.92, textColor=INK_3, alignment=TA_RIGHT)
        self.sub = ps('sub', textColor=INK_2)
        self.sub_r = ps('subr', fontSize=fs * 0.92, textColor=INK_3, alignment=TA_RIGHT)
        self.bullet = ps('bullet', leftIndent=10, bulletIndent=1, spaceBefore=1.5 * self.gap)
        self.small = ps('small', fontSize=fs * 0.92, textColor=INK_2)

        # Side column variants
        aside_ink = self.on_accent if dark_aside else INK
        aside_muted = self.on_accent if dark_aside else INK_3
        self.a_name = ps('a_name', fontName=head_bold, fontSize=18, leading=21, textColor=aside_ink,
                         alignment=TA_CENTER, spaceBefore=10)
        self.a_headline = ps('a_headline', fontSize=8.5, leading=11, textColor=aside_muted, alignment=TA_CENTER)
        self.a_h = ps('a_h', fontName=head_bold, fontSize=8.6, leading=11,
                      textColor=aside_ink if dark_aside else (self.accent if d['accent_headings'] else colors.HexColor('#111827')))
        self.a_body = ps('a_body', fontSize=fs * 0.92, leading=fs * 1.35, textColor=aside_ink)
        self.a_bold = ps('a_bold', fontName=bold, fontSize=fs * 0.92, leading=fs * 1.35, textColor=aside_ink)
        self.a_muted = ps('a_muted', fontSize=fs * 0.88, leading=fs * 1.3, textColor=aside_muted)
        self.aside_rule = self.on_accent if dark_aside else LINE

        # Banner (white on accent)
        self.b_name = ps('b_name', fontName=head_bold, fontSize=24, leading=27, textColor=self.on_accent)
        self.b_headline = ps('b_headline', fontSize=11, leading=14, textColor=self.on_accent)
        self.b_contact = ps('b_contact', fontSize=fs * 0.92, textColor=self.on_accent, spaceBefore=6)


def _heading(s, label, width, aside=False):
    style = s.a_h if aside else s.h
    text = _p(label.upper())
    if s.d['font'] == 'mono' and not aside:
        text = _p(label.lower())
    out = [Spacer(1, (13 if aside else 12) * s.gap), Paragraph(text, style)]
    if aside:
        out.append(HRFlowable(width='100%', thickness=0.6, color=s.aside_rule, spaceBefore=3, spaceAfter=5))
    elif s.d['ruled_headings']:
        color = s.accent if s.d['accent_headings'] else colors.HexColor('#111827')
        out.append(HRFlowable(width='100%', thickness=1.1, color=color, spaceBefore=3, spaceAfter=6))
    else:
        out.append(Spacer(1, 5))
    return out


def _two(left, right, width, right_w=110):
    t = Table([[left, right]], colWidths=[width - right_w, right_w])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    return t


def _entry(s, e, width):
    parts = [_two(Paragraph(_p(e['title'] or e['org']), s.title), Paragraph(_p(e['dates']), s.dates), width)]
    if e['title'] and (e['org'] or e['location']):
        parts.append(_two(Paragraph(_p(e['org']), s.sub), Paragraph(_p(e['location']), s.sub_r), width))
    bullets = e['bullets']
    if len(bullets) == 1:
        parts.append(Paragraph(_p(bullets[0]), s.body))
    else:
        for b in bullets:
            parts.append(Paragraph(_p(b), s.bullet, bulletText='•'))
    parts.append(Spacer(1, 7 * s.gap))
    return parts  # caller wraps in KeepTogether (nesting KeepTogether forces page breaks)


def _section_main(s, m, key, width):
    head = _heading(s, cv_model.SECTION_LABELS[key], width)
    body = []
    if key == 'summary':
        body = [Paragraph(_p(m['summary']), s.body)]
    elif key in ('experience', 'education'):
        if m[f'{key}_text']:
            body = [Paragraph(_p(m[f'{key}_text']), s.body)]
        else:
            body = [_entry(s, e, width) for e in m[key]]
    elif key in ('projects', 'awards'):
        body = [_entry(s, e, width) for e in m[key]]
    elif key == 'skills':
        for g in m['skills']:
            label = f'<font name="{s.bold}">{_p(g["category"])}:</font> ' if g['category'] else ''
            body.append(Paragraph(label + _p(', '.join(g['items'])), s.body))
    elif key in ('certifications', 'languages'):
        for c in m[key]:
            meta = f' <font color="#6b7280">({_p(c["meta"])})</font>' if key == 'languages' and c['meta'] else (
                f'<font color="#6b7280">, {_p(c["meta"])}</font>' if c['meta'] else '')
            body.append(Paragraph(f'<font name="{s.bold}">{_p(c["title"])}</font>{meta}', s.body))
    elif key == 'references':
        cells = []
        for r in m['references']:
            lines = [f'<font name="{s.bold}">{_p(r["name"])}</font>']
            if r['role']:
                lines.append(_p(r['role']))
            lines += [_p(c) for c in r['contact']]
            cells.append(Paragraph('<br/>'.join(lines), s.small))
        rows = [cells[i:i + 2] + [''] * (2 - len(cells[i:i + 2])) for i in range(0, len(cells), 2)]
        t = Table(rows, colWidths=[width / 2] * 2)
        t.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12), ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
        ]))
        body = [t]
    body = [b if isinstance(b, list) else [b] for b in body]
    if not body:
        return []
    return [KeepTogether(head + body[0])] + [KeepTogether(b) if len(b) > 1 else b[0] for b in body[1:]]


def _section_aside(s, m, key, width):
    out = _heading(s, cv_model.SECTION_LABELS[key], width, aside=True)
    if key == 'skills':
        for g in m['skills']:
            if g['category']:
                out.append(Paragraph(_p(g['category']), s.a_bold))
            for item in g['items']:
                out.append(Paragraph(_p(item), s.a_body, bulletText='•'))
            out.append(Spacer(1, 4))
    else:
        for c in m[key]:
            out.append(Paragraph(_p(c['title']), s.a_bold))
            if c['meta']:
                out.append(Paragraph(_p(c['meta']), s.a_muted))
            out.append(Spacer(1, 3))
    return out


def _contact_line(s, m, style):
    return Paragraph('  ·  '.join(_p(i) for i in cv_model.contact_items(m)), style)


def _initials(name):
    parts = [p for p in name.split() if p]
    if not parts:
        return 'CV'
    return (parts[0][0] + (parts[-1][0] if len(parts) > 1 else '')).upper()


def build_cv_pdf(cv) -> io.BytesIO:
    """Build a PDF for a CV, following its template and design settings."""
    d = resolve_design(getattr(cv, 'template', 'classic'), getattr(cv, 'design', {}))
    m = cv_model.build(cv)
    layout = d['layout']
    dark_aside = d['id'] in ('professional', 'studio')
    s = Styles(d, dark_aside=dark_aside)
    visible = [k for k in d['section_order'] if k not in d['hidden'] and cv_model.has_content(m, k)]
    has_aside = layout in ('sidebar-left', 'sidebar-right', 'banner')
    aside_keys = [k for k in visible if k in cv_model.ASIDE_SECTIONS] if has_aside else []
    main_keys = [k for k in visible if k not in aside_keys]

    buffer = io.BytesIO()
    margin_x, margin_y = 40, 36
    aside_w = 177
    banner_h = 112 if layout == 'banner' else 0
    aside_left = layout == 'sidebar-left'

    if has_aside:
        main_x = aside_w + 26 if aside_left else margin_x
        main_w = PAGE_W - aside_w - 26 - margin_x
        aside_x = 0 if aside_left else PAGE_W - aside_w
    else:
        main_x, main_w = margin_x, PAGE_W - 2 * margin_x

    if dark_aside:
        aside_bg = s.accent
    elif d['id'] in ('metro', 'nova'):
        aside_bg = _mix(s.accent, 0.09)
    elif d['id'] == 'slate':
        aside_bg = colors.HexColor('#f3f4f6')
    else:
        aside_bg = None

    def paint(canvas, _doc, first):
        canvas.saveState()
        if has_aside:
            if aside_bg is not None:
                canvas.setFillColor(aside_bg)
                top = PAGE_H - (banner_h if first else 0)
                canvas.rect(aside_x, 0, aside_w, top, stroke=0, fill=1)
            elif d['id'] == 'modern':
                canvas.setStrokeColor(LINE)
                canvas.setLineWidth(0.75)
                canvas.line(aside_x, 0, aside_x, PAGE_H - (banner_h if first else 0))
        if first and banner_h:
            canvas.setFillColor(s.accent)
            canvas.rect(0, PAGE_H - banner_h, PAGE_W, banner_h, stroke=0, fill=1)
        canvas.restoreState()

    doc = BaseDocTemplate(buffer, pagesize=A4, leftMargin=0, rightMargin=0, topMargin=0, bottomMargin=0,
                          title=f'{m["name"]} CV', author=m['name'])
    story = []
    avatar_fg = s.on_accent if dark_aside or layout == 'banner' else s.accent
    avatar_bg = _mix(s.on_accent, 0.18, s.accent) if dark_aside or layout == 'banner' else _mix(s.accent, 0.16)
    photo = Avatar(
        96 if has_aside else 72, m['photo'], _initials(m['name']), avatar_bg, avatar_fg,
        square=d['id'] in ('corporate', 'slate', 'studio'),
        align='CENTER' if has_aside else 'RIGHT',
    ) if d['show_photo'] else None

    # Header block for the main column / single column
    def header_flowables(width):
        out = [Paragraph(_p(m['name']), s.name)]
        if m['headline']:
            out.append(Paragraph(_p(m['headline']), s.headline))
        if not has_aside or layout == 'banner':
            out.append(_contact_line(s, m, s.contact))
        if photo is not None and not has_aside:
            t = Table([[out, photo]], colWidths=[width - 84, 84])
            t.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            out = [t]
        if d['id'] in ('executive', 'timeline', 'bold', 'studio'):
            out.append(HRFlowable(width='100%', thickness=2.5 if d['id'] != 'timeline' else 0.8,
                                  color=s.accent if d['id'] == 'executive' else (LINE if d['id'] == 'timeline' else colors.HexColor('#111827')),
                                  spaceBefore=10, spaceAfter=2))
        elif d['id'] == 'elegant':
            out.append(HRFlowable(width=48, thickness=0.8, color=s.accent, spaceBefore=10, spaceAfter=2, hAlign='CENTER'))
        return out

    frames_first, frames_later = [], []
    if layout == 'banner':
        frames_first.append(Frame(margin_x, PAGE_H - banner_h, PAGE_W - 2 * margin_x, banner_h,
                                  leftPadding=0, rightPadding=0, topPadding=22, bottomPadding=10, id='banner'))
        name_cell = [Paragraph(_p(m['name']), s.b_name)]
        if m['headline']:
            name_cell.append(Paragraph(_p(m['headline']), s.b_headline))
        name_cell.append(_contact_line(s, m, s.b_contact))
        if photo is not None:
            photo.size = 72
            t = Table([[photo, name_cell]], colWidths=[90, PAGE_W - 2 * margin_x - 90])
            t.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
            story.append(t)
        else:
            story += name_cell
        story.append(FrameBreak())

    top_first = PAGE_H - banner_h
    if has_aside:
        frames_first.append(Frame(aside_x + 18, 0, aside_w - 36, top_first, leftPadding=0, rightPadding=0,
                                  topPadding=26 if banner_h else margin_y, bottomPadding=margin_y, id='aside'))
        frames_first.append(Frame(main_x, 0, main_w, top_first, leftPadding=0, rightPadding=0,
                                  topPadding=26 if banner_h else margin_y, bottomPadding=margin_y, id='main'))
        frames_later.append(Frame(main_x, 0, main_w, PAGE_H, leftPadding=0, rightPadding=0,
                                  topPadding=margin_y, bottomPadding=margin_y, id='main2'))
        # Side column content
        aside = []
        if photo is not None and layout != 'banner':
            aside.append(photo)
        if d['header'] == 'aside':
            aside.append(Paragraph(_p(m['name']), s.a_name))
            if m['headline']:
                aside.append(Paragraph(_p(m['headline'].upper()), s.a_headline))
        if layout != 'banner':
            aside += _heading(s, 'Contact', aside_w - 36, aside=True)
            aside += [Paragraph(_p(i), s.a_body) for i in cv_model.contact_items(m)]
        for k in aside_keys:
            aside += _section_aside(s, m, k, aside_w - 36)
        story += aside or [Spacer(1, 1)]
        story.append(FrameBreak())
        if d['header'] not in ('aside', 'banner'):
            story += header_flowables(main_w)
    else:
        frames_first.append(Frame(margin_x, 0, main_w, PAGE_H, leftPadding=0, rightPadding=0,
                                  topPadding=margin_y, bottomPadding=margin_y, id='main'))
        frames_later = [Frame(margin_x, 0, main_w, PAGE_H, leftPadding=0, rightPadding=0,
                              topPadding=margin_y, bottomPadding=margin_y, id='main2')]
        story += header_flowables(main_w)

    for k in main_keys:
        story += _section_main(s, m, k, main_w)

    doc.addPageTemplates([
        PageTemplate(id='first', frames=frames_first, onPage=lambda c, dd: paint(c, dd, True)),
        PageTemplate(id='later', frames=frames_later, onPage=lambda c, dd: paint(c, dd, False)),
    ])
    doc.build([NextPageTemplate('later')] + story)
    buffer.seek(0)
    return buffer


def _letter_parts(letter):
    body = (letter.body or '').strip()
    paragraphs = [p.strip() for p in body.replace('\r\n', '\n').split('\n\n') if p.strip()]
    low = body.lower()
    greeting = None if low.startswith(('dear', 'to whom', 'hello', 'hi ')) else \
        f'Dear {(letter.recipient_name or "").strip() or "Hiring Manager"},'
    tail = low[-160:]
    closing = None if any(w in tail for w in ('sincerely', 'regards', 'yours truly', 'yours faithfully', 'best wishes', 'respectfully')) \
        else 'Yours sincerely,'
    return paragraphs, greeting, closing


def build_letter_pdf(letter) -> io.BytesIO:
    """Build a PDF letter whose header and colours match the CV template of the same id."""
    d = resolve_design(getattr(letter, 'template', 'classic'), getattr(letter, 'design', {}))
    s = Styles(d)
    m = {
        'name': (letter.sender_name or '').strip() or 'Your Name',
        'email': (letter.sender_email or '').strip(), 'phone': (letter.sender_phone or '').strip(),
        'location': (getattr(letter, 'sender_location', '') or '').strip(), 'links': [],
    }
    headline = (getattr(letter, 'sender_headline', '') or '').strip()
    banner = d['layout'] == 'banner'
    sidebar = d['layout'] in ('sidebar-left', 'sidebar-right')
    dark = d['id'] in ('professional', 'studio')

    buffer = io.BytesIO()
    margin_x = 54
    banner_h = 100 if banner else 0

    def paint(canvas, _doc):
        canvas.saveState()
        if banner:
            canvas.setFillColor(s.accent)
            canvas.rect(0, PAGE_H - banner_h, PAGE_W, banner_h, stroke=0, fill=1)
        elif sidebar:
            canvas.setFillColor(s.accent if dark else _mix(s.accent, 0.09))
            x = 0 if d['layout'] == 'sidebar-left' else PAGE_W - 14
            canvas.rect(x, 0, 14, PAGE_H, stroke=0, fill=1)
        canvas.restoreState()

    doc = BaseDocTemplate(buffer, pagesize=A4, leftMargin=margin_x, rightMargin=margin_x,
                          topMargin=40, bottomMargin=48, title=f'{m["name"]} letter', author=m['name'])
    frame = Frame(margin_x, 48, PAGE_W - 2 * margin_x, PAGE_H - 48 - 40 - banner_h, id='body',
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    frames = [frame]
    story = []
    if banner:
        frames.insert(0, Frame(margin_x, PAGE_H - banner_h, PAGE_W - 2 * margin_x, banner_h, id='banner',
                               leftPadding=0, rightPadding=0, topPadding=24, bottomPadding=8))
        story.append(Paragraph(_p(m['name']), s.b_name))
        if headline:
            story.append(Paragraph(_p(headline), s.b_headline))
        story.append(_contact_line(s, m, s.b_contact))
        story.append(FrameBreak())
    else:
        story.append(Paragraph(_p(m['name']), s.name))
        if headline:
            story.append(Paragraph(_p(headline), s.headline))
        story.append(_contact_line(s, m, s.contact))
        rule_color = s.accent if d['accent_headings'] else colors.HexColor('#111827')
        story.append(HRFlowable(width='100%', thickness=1.2, color=rule_color, spaceBefore=12, spaceAfter=4))

    letter_style = ParagraphStyle('letter', parent=s.body, fontSize=10.5, leading=15.5)
    story.append(Spacer(1, 16))
    when = getattr(letter, 'updated_at', None) or date.today()
    story.append(Paragraph(f'{when.day} {when.strftime("%B %Y")}', ParagraphStyle('dt', parent=letter_style, textColor=INK_3)))
    to = [x for x in (letter.recipient_name, letter.recipient_title, letter.company) if (x or '').strip()]
    if to:
        story.append(Spacer(1, 12))
        story.append(Paragraph('<br/>'.join(_p(x) for x in to), letter_style))
    story.append(Spacer(1, 16))
    paragraphs, greeting, closing = _letter_parts(letter)
    if greeting:
        story += [Paragraph(_p(greeting), letter_style), Spacer(1, 8)]
    for p in paragraphs:
        story += [Paragraph(_p(p), letter_style), Spacer(1, 8)]
    if closing:
        story += [Spacer(1, 8), Paragraph(_p(closing), letter_style), Spacer(1, 22),
                  Paragraph(f'<font name="{s.bold}">{_p(m["name"])}</font>', letter_style)]

    doc.addPageTemplates([PageTemplate(id='page', frames=frames, onPage=paint)])
    doc.build(story)
    buffer.seek(0)
    return buffer


# Kept for backwards compatibility with any caller that formatted text itself.
def _format_experience(entries):
    lines = []
    for e in entries or []:
        head = (e.get('role') or '') + (f" at {e.get('company')}" if e.get('company') else '')
        dates = cv_model.date_range(e.get('start_date'), e.get('end_date'), e.get('current'))
        lines.append(head + (f' ({dates})' if dates else ''))
        lines += ['• ' + b for b in cv_model.split_lines(e.get('bullets'))]
    return '\n'.join(lines)

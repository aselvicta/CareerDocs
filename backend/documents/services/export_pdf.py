"""
Export CV or Letter to PDF using ReportLab.
"""
import io
from xml.sax.saxutils import escape
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib import colors


def _safe_para(text):
    """Escape XML and convert newlines to <br/> for ReportLab Paragraph."""
    if not text:
        return ''
    return escape(str(text)).replace('\n', '<br/>')


def _styles():
    styles = getSampleStyleSheet()
    # Use unique names to avoid "Style already defined" if stylesheet is reused/cached
    if 'DocTitle' not in styles.byName:
        styles.add(ParagraphStyle(
            name='DocTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=6,
            alignment=TA_CENTER,
        ))
    if 'DocSection' not in styles.byName:
        styles.add(ParagraphStyle(
            name='DocSection',
            parent=styles['Heading2'],
            fontSize=12,
            spaceBefore=12,
            spaceAfter=6,
        ))
    return styles


def _classic_styles():
    """
    Classic resume look: serif (Times), tight spacing, underlined headings.
    Uses built-in ReportLab Times fonts (no external TTF required).
    """
    base = getSampleStyleSheet()
    s = {}
    s['Title'] = ParagraphStyle(
        name='ClassicTitle',
        parent=base['Normal'],
        fontName='Times-Bold',
        fontSize=18,
        leading=21,
        alignment=TA_CENTER,
        spaceAfter=2,
    )
    s['Contact'] = ParagraphStyle(
        name='ClassicContact',
        parent=base['Normal'],
        fontName='Times-Roman',
        fontSize=9.5,
        leading=11,
        alignment=TA_CENTER,
        spaceAfter=8,
    )
    s['Section'] = ParagraphStyle(
        name='ClassicSection',
        parent=base['Normal'],
        fontName='Times-Bold',
        fontSize=11,
        leading=13,
        spaceBefore=8,
        spaceAfter=2,
    )
    s['Normal'] = ParagraphStyle(
        name='ClassicNormal',
        parent=base['Normal'],
        fontName='Times-Roman',
        fontSize=10,
        leading=12.5,
        spaceAfter=2,
    )
    s['NormalTight'] = ParagraphStyle(
        name='ClassicNormalTight',
        parent=s['Normal'],
        spaceAfter=1,
    )
    s['Small'] = ParagraphStyle(
        name='ClassicSmall',
        parent=s['Normal'],
        fontSize=9.5,
        leading=11.5,
    )
    s['RightSmall'] = ParagraphStyle(
        name='ClassicRightSmall',
        parent=s['Small'],
        alignment=TA_RIGHT,
    )
    return s


def _format_experience(entries):
    if not entries:
        return ''
    parts = []
    for e in entries:
        role = e.get('role') or ''
        company = e.get('company') or ''
        loc = e.get('location') or ''
        start = e.get('start_date') or ''
        end = e.get('end_date') or ''
        if e.get('current'):
            end = 'Present'
        line = f"{role}" + (f" at {company}" if company else "") + (f", {loc}" if loc else "")
        if start or end:
            line += f" ({start}–{end})"
        parts.append(line)
        bullets = (e.get('bullets') or '').strip()
        if bullets:
            for b in bullets.split('\n'):
                if b.strip():
                    parts.append('• ' + b.strip())
    return '\n'.join(parts)


def _format_education(entries):
    if not entries:
        return ''
    parts = []
    for e in entries:
        degree = e.get('degree') or ''
        inst = e.get('institution') or ''
        loc = e.get('location') or ''
        start = e.get('start_date') or ''
        end = e.get('end_date') or ''
        honors = (e.get('honors') or '').strip()
        line = degree + (f", {inst}" if inst else "") + (f", {loc}" if loc else "") + f" ({start}–{end})"
        parts.append(line)
        if honors:
            parts.append(honors)
    return '\n'.join(parts)


def _format_skills(entries):
    if not entries:
        return ''
    parts = []
    for s in entries:
        cat = (s.get('category') or '').strip()
        items = (s.get('items') or '').strip()
        if cat and items:
            parts.append(f"{cat}: {items}")
        elif items:
            parts.append(items)
    return '\n'.join(parts)


def _classic_section(story, s, title):
    story.append(Paragraph(_safe_para(str(title).upper()), s['Section']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black, spaceBefore=2, spaceAfter=6))


def _build_cv_pdf_classic(cv) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=0.8 * inch,
        leftMargin=0.8 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
    )
    story = []
    s = _classic_styles()

    # Header
    story.append(Paragraph(_safe_para(cv.full_name or 'Name'), s['Title']))
    contact = ' | '.join(filter(None, [str(cv.email or '').strip(), str(cv.phone or '').strip(), str(cv.location or '').strip()]))
    if contact:
        story.append(Paragraph(_safe_para(contact), s['Contact']))

    # Summary
    if cv.summary:
        _classic_section(story, s, 'Professional Summary')
        story.append(Paragraph(_safe_para(cv.summary), s['Normal']))

    # Experience
    exp_entries = cv.experience_structured or []
    exp_text = _format_experience(exp_entries) if exp_entries else (cv.experience or '')
    if exp_text:
        _classic_section(story, s, 'Work Experience')
        story.append(Paragraph(_safe_para(exp_text), s['Normal']))

    # Education (table-inspired when structured)
    edu_entries = cv.education_structured or []
    edu_text = _format_education(edu_entries) if edu_entries else (cv.education or '')
    if edu_text:
        _classic_section(story, s, 'Education')
        if edu_entries:
            rows = []
            for e in edu_entries:
                left = (e.get('degree') or '').strip()
                right_parts = [p for p in [(e.get('institution') or '').strip(), (e.get('location') or '').strip()] if p]
                dates = '–'.join([p for p in [(e.get('start_date') or '').strip(), (e.get('end_date') or '').strip()] if p])
                if dates:
                    right_parts.append(dates)
                right = ', '.join([p for p in right_parts if p])
                if left or right:
                    rows.append([Paragraph(_safe_para(left or ''), s['NormalTight']),
                                 Paragraph(_safe_para(right or ''), s['NormalTight'])])
            if rows:
                t = Table(rows, colWidths=[2.9 * inch, None])
                t.setStyle(TableStyle([
                    ('BOX', (0, 0), (-1, -1), 1, colors.black),
                    ('INNERGRID', (0, 0), (-1, -1), 0.75, colors.black),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ]))
                story.append(t)
                story.append(Spacer(1, 6))
        else:
            story.append(Paragraph(_safe_para(edu_text), s['Normal']))

    # Skills
    sk_entries = cv.skills_structured or []
    sk_text = _format_skills(sk_entries) if sk_entries else (cv.skills or '')
    if sk_text:
        _classic_section(story, s, 'Skills')
        story.append(Paragraph(_safe_para(sk_text), s['Normal']))

    # Certifications / Projects / Languages / Awards / References
    if cv.certifications:
        _classic_section(story, s, 'Certifications')
        cert_lines = []
        for c in cv.certifications:
            line = (c.get('name') or '') + (f" – {c.get('issuer', '')}" if c.get('issuer') else '') + (f" ({c.get('date', '')})" if c.get('date') else '')
            if line.strip():
                cert_lines.append(line)
        if cert_lines:
            story.append(Paragraph(_safe_para('\n'.join(cert_lines)), s['Normal']))

    if cv.projects:
        _classic_section(story, s, 'Projects')
        proj_lines = []
        for p in cv.projects:
            line = (p.get('name') or '') + (f" – {p.get('description', '')}" if p.get('description') else '')
            if p.get('tech'):
                line += f" [{p.get('tech')}]"
            if line.strip():
                proj_lines.append(line)
        if proj_lines:
            story.append(Paragraph(_safe_para('\n'.join(proj_lines)), s['Normal']))

    if cv.languages:
        _classic_section(story, s, 'Languages')
        lang_lines = [f"{l.get('language', '')} ({l.get('proficiency', '')})" for l in cv.languages if l.get('language')]
        if lang_lines:
            story.append(Paragraph(_safe_para(', '.join(lang_lines)), s['Normal']))

    if cv.awards:
        _classic_section(story, s, 'Awards')
        award_lines = [(a.get('name') or '') + (f" – {a.get('issuer', '')}" if a.get('issuer') else '') for a in cv.awards if a.get('name')]
        if award_lines:
            story.append(Paragraph(_safe_para('\n'.join(award_lines)), s['Normal']))

    if cv.references:
        _classic_section(story, s, 'Referee')
        ref_lines = []
        for r in cv.references:
            if not (r.get('name') or '').strip():
                continue
            bits = [r.get('name', '').strip()]
            title = (r.get('title') or '').strip()
            company = (r.get('company') or '').strip()
            if title and company:
                bits.append(f"{title} at {company}")
            elif title:
                bits.append(title)
            elif company:
                bits.append(company)
            email = (r.get('email') or '').strip()
            phone = (r.get('phone') or '').strip()
            contacts = ' | '.join([c for c in [email, phone] if c])
            if contacts:
                bits.append(contacts)
            ref_lines.append(' · '.join([b for b in bits if b]))
        if ref_lines:
            story.append(Paragraph(_safe_para('\n'.join(ref_lines)), s['Normal']))

    doc.build(story)
    buffer.seek(0)
    return buffer


def build_cv_pdf(cv) -> io.BytesIO:
    """Build PDF buffer for a CV model instance (template-aware)."""
    tpl = (getattr(cv, 'template', None) or 'classic').strip().lower()
    if tpl == 'classic':
        return _build_cv_pdf_classic(cv)

    # Fallback: keep existing simple export for other templates
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=inch, leftMargin=inch,
                            topMargin=inch, bottomMargin=inch)
    story = []
    s = _styles()

    story.append(Paragraph(_safe_para(cv.full_name or 'Name'), s['DocTitle']))
    contact = ' | '.join(filter(None, [str(cv.email or ''), str(cv.phone or ''), str(cv.location or '')]))
    if contact:
        story.append(Paragraph(_safe_para(contact), s['Normal']))
    story.append(Spacer(1, 12))

    if cv.summary:
        story.append(Paragraph('Summary', s['DocSection']))
        story.append(Paragraph(_safe_para(cv.summary), s['Normal']))
    exp_text = _format_experience(cv.experience_structured) if cv.experience_structured else (cv.experience or '')
    if exp_text:
        story.append(Paragraph('Experience', s['DocSection']))
        story.append(Paragraph(_safe_para(exp_text), s['Normal']))
    edu_text = _format_education(cv.education_structured) if cv.education_structured else (cv.education or '')
    if edu_text:
        story.append(Paragraph('Education', s['DocSection']))
        story.append(Paragraph(_safe_para(edu_text), s['Normal']))
    sk_text = _format_skills(cv.skills_structured) if cv.skills_structured else (cv.skills or '')
    if sk_text:
        story.append(Paragraph('Skills', s['DocSection']))
        story.append(Paragraph(_safe_para(sk_text), s['Normal']))
    if cv.certifications:
        story.append(Paragraph('Certifications', s['DocSection']))
        cert_lines = []
        for c in cv.certifications:
            line = (c.get('name') or '') + (f" – {c.get('issuer', '')}" if c.get('issuer') else '') + (f" ({c.get('date', '')})" if c.get('date') else '')
            if line.strip():
                cert_lines.append(line)
        story.append(Paragraph(_safe_para('\n'.join(cert_lines)), s['Normal']))
    if cv.projects:
        story.append(Paragraph('Projects', s['DocSection']))
        proj_lines = []
        for p in cv.projects:
            line = (p.get('name') or '') + (f" – {p.get('description', '')}" if p.get('description') else '')
            if p.get('tech'):
                line += f" [{p.get('tech')}]"
            if line.strip():
                proj_lines.append(line)
        story.append(Paragraph(_safe_para('\n'.join(proj_lines)), s['Normal']))
    if cv.languages:
        story.append(Paragraph('Languages', s['DocSection']))
        lang_lines = [f"{l.get('language', '')} ({l.get('proficiency', '')})" for l in cv.languages if l.get('language')]
        story.append(Paragraph(_safe_para(', '.join(lang_lines)), s['Normal']))
    if cv.awards:
        story.append(Paragraph('Awards', s['DocSection']))
        award_lines = [(a.get('name') or '') + (f" – {a.get('issuer', '')}" if a.get('issuer') else '') for a in cv.awards if a.get('name')]
        story.append(Paragraph(_safe_para('\n'.join(award_lines)), s['Normal']))
    if cv.references:
        story.append(Paragraph('References', s['DocSection']))
        ref_lines = [f"{r.get('name', '')}, {r.get('title', '')} at {r.get('company', '')}" for r in cv.references if r.get('name')]
        story.append(Paragraph(_safe_para('\n'.join(ref_lines)), s['Normal']))

    doc.build(story)
    buffer.seek(0)
    return buffer


def build_letter_pdf(letter) -> io.BytesIO:
    """Build PDF buffer for a Letter model instance."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=inch, leftMargin=inch,
                            topMargin=inch, bottomMargin=inch)
    story = []
    s = _styles()

    if letter.sender_name or letter.sender_email or letter.sender_phone:
        story.append(Paragraph(_safe_para(letter.sender_name or ''), s['Normal']))
        story.append(Paragraph(_safe_para(letter.sender_email or ''), s['Normal']))
        story.append(Paragraph(_safe_para(letter.sender_phone or ''), s['Normal']))
        story.append(Spacer(1, 12))

    story.append(Paragraph("To: " + _safe_para(letter.recipient_name or 'Recipient'), s['Normal']))
    if letter.recipient_title:
        story.append(Paragraph(_safe_para(letter.recipient_title), s['Normal']))
    if letter.company:
        story.append(Paragraph(_safe_para(letter.company), s['Normal']))
    story.append(Spacer(1, 12))

    story.append(Paragraph(_safe_para(letter.body), s['Normal']))
    story.append(Spacer(1, 12))
    story.append(Paragraph("Sincerely,<br/>" + _safe_para(letter.sender_name or 'Sender'), s['Normal']))

    doc.build(story)
    buffer.seek(0)
    return buffer

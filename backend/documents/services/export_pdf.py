"""
Export CV or Letter to PDF using ReportLab.
"""
import io
from xml.sax.saxutils import escape
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER


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


def build_cv_pdf(cv) -> io.BytesIO:
    """Build PDF buffer for a CV model instance."""
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

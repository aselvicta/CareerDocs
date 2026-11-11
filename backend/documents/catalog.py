"""
Single source of truth (backend side) for CV / letter templates.

The frontend has a richer registry (frontend/src/cv/templates.js) with descriptions
and sample previews; ids here must stay in sync with it.

`layout` and the style fields drive the server-side PDF / Word exports
(services/export_pdf.py, services/export_docx.py). The pixel-exact export is the
browser print view in the frontend; server exports are used for email attachments
and the Word download, so they follow the same structure and colours but not every
decorative detail.
"""

TEMPLATES = [
    # id,           label,          category,       layout,          font,    header
    ('classic',      'Classic',      'ats',          'single',        'serif', 'center'),
    ('harvard',      'Harvard',      'ats',          'single',        'serif', 'center'),
    ('ats',          'Clean ATS',    'ats',          'single',        'sans',  'left'),
    ('minimal',      'Minimal',      'simple',       'single',        'sans',  'left'),
    ('elegant',      'Elegant',      'simple',       'single',        'serif', 'center'),
    ('professional', 'Professional', 'professional', 'sidebar-left',  'sans',  'sidebar'),
    ('executive',    'Executive',    'professional', 'single',        'serif', 'left'),
    ('corporate',    'Corporate',    'professional', 'single',        'sans',  'left'),
    ('timeline',     'Timeline',     'professional', 'single',        'sans',  'left'),
    ('modern',       'Modern',       'modern',       'banner',        'sans',  'banner'),
    ('nova',         'Nova',         'modern',       'sidebar-right', 'sans',  'left'),
    ('slate',        'Slate',        'modern',       'banner',        'sans',  'banner'),
    ('metro',        'Metro',        'modern',       'sidebar-left',  'sans',  'sidebar'),
    ('studio',       'Studio',       'creative',     'sidebar-left',  'sans',  'sidebar'),
    ('bold',         'Bold',         'creative',     'single',        'sans',  'left'),
    ('mono',         'Mono',         'creative',     'single',        'mono',  'left'),
]

TEMPLATE_IDS = [t[0] for t in TEMPLATES]
TEMPLATE_CHOICES = [(t[0], t[1]) for t in TEMPLATES]
TEMPLATE_META = {
    t[0]: {'label': t[1], 'category': t[2], 'layout': t[3], 'font': t[4], 'header': t[5]}
    for t in TEMPLATES
}

# Default accent per template (hex, no gradients). Users can override via design.accent.
DEFAULT_ACCENTS = {
    'classic': '#111827', 'harvard': '#111827', 'ats': '#1f2937', 'minimal': '#111827',
    'elegant': '#7c5c3b', 'professional': '#0f4c45', 'executive': '#1e3a5f',
    'corporate': '#1d4ed8', 'timeline': '#0f766e', 'modern': '#1e3a5f', 'nova': '#be123c',
    'slate': '#334155', 'metro': '#2563eb', 'studio': '#3f5e66', 'bold': '#111827',
    'mono': '#166534',
}

# Templates with a photo / initials slot, and their section title treatment.
PHOTO_TEMPLATES = {'professional', 'corporate', 'timeline', 'modern', 'slate', 'metro', 'studio'}
PLAIN_HEADING_TEMPLATES = {'classic', 'harvard', 'ats', 'minimal', 'studio', 'bold'}
RULED_HEADING_TEMPLATES = {'classic', 'harvard', 'ats', 'professional', 'corporate', 'studio', 'elegant'}
DEFAULT_ORDERS = {'harvard': ['education', 'experience', 'projects', 'skills']}

FONTS = ('sans', 'serif', 'classic', 'mono')
DENSITIES = ('compact', 'normal', 'airy')
SECTION_KEYS = (
    'summary', 'experience', 'education', 'skills', 'projects',
    'certifications', 'languages', 'awards', 'references',
)


def meta_for(template_id):
    return TEMPLATE_META.get((template_id or '').strip().lower(), TEMPLATE_META['classic'])


def resolve_design(template_id, design):
    """Merge a stored design dict with template defaults (used by the exporters)."""
    tid = (template_id or 'classic').strip().lower()
    meta = meta_for(tid)
    d = design if isinstance(design, dict) else {}
    order = [k for k in (d.get('section_order') or []) if k in SECTION_KEYS]
    if not order:
        order = ['summary'] + [k for k in DEFAULT_ORDERS.get(tid, []) if k != 'summary']
    order += [k for k in SECTION_KEYS if k not in order]
    return {
        'accent': d.get('accent') or DEFAULT_ACCENTS.get(tid, '#111827'),
        'font': d.get('font') if d.get('font') in FONTS else meta['font'],
        'density': d.get('density') if d.get('density') in DENSITIES else 'normal',
        'section_order': order,
        'hidden': [k for k in (d.get('hidden') or []) if k in SECTION_KEYS],
        'show_photo': tid in PHOTO_TEMPLATES and d.get('show_photo') is not False,
        'accent_headings': tid not in PLAIN_HEADING_TEMPLATES,
        'ruled_headings': tid in RULED_HEADING_TEMPLATES,
        'id': tid if tid in TEMPLATE_META else 'classic',
        **meta,
    }

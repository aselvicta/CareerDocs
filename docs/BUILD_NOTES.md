# CareerDocs build notes

A running log of product and engineering decisions, newest first. Add to it as we build.

## 2026-11-11: Template system, editor and exports

### What shipped
- **16 CV templates in 5 categories**: ATS friendly (Classic, Harvard, Clean ATS), Simple (Minimal,
  Elegant), Professional (Professional, Executive, Corporate, Timeline), Modern (Modern, Nova,
  Slate, Metro), Creative (Studio, Bold, Mono).
- **Matching cover letters**: every letter can use any template id, so a letter can match its CV
  ("Write a matching cover letter" on the CV page pre-fills the template, colour and sender details).
- **Design controls per document**: accent colour (12 presets plus a custom picker), font (Sans,
  Serif, Times, Mono), spacing (Compact, Normal, Spacious), photo on or off, section order and
  hidden sections.
- **Split-screen editor** (`/cv/new`, `/cv/:id/edit`, letters too): Content, Design and Job match
  tabs on the left, live A4 preview on the right with page-break markers. On phones a floating
  button switches between Edit and Preview. Ctrl/Cmd+S saves, and you get a warning before leaving
  with unsaved changes.
- **Galleries**: `/cv/templates`, `/letters/templates`, and a public `/templates` linked from the
  landing page. Filter by category and preview every template in any colour.
- **Photo upload**: centre-cropped and compressed in the browser to a ~30 KB JPEG data URL, stored
  on the CV row (free Render has no persistent disk). List endpoints never load it.
- **Fixed a production bug**: Word export for CVs crashed with `No module named
  'documents.services.services'` (bad relative import).

### Architecture
- `frontend/src/cv/templates.js` is the template registry: flags for layout (`aside`, `header`,
  `heading`, `dates`, `skills`, `photo`). `backend/documents/catalog.py` mirrors the ids, and the
  **two must stay in sync**.
- `CVDocument` / `LetterDocument` render a document at 794px wide (A4 at 96 dpi). The same markup is
  used for gallery thumbnails, the editor preview, the detail page, public share links and printing.
- `ScaledDoc` scales the 794px page to its container with a CSS transform (ResizeObserver).
- Template looks live in `cvdoc.css`: shared base rules, then `.cvt-<id>` overrides. Flat colours
  only, with tints from `color-mix()`. Text colour on the accent is computed (`onColor`) so custom
  light colours stay readable.
- **PDF strategy**:
  - *Download PDF* opens `/print/cv/:id` (or `/print/letter/:id`, `/view/cv/:token/print`) and
    triggers the browser print dialog. Choosing "Save as PDF" gives a vector PDF with selectable,
    ATS-readable text that matches the preview exactly. The tab title becomes the file name.
  - Print CSS: `@page { size: A4; margin: 0 }`. `box-decoration-break: clone` repeats padding on
    continuation pages. The print view stretches the page to whole A4 sheets so sidebars reach the
    bottom.
  - Server PDFs (ReportLab, `services/export_pdf.py`) are still used for email attachments and
    `/api/.../export/pdf/`. They follow the same layout family (single, sidebar, banner), accent,
    font, photo and section order, built from `services/cv_model.py` (the mirror of
    `frontend/src/cv/model.js`).
  - Gotcha: never nest `KeepTogether` in ReportLab. It forces a page break after every section.
  - Word export (`services/export_docx.py`) is always a clean single column (editable, ATS safe)
    with the accent colour, font, ruled headings and right-aligned dates on tab stops.
- `design` JSON is whitelisted server side (`serializers.clean_design`): accent hex, font, density,
  show_photo, section_order, hidden. Unknown keys are dropped. Photos must be JPEG, PNG or WebP data
  URLs under ~300 KB. SVG is rejected.
- Revisions snapshot template, design, headline and links, but **not the photo** (to keep rows
  small), so restoring a version keeps the current photo.

### UI principles (from feedback)
- No gradients, no decorative icon clutter, nothing that looks "vibe coded". Use flat colour, real
  content and real product previews.
- No em dashes in copy or generated text. En dashes are fine inside date ranges.
- Galleries show the real renderer with realistic sample content (Sarah Kamau, Nairobi data
  analyst), never placeholder lines.

### Ideas / next
- Import an existing CV (PDF or Word upload, AI parse into structured fields).
- Drag-and-drop section and entry reordering (up/down buttons for now).
- Per-section custom titles (e.g. "Work history" instead of "Experience").
- Server-side pixel-exact PDF (headless Chromium) if we move off free Render, so email attachments
  match the print view exactly.
- Thumbnails of the user's own CVs on the CV list (needs a light preview payload).
- More letter types with their own structure (resignation date, notice period fields).

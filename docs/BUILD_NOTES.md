# CareerDocs build notes

A running log of product and engineering decisions, newest first. Add to it as we build.

## 2026-11-12: "Open in Gmail" while Connect Gmail waits for Google verification

- Connecting Gmail needs Google to verify the `gmail.send` scope (domain, privacy policy, demo
  video), and in Testing mode refresh tokens expire after 7 days. Until there is a domain, the
  feature is **off**: `GMAIL_SEND_ENABLED=false` (default). With it off, `/api/gmail/accounts/`
  reports `available: false`, connect is refused, and the From picker and Settings > Email sending
  are hidden. Turn it on with `GMAIL_SEND_ENABLED=true` on Render once Google approves the app.
- The composer's main action is now **Open in Gmail**: a new tab with Gmail's compose window
  (`mail.google.com/mail/?view=cm&fs=1&to=&su=&body=`), with To, Subject and Body filled in. URLs
  cannot carry attachments, so the selected CV and letter PDFs download at the same time and a note
  says to attach them with the paperclip. Body is capped at 6000 characters to keep the URL safe.
- When the email is for a job, **Mark as sent** (`POST /api/applications/<id>/mark-sent/`) records
  it on the application and moves Saved to Applied. It is a button, not automatic, because we cannot
  see whether the user pressed Send in Gmail.
- `Application.email_sent_via`: `careerdocs` (our SMTP), `gmail_api` (connected Gmail) or
  `gmail_compose` (Open in Gmail). The application page shows "Your Gmail" for the last one.
- **Send from CareerDocs** stays as the secondary button (PDFs attached, Reply-To the user).
- Gotcha: `window.open(url, '_blank', 'noopener')` always returns null, so a blocked pop-up cannot be
  detected. Open without the feature, then set `win.opener = null`.

## 2026-11-12: Send from your own Gmail (Phase 1, behind GMAIL_SEND_ENABLED)

### What shipped
- **Settings > Email sending**: connect one or more Gmail addresses (up to 5), see last used,
  reconnect when Google revokes access, disconnect (also revokes the token at Google).
- **Composer**: a *From* picker (connected Gmail addresses, or CareerDocs) and a *For job* picker.
  Choosing a job fills the subject ("Application for X at Y") and attaches that job's CV and letter.
  Deep links: `/compose?application=ID`, `?cv=ID`, `?letter=ID`. The last used sender is remembered.
- **Application page**: "Email application" button, and a *Sent email* card (subject, to, from,
  date) with "Open conversation in Gmail". Sending moves a Saved job to Applied.
- CV and letter pages' "Send by email" now open the composer with the PDF attached. The old
  download-then-mailto modal (`SendEmailModal.jsx`) is gone.
- Without Gmail, emails still go from the CareerDocs address, now with **Reply-To set to the user**
  (profile email, else account email) so replies reach them.

### How it works
- `documents/gmail.py`. Scope is `gmail.send` only (Google "sensitive", not "restricted"):
  CareerDocs can send but cannot read mail.
- Connect reuses the sign-in redirect URI. `POST /api/gmail/connect/` returns a consent URL whose
  `state` is `gm.` + a signed payload (user id, 15 minute expiry). `google_oauth_callback` hands
  `gm.` states to `gmail.connect_callback`, so there is no second redirect URI to register.
- `access_type=offline` + `prompt=consent` so Google always returns a refresh token. Only the
  refresh token is stored, Fernet-encrypted (`GmailAccount.refresh_token`). Key: `GMAIL_TOKEN_KEY`
  env, else derived from `SECRET_KEY` (rotating SECRET_KEY then means users reconnect).
- Each send swaps the refresh token for an access token and posts the raw RFC 822 message to
  `upload/gmail/v1/users/me/messages/send` (attachments up to Gmail's 25 MB). The message and
  thread ids are saved on the `Application` (`gmail_thread_id` is what Phase 2 needs).
- `invalid_grant` (revoked, password change, 6 months unused) marks the account `needs_reconnect`;
  the API answers 409 with `reconnect: true`.
- API: `GET /api/gmail/accounts/`, `POST /api/gmail/connect/`, `DELETE /api/gmail/accounts/<id>/`.
  `compose-email/`, `cvs/<id>/send-email/` and `letters/<id>/send-email/` accept `from_account`
  and `application`. Tests: `documents/test_gmail.py`.

### Google Cloud setup (needed before it works in production)
1. APIs and services > Library: enable **Gmail API** in the project that owns the sign-in client.
2. OAuth consent screen > Data access: add scope `https://www.googleapis.com/auth/gmail.send`.
3. While the app is in **Testing**, only listed test users (max 100) can connect Gmail. To open it
   to everyone, submit for verification (sensitive scope: privacy policy, demo video, a few weeks;
   no paid security assessment for send only).
4. Optional: set `GMAIL_TOKEN_KEY` on Render (generate with
   `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`).

### Phase 2 (not built)
Show replies on the application with a stop-tracking switch. Needs `gmail.readonly`, a Google
"restricted" scope: verification plus a yearly third-party security assessment for public use,
or test mode for up to 100 users.

## 2026-11-11: App shell polish and new landing hero

- **Landing hero** shows our own two column CV: "Brian Otieno", Customer Success Lead in Nairobi,
  fictional employers (Pesaflow Payments, Savanna Home Stores, Kilele Telecom), navy sidebar with
  amber accents on an amber block, plus the ATS keyword match card. The headshot is cropped from our
  own `landing-students-736.jpg` (no third party photos or sample content). Built in HTML (`HeroCV`
  in `Landing.jsx`) so text stays crisp.
- Beside it, a brand mark pattern (dots, plus signs, amber squares; `HeroPattern`) and the layers
  move a few pixels with the cursor (`useHeroParallax` sets `--mx`/`--my`). Off on touch devices
  and for reduced motion.
- **Collapsible sidebar**: the app sidebar folds to a 68px icon rail (button next to the logo, or
  Ctrl/Cmd+\\). It folds automatically in the CV and letter editors so the split screen gets the
  room, unless the user has made an explicit choice (stored in `localStorage['sh-rail']`). The
  width is driven by `--sh-side` via a `sh-rail` class on `<html>`.
- Applications board columns shrink to fit (all five stages visible at 1440px).
- Dashboard links read "Open CVs" instead of "All 1 CVs".

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

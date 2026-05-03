
# Career Docs Generator

Career Docs Generator is a full-stack web application that empowers users to create, enhance, and manage professional documents—such as CVs and various types of letters—using AI assistance. The platform streamlines the process of building high-quality documents, improving their content with AI (DeepSeek), and exporting them as PDF or Word files.

## Key Features

- **CV Builder:** Structured forms for CV creation, multiple professional templates (Classic, Modern, Minimal, Professional), and AI-powered suggestions for summaries, experience, and skills.
- **Letter Generator:** Templates for cover letters, job/internship applications, recommendations, and resignations, with AI-generated content and suggestions.
- **AI Assistance:** DeepSeek integration to enhance wording, suggest alternatives, and generate letter bodies contextually.
- **Export Options:** Download documents as PDF (via ReportLab) or Word (.docx via python-docx).
- **Authentication:** Secure registration and login with token-based authentication.
- **Modern UI:** React frontend (Vite) for a responsive, user-friendly experience; Django backend for robust API and optional server-rendered pages.

## Architecture Overview

- **Frontend:** React (Vite), communicates with backend via REST API, handles authentication, document editing, AI features, and export.
- **Backend:** Django REST Framework, manages users, documents, AI services, and export logic.
- **AI & Export Services:** Modular Python services for AI (DeepSeek), PDF, and Word export.

## Setup Instructions

### 1. Backend (Django)

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

Create a `.env` file in `backend/` (or set the environment variable `docs_generator_api_key`):

```
docs_generator_api_key=your_deepseek_api_key
```

Then run:

```bash
python manage.py migrate
python manage.py runserver
```

Backend runs at **http://127.0.0.1:8000/**.

### 2. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173/**. It proxies `/api` to the Django backend, so use the React app at 5173 for the full experience (login, dashboard, CVs, letters, AI, export).

### 3. Using the App

- Open **http://localhost:5173/** and register or log in (email + password). Token auth is used for the API.
- From the dashboard, you can create and edit CVs and letters, use “Enhance with AI” / “Generate with AI” / “Suggest alternatives”, and export as PDF or Word.
- You can also use the Django-only UI at **http://127.0.0.1:8000/** (login/register there, then dashboard and documents).

## Project Structure

- **frontend/** — React (Vite), `src/api.js` (API client with token), `src/pages/` (Dashboard, CV/Letter list, form, detail)
- **backend/docs_generator/** — Django project settings, URLs, CORS, REST framework
- **backend/accounts/** — User model (email as username)
- **backend/documents/** — CV & Letter models, REST API (`api_views.py`, `api_urls.py`), serializers, AI and export services
- **backend/documents/services/** — `deepseek.py` (AI), `export_pdf.py` (ReportLab), `export_docx.py` (python-docx)

## API Endpoints (for React)

- **Auth:**
	- `POST /api/auth/register/` — Register a new user
	- `POST /api/auth/login/` — Login (returns `user` + `token`)
	- `POST /api/auth/logout/` — Logout
	- `GET /api/auth/me/` — Get current user info (send `Authorization: Token <key>`)
- **CVs:**
	- `GET/POST /api/cvs/` — List or create CVs
	- `GET/PUT/PATCH/DELETE /api/cvs/:id/` — Retrieve, update, or delete a CV
	- `GET /api/cvs/:id/export/pdf/` — Export CV as PDF
	- `GET /api/cvs/:id/export/docx/` — Export CV as Word
- **Letters:** Same pattern under `/api/letters/`
- **AI:**
	- `POST /api/ai/enhance/` — Enhance text with AI
	- `POST /api/ai/suggest-alternatives/` — Suggest alternative phrasings
	- `POST /api/ai/generate-letter-body/` — Generate letter body from context

---

## Deploy (Vercel + Render)

### Backend (Render)

1. Create a **PostgreSQL** instance on Render and copy its **Internal/External Database URL**.
2. **New Web Service** from this repo; set **Root Directory** to `backend`.
3. **Build command:** `bash build.sh` (`pip install`, `collectstatic` only — **not** migrations).
4. **Start command:** `bash start.sh` — runs `migrate` against **PostgreSQL** (when `DATABASE_URL` is set), then **Gunicorn**.  
   Alternative one-liner: `python manage.py migrate --noinput && gunicorn docs_generator.wsgi:application --bind 0.0.0.0:$PORT`  
   First deploy showed `relation \"accounts_user\" does not exist` because migrations ran on SQLite during build, not Postgres. Use startup migrations.
5. **Environment variables** (minimum):

| Variable | Example |
|----------|---------|
| `SECRET_KEY` | Long random string |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `your-service.onrender.com` (comma-separated if multiple). Render also exposes **`RENDER_EXTERNAL_HOSTNAME`** — settings merge this automatically so the bare backend URL does not return “Bad Request (400)” from **`DisallowedHost`**. |
| `DATABASE_URL` | From Render Postgres |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `CORS_ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | `https://your-app.vercel.app` |
| `docs_generator_api_key` | Your DeepSeek key |

**Google OAuth (split frontend/backend):** set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI=https://your-service.onrender.com/api/auth/google/callback`. Register that same URI in Google Cloud Console.

### Frontend (Vercel)

1. **Import** the GitHub repo; **Root Directory** `frontend`.
2. **Build:** `npm run build` · **Output:** `dist`
3. Add **`VITE_API_BASE_URL`** = `https://your-service.onrender.com` (no trailing slash). Redeploy after changing env vars.

Local dev still uses the Vite proxy; leave `VITE_API_BASE_URL` unset locally.

**Production issues:** Console **404** on `/vite.svg`, `/api/...`, or `register`: ensure `VITE_API_BASE_URL` is set **before build** on Vercel and trigger a redeploy—blank env means browsers call `/api` on `*.vercel.app`, which does not exist. **400** on `POST …/register/` usually means validation (e.g. **email already registered**); read the toast or Network response JSON (`error` field).

---

**Career Docs Generator** streamlines the process of creating professional documents, making it easy for users to produce polished, AI-enhanced CVs and letters for their career needs.


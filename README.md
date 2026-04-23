# AIP CV Enhancer

A rebuild of the old CV tool with the AIP dark theme (same style as AIP DeskTime, AIP Password Manager, AIP QR Manager). Uploads a CV, parses it with OpenAI, edits it in a wizard with live preview, scores it against an ATS, matches it against a job description, generates cover letters, and exports DOCX/PDF.

## What's new vs the old `cv2-dark` app

**Architecture**
- Flask is now a **stateless JSON API**. No sessions, no HTML templates, no disk-backed state.
- React + Vite + Tailwind frontend matching the DeskTime design system (slate-950/900, blue-400 accents, lucide-react icons).
- All CV state lives in **localStorage** — saved CVs, ATS results, JD matches, cover letters.

**New features**
- **Multi-CV dashboard** with duplicate/delete/rename and last-updated timestamps.
- **Live preview pane** next to the editor (HTML render of the canonical CV JSON).
- **Wizard editor** — Personal → Summary → Experience → Education → Skills → Certs → Projects → ATS.
- **Autosave** (debounced 400ms) — "Saved" badge in the header.
- **Per-bullet AI rewrite**: stronger / quantified / concise / softer.
- **Job-description matcher**: match score gauge, matched/missing keywords, tailoring tips.
- **One-click tailor**: creates a duplicate CV rewritten against the JD (no fabrication).
- **Cover letter generator** with tone options (professional / enthusiastic / concise / warm).
- **PDF export** in addition to DOCX.
- **DOCX built from JSON** programmatically — no fragile `{{placeholder}}` Word templates.

**Fixed**
- Hardcoded secret removed, Flask/Werkzeug/Pillow bumped to current versions.
- `/debug_session` / `/debug_openai` removed.
- Three overlapping edit flows consolidated to one.
- No more 4KB session-cookie abuse (state is client-side).

## Layout

```
AIP CV Enhancer/
├── backend/                   # Flask JSON API
│   ├── app.py
│   ├── wsgi.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── resume_templates/      # (reserved for future DOCX templates)
│   └── services/
│       ├── parser.py          # PDF/DOCX → text (+OCR fallback)
│       ├── ai.py              # OpenAI wrappers
│       ├── docx_builder.py    # JSON → DOCX bytes
│       └── pdf_builder.py     # DOCX → PDF (LibreOffice or pandoc)
├── frontend/                  # Vite + React + Tailwind
│   └── src/
│       ├── components/
│       │   ├── Layout.jsx
│       │   └── CvPreview.jsx
│       ├── lib/
│       │   ├── api.js
│       │   └── storage.js
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Upload.jsx
│       │   ├── Editor.jsx
│       │   ├── JDMatch.jsx
│       │   ├── CoverLetter.jsx
│       │   └── Export.jsx
│       └── App.jsx
└── render.yaml
```

## Running locally

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then edit OPENAI_API_KEY
python app.py                   # http://localhost:5000
```

PDF export requires either `libreoffice` (`soffice`) on PATH, or `pandoc + pdflatex`. If neither is installed, DOCX still works and PDF will return a clear error.

OCR for scanned PDFs needs `tesseract` + `poppler` on PATH. If missing, text-layer PDFs still parse.

### Frontend
```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Vite proxies `/api/*` to `http://localhost:5000` during dev. In production set `VITE_API_BASE` to the backend URL.

## API

All JSON. Stateless. 15 MB upload limit.

| Method | Path                  | Purpose                                   |
|--------|-----------------------|-------------------------------------------|
| GET    | `/api/health`         | Ping + current OpenAI model name          |
| POST   | `/api/parse`          | Multipart PDF/DOCX → canonical CV JSON    |
| POST   | `/api/ats-score`      | CV JSON → ATS score + suggestions         |
| POST   | `/api/jd-match`       | CV + JD → keyword gap analysis            |
| POST   | `/api/tailor`         | CV + JD → tailored CV JSON                |
| POST   | `/api/rewrite-bullet` | bullet + style → rewritten bullet         |
| POST   | `/api/cover-letter`   | CV + JD + tone → cover letter text        |
| POST   | `/api/export/docx`    | CV + template → DOCX download             |
| POST   | `/api/export/pdf`     | CV + template → PDF download              |

## Canonical CV JSON

```json
{
  "full_name": "", "headline": "", "email": "", "phone": "", "location": "",
  "linkedin": "", "website": "", "summary": "",
  "experience": [ { "title", "company", "location", "start", "end", "bullets": [] } ],
  "education":  [ { "degree", "school", "location", "start", "end", "details" } ],
  "skills": { "technical": [], "soft": [], "languages": [], "tools": [] },
  "certifications": [ { "name", "issuer", "year" } ],
  "projects": [ { "name", "description", "link" } ]
}
```

## Deploy

`render.yaml` provisions a Python web service for the API and a static site for the frontend. Set `OPENAI_API_KEY` on the API, set `VITE_API_BASE` on the frontend to the API URL, and set `FRONTEND_ORIGIN` on the API to the frontend URL for CORS.

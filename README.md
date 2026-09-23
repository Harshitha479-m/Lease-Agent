# LeaseLens

LeaseLens is a document and lease abstraction workspace built with React, FastAPI, PostgreSQL, ChromaDB, and optional OpenAI-powered RAG. It extracts only information supported by uploaded lease PDFs. Missing fields remain `Not found in document`.

## What is included

- PDF upload with text extraction and optional scanned-PDF OCR (install Poppler and Tesseract for OCR deployments).
- Lease fields for tenant, property, address, dates, rent, renewal terms, notice, escalation, maintenance, and compliance.
- SQLite persistence for local development, with PostgreSQL available by setting `DATABASE_URL`.
- ChromaDB document collection with lease-scoped retrieval.
- Grounded Q&A with `temperature=0`; without `OPENAI_API_KEY`, the API returns matching source lines or an honest no-answer message.
- Search, expiring-soon filtering, lease details, source-aware alerts, and responsive dashboard.

## Run locally on Windows

The default setup uses SQLite and local ChromaDB storage, so it does not require Docker or PostgreSQL.

First-time setup:

```powershell
Copy-Item backend\.env.example backend\.env
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..\frontend
npm.cmd install
```

Start the backend in one terminal:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Start the frontend in another terminal:

```powershell
cd frontend
npm.cmd run dev
```

Open http://localhost:5173. FastAPI docs are at http://localhost:8000/docs. A `start-local.ps1` helper is also included for launching both processes from the repository root.

To use a locally installed PostgreSQL server, set `DATABASE_URL` in `backend/.env`. If it is omitted, `data/lease_agent.db` is created automatically. Set `VITE_API_URL` when the API is not at `http://localhost:8000/api`.

## OCR notes

Text-based PDFs work with the included `pypdf` path. Scanned PDFs require Poppler plus Tesseract installed on Windows and `OCR_ENABLED=true`. Install both tools separately, then ensure `pdftoppm` and `tesseract` are available on `PATH`. The extraction service deliberately returns empty fields when OCR dependencies are unavailable instead of inventing lease facts.

## API surface

- `GET /api/health`
- `GET /api/dashboard/stats`
- `GET /api/leases?search=&status=expiring`
- `GET /api/leases/{id}`
- `POST /api/leases/upload` with multipart `file`
- `POST /api/leases/{id}/ask` with `{ "question": "..." }`

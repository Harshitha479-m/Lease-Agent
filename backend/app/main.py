from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .config import get_settings
from .db import Base, engine, get_db
from .models import Lease
from .schemas import DashboardStats, LeaseDetail, LeaseSummary, QuestionRequest, QuestionResponse
from .services.extraction import process_pdf
from .services.rag import rag

settings = get_settings()
Base.metadata.create_all(bind=engine)
app = FastAPI(title="LeaseLens API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


def lease_or_404(db: Session, lease_id: int) -> Lease:
    lease = db.get(Lease, lease_id)
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    return lease


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "leaselens-api"}


@app.get("/api/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(db: Annotated[Session, Depends(get_db)]) -> DashboardStats:
    today = date.today()
    soon = today + timedelta(days=90)
    total = db.scalar(select(func.count(Lease.id))) or 0
    expiring = db.scalar(select(func.count(Lease.id)).where(Lease.lease_end >= today, Lease.lease_end <= soon)) or 0
    renewal = db.scalar(select(func.count(Lease.id)).where(Lease.renewal_terms.is_not(None))) or 0
    month_start = today.replace(day=1)
    processed = db.scalar(select(func.count(Lease.id)).where(Lease.created_at >= datetime.combine(month_start, datetime.min.time()))) or 0
    return DashboardStats(total_leases=total, expiring_soon=expiring, renewal_watch=renewal, processed_this_month=processed)


@app.get("/api/leases", response_model=list[LeaseSummary])
def list_leases(db: Annotated[Session, Depends(get_db)], search: str | None = None, status: str | None = None, sort: str = Query("lease_end")):
    query = select(Lease)
    if search:
        term = f"%{search}%"
        query = query.where(or_(Lease.file_name.ilike(term), Lease.tenant_name.ilike(term), Lease.property_name.ilike(term)))
    if status == "expiring":
        query = query.where(Lease.lease_end <= date.today() + timedelta(days=90), Lease.lease_end >= date.today())
    if sort == "tenant":
        query = query.order_by(Lease.tenant_name)
    else:
        query = query.order_by(Lease.lease_end.is_(None), Lease.lease_end)
    return list(db.scalars(query).all())


@app.get("/api/leases/{lease_id}", response_model=LeaseDetail)
def get_lease(lease_id: int, db: Annotated[Session, Depends(get_db)]) -> Lease:
    return lease_or_404(db, lease_id)


@app.post("/api/leases/upload", response_model=LeaseDetail, status_code=201)
async def upload_lease(file: Annotated[UploadFile, File(...)], db: Annotated[Session, Depends(get_db)]) -> Lease:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF lease document")
    safe_name = Path(file.filename).name
    destination = Path(settings.upload_dir) / f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{safe_name}"
    destination.write_bytes(await file.read())
    try:
        text, fields = process_pdf(str(destination))
    except Exception as error:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"Could not process PDF: {error}") from error
    lease = Lease(file_name=safe_name, file_path=str(destination), extracted_text=text, **fields)
    db.add(lease)
    db.commit()
    db.refresh(lease)
    rag.add_document(lease.id, text)
    return lease


@app.post("/api/leases/{lease_id}/ask", response_model=QuestionResponse)
def ask_lease(lease_id: int, request: QuestionRequest, db: Annotated[Session, Depends(get_db)]) -> QuestionResponse:
    lease = lease_or_404(db, lease_id)
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    answer, sources = rag.answer(lease.id, request.question, lease.extracted_text)
    return QuestionResponse(answer=answer, sources=sources)

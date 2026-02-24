import json
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from src.config import settings
from src.database import get_db, init_db, SessionLocal
from src.models import Report, ProcessingJob
from src.schemas import (
    UploadResponse,
    JobStatus,
    AnalyzeRequest,
    AnalysisData,
    ChatRequest,
    ChatResponse,
)
from src.pipeline.ingest import ingest_pdf
from src.pipeline.orchestrator import run_pipeline
from src.chat import handle_chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Earthwise Backend",
    description="Geotech PDF ingestion and parsing pipeline",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _run_pipeline_in_thread(report_id: int, job_id: int) -> None:
    """Run the pipeline in a background thread with its own DB session."""
    db = SessionLocal()
    try:
        report = db.query(Report).get(report_id)
        job = db.query(ProcessingJob).get(job_id)
        if report and job:
            run_pipeline(report, job, db)
    finally:
        db.close()


# ── Upload endpoint ──


@app.post("/api/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a PDF and start async processing."""

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF files are accepted")

    file_bytes = await file.read()

    if len(file_bytes) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")

    # Validate PDF magic bytes
    if not file_bytes[:5] == b"%PDF-":
        raise HTTPException(status_code=415, detail="Invalid PDF file")

    report, job = ingest_pdf(file_bytes, file.filename, db)

    # If this is a duplicate that's already completed, return immediately
    if report.status == "completed":
        return UploadResponse(
            reportId=report.id,
            jobId=job.id if job else 0,
            status="completed",
            fileName=report.original_filename,
        )

    # Start pipeline in background thread
    thread = threading.Thread(
        target=_run_pipeline_in_thread,
        args=(report.id, job.id),
        daemon=True,
    )
    thread.start()

    return UploadResponse(
        reportId=report.id,
        jobId=job.id,
        status="queued",
        fileName=report.original_filename,
    )


# ── Job status endpoint ──


@app.get("/api/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: int, db: Session = Depends(get_db)):
    """Poll job processing status."""
    job = db.query(ProcessingJob).get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatus(
        jobId=job.id,
        reportId=job.report_id,
        status=job.status,
        currentStage=job.current_stage,
        progressPercent=job.progress_pct,
    )


# ── Backward-compatible analyze endpoint ──


@app.post("/api/analyze")
async def analyze_compat(request: AnalyzeRequest, db: Session = Depends(get_db)):
    """Backward-compatible endpoint matching existing frontend contract."""

    report = (
        db.query(Report)
        .filter_by(original_filename=request.fileName)
        .order_by(Report.id.desc())
        .first()
    )

    if not report:
        raise HTTPException(status_code=404, detail=f"Report '{request.fileName}' not found")

    if report.status == "processing":
        job = (
            db.query(ProcessingJob)
            .filter_by(report_id=report.id)
            .order_by(ProcessingJob.id.desc())
            .first()
        )
        return {
            "status": "processing",
            "jobId": job.id if job else 0,
            "progressPercent": job.progress_pct if job else 0,
        }

    if report.status == "failed":
        raise HTTPException(
            status_code=500,
            detail=f"Report processing failed: {report.error_message}",
        )

    if not report.analysis_json:
        raise HTTPException(status_code=500, detail="Analysis data not available")

    return json.loads(report.analysis_json)


# ── Backward-compatible chat endpoint ──


@app.post("/api/chat", response_model=ChatResponse)
async def chat_compat(request: ChatRequest, db: Session = Depends(get_db)):
    """Backward-compatible chat endpoint."""

    # Find the most recent completed report
    report = None
    if request.context:
        report = (
            db.query(Report)
            .filter_by(original_filename=request.context, status="completed")
            .order_by(Report.id.desc())
            .first()
        )

    if not report:
        report = (
            db.query(Report)
            .filter_by(status="completed")
            .order_by(Report.id.desc())
            .first()
        )

    if not report:
        return ChatResponse(
            response="No analyzed report found. Please upload and process a geotechnical report first."
        )

    response_text = handle_chat(request.message, report, db)
    return ChatResponse(response=response_text)


# ── Health check ──


@app.get("/api/health")
async def health():
    return {"status": "ok"}

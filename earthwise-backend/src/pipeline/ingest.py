import hashlib
import re
from pathlib import Path

import fitz  # PyMuPDF
from sqlalchemy.orm import Session

from src.config import settings
from src.models import Report, ProcessingJob

# Detect CID-encoded garbage from PyMuPDF output (raw byte codes \x00-\x1f)
# PyMuPDF renders broken fonts as control characters instead of (cid:XX)
_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0e-\x1f]")


def _is_garbage_text(text: str) -> bool:
    """Check if PyMuPDF-extracted text is unreadable garbage (broken font encoding).

    PDFs with embedded fonts lacking ToUnicode mappings produce raw byte codes
    (\x00\x01\x02...) from PyMuPDF instead of readable characters.
    """
    if len(text.strip()) < 10:
        return False
    control_chars = len(_CONTROL_CHAR_RE.findall(text))
    ratio = control_chars / len(text)
    return ratio > 0.15


def ingest_pdf(file_bytes: bytes, original_filename: str, db: Session) -> tuple[Report, ProcessingJob]:
    """Stage 1: Hash the PDF, store it locally, create DB records, detect if scanned."""

    file_hash = hashlib.sha256(file_bytes).hexdigest()
    print(f"  [ingest] File: {original_filename}")
    print(f"  [ingest] Size: {len(file_bytes):,} bytes")
    print(f"  [ingest] SHA-256: {file_hash}")

    # Check for duplicate
    existing = db.query(Report).filter_by(file_hash=file_hash).first()
    if existing and existing.status == "completed":
        print(f"  [ingest] DUPLICATE — already processed as report #{existing.id}")
        job = db.query(ProcessingJob).filter_by(report_id=existing.id).order_by(
            ProcessingJob.id.desc()
        ).first()
        return existing, job

    # Store file locally
    dest_dir = settings.upload_path / file_hash
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_file = dest_dir / original_filename
    dest_file.write_bytes(file_bytes)
    print(f"  [ingest] Stored at: {dest_file}")

    # Extract basic metadata with PyMuPDF
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    page_count = doc.page_count
    print(f"  [ingest] Page count: {page_count}")

    # Detect if scanned: sample first 5 pages for extractable text
    # Also detect CID/garbage fonts that produce unreadable byte codes
    text_pages = 0
    garbage_pages = 0
    sample_count = min(page_count, 5)
    for i in range(sample_count):
        page = doc.load_page(i)
        raw_text = page.get_text("text").strip()
        text_len = len(raw_text)
        if text_len > 50:
            if _is_garbage_text(raw_text):
                garbage_pages += 1
                print(f"  [ingest]   Page {i+1}: {text_len} chars but GARBAGE (broken font encoding)")
            else:
                text_pages += 1
    doc.close()

    # Treat as scanned if no readable text pages OR if all text pages are garbage
    is_scanned = text_pages == 0
    scan_reason = ""
    if garbage_pages > 0 and text_pages == 0:
        scan_reason = f" (all {garbage_pages} text pages have broken font encoding — will use OCR)"
    print(f"  [ingest] Scan detection: {text_pages}/{sample_count} readable pages, {garbage_pages} garbage pages -> {'SCANNED' if is_scanned else 'NATIVE'}{scan_reason}")

    # Create report record
    report = Report(
        file_hash=file_hash,
        original_filename=original_filename,
        file_path=str(dest_file),
        page_count=page_count,
        file_size_bytes=len(file_bytes),
        is_scanned=is_scanned,
        status="processing",
    )
    db.add(report)
    db.flush()

    # Create job record
    job = ProcessingJob(
        report_id=report.id,
        status="running",
        current_stage="ingest",
        progress_pct=5,
    )
    db.add(job)
    db.commit()

    print(f"  [ingest] Created report #{report.id}, job #{job.id}")

    return report, job

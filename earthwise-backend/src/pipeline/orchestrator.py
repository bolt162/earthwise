import json
import time
import traceback
from datetime import datetime

from sqlalchemy.orm import Session

from src.models import Report, ProcessingJob
from src.pipeline.text_extract import extract_text
from src.pipeline.table_extract import extract_tables
from src.pipeline.section_detect import detect_sections
from src.pipeline.llm_extract import run_llm_extraction
from src.pipeline.normalize import normalize_extraction
from src.pipeline.build_output import build_analysis_data


def run_pipeline(report: Report, job: ProcessingJob, db: Session) -> None:
    """Run the full ingestion pipeline for a report. Called from a background thread."""
    pipeline_start = time.time()
    print(f"\n{'='*80}")
    print(f"[PIPELINE] Starting pipeline for report #{report.id}: {report.original_filename}")
    print(f"[PIPELINE] File: {report.file_path} ({report.file_size_bytes} bytes, {report.page_count} pages)")
    print(f"[PIPELINE] Scanned: {report.is_scanned}")
    print(f"{'='*80}\n")

    try:
        # Stage 2: Text extraction
        _update_job(job, "text_extract", 10, db)
        stage_start = time.time()
        print(f"[STAGE 2/7] TEXT EXTRACTION — Starting...")
        pages = extract_text(report, db)
        print(f"[STAGE 2/7] TEXT EXTRACTION — Done in {time.time() - stage_start:.1f}s")
        print()

        # Stage 3: Table extraction
        _update_job(job, "table_extract", 20, db)
        stage_start = time.time()
        print(f"[STAGE 3/7] TABLE EXTRACTION — Starting...")
        tables = extract_tables(report, db)
        print(f"[STAGE 3/7] TABLE EXTRACTION — Done in {time.time() - stage_start:.1f}s")
        print()

        # Stage 4: Section detection
        _update_job(job, "section_detect", 30, db)
        stage_start = time.time()
        print(f"[STAGE 4/7] SECTION DETECTION — Starting...")
        detect_sections(report, db)
        print(f"[STAGE 4/7] SECTION DETECTION — Done in {time.time() - stage_start:.1f}s")
        print()

        # Stage 5: LLM structured extraction
        _update_job(job, "llm_extract", 35, db)
        stage_start = time.time()
        print(f"[STAGE 5/7] LLM EXTRACTION — Starting...")
        extraction = run_llm_extraction(report, db)
        print(f"[STAGE 5/7] LLM EXTRACTION — Done in {time.time() - stage_start:.1f}s")
        print()

        # Stage 6: Normalize and validate
        _update_job(job, "normalize", 75, db)
        stage_start = time.time()
        print(f"[STAGE 6/7] NORMALIZATION — Starting...")
        extraction = normalize_extraction(extraction)
        print(f"[STAGE 6/7] NORMALIZATION — Done in {time.time() - stage_start:.1f}s")
        print()

        # Stage 7: Build AnalysisData output
        _update_job(job, "build_output", 85, db)
        stage_start = time.time()
        print(f"[STAGE 7/7] BUILD OUTPUT — Starting...")
        analysis = build_analysis_data(report, extraction)
        print(f"[STAGE 7/7] BUILD OUTPUT — Done in {time.time() - stage_start:.1f}s")
        print()

        # Persist results
        _update_job(job, "finalize", 95, db)
        analysis_json = analysis.model_dump_json()

        # Update report with extracted metadata and cached output
        report.project_name = extraction.metadata.project_name
        report.client_name = extraction.metadata.client_name
        report.firm_name = extraction.metadata.firm_name
        report.report_date = extraction.metadata.report_date
        report.location_text = extraction.metadata.location
        report.risk_score = analysis.projectSummary.riskScore
        report.analysis_json = analysis_json
        report.status = "completed"
        report.analyzed_at = datetime.now().isoformat()

        job.status = "completed"
        job.current_stage = "done"
        job.progress_pct = 100
        job.completed_at = datetime.now().isoformat()
        db.commit()

        total_time = time.time() - pipeline_start
        print(f"{'='*80}")
        print(f"[PIPELINE] COMPLETED in {total_time:.1f}s")
        print(f"[PIPELINE] Project: {report.project_name}")
        print(f"[PIPELINE] Risk score: {report.risk_score}")
        print(f"{'='*80}\n")

    except Exception as e:
        tb = traceback.format_exc()
        report.status = "failed"
        report.error_message = str(e)
        job.status = "failed"
        job.error_message = str(e)
        db.commit()
        total_time = time.time() - pipeline_start
        print(f"\n{'='*80}")
        print(f"[PIPELINE] FAILED after {total_time:.1f}s at stage '{job.current_stage}'")
        print(f"[PIPELINE] Error: {e}")
        print(f"[PIPELINE] Traceback:\n{tb}")
        print(f"{'='*80}\n")


def _update_job(job: ProcessingJob, stage: str, progress: int, db: Session) -> None:
    """Update job status and progress."""
    job.current_stage = stage
    job.progress_pct = progress
    db.commit()

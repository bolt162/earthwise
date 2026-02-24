from sqlalchemy import Column, Integer, Text, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from src.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    file_hash = Column(Text, nullable=False)
    original_filename = Column(Text, nullable=False)
    file_path = Column(Text, nullable=False)
    page_count = Column(Integer)
    file_size_bytes = Column(Integer)
    is_scanned = Column(Boolean, default=False)
    status = Column(Text, default="uploaded")
    error_message = Column(Text)

    project_name = Column(Text)
    client_name = Column(Text)
    firm_name = Column(Text)
    report_date = Column(Text)
    location_text = Column(Text)

    risk_score = Column(Integer)
    analysis_json = Column(Text)

    created_at = Column(Text, server_default="(datetime('now'))")
    analyzed_at = Column(Text)

    pages = relationship("Page", back_populates="report", cascade="all, delete-orphan")
    tables = relationship("ExtractedTable", back_populates="report", cascade="all, delete-orphan")
    jobs = relationship("ProcessingJob", back_populates="report", cascade="all, delete-orphan")


class Page(Base):
    __tablename__ = "pages"
    __table_args__ = (UniqueConstraint("report_id", "page_number"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    page_number = Column(Integer, nullable=False)
    raw_text = Column(Text, default="")
    extraction_method = Column(Text, default="native")
    section_label = Column(Text)

    report = relationship("Report", back_populates="pages")


class ExtractedTable(Base):
    __tablename__ = "extracted_tables"

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    page_number = Column(Integer, nullable=False)
    table_index = Column(Integer, default=0)
    headers_json = Column(Text, default="[]")
    rows_json = Column(Text, default="[]")
    classification = Column(Text)

    report = relationship("Report", back_populates="tables")


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    status = Column(Text, default="queued")
    current_stage = Column(Text)
    progress_pct = Column(Integer, default=0)
    error_message = Column(Text)
    created_at = Column(Text, server_default="(datetime('now'))")
    completed_at = Column(Text)

    report = relationship("Report", back_populates="jobs")

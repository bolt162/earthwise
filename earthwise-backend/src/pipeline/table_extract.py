import io
import json
import re

import pdfplumber
from sqlalchemy.orm import Session

from src.models import Report, ExtractedTable

# Detect CID-encoded garbage in table cell text
_CID_PATTERN = re.compile(r"\(cid:\d+\)")


def _is_table_empty(headers: list[str], rows: list[list[str]]) -> bool:
    """Check if all cells in the table are empty strings (e.g. from chart gridlines)."""
    all_cells = headers + [cell for row in rows for cell in row]
    return all(cell.strip() == "" for cell in all_cells)


def _is_table_garbage(headers: list[str], rows: list[list[str]]) -> bool:
    """Check if a table's content is CID-encoded garbage.

    Any presence of (cid:XX) tokens in any cell means the table is garbage,
    since legitimate table content never contains CID patterns.
    """
    all_text = " ".join(
        cell for cell in headers if cell.strip()
    )
    for row in rows:
        all_text += " " + " ".join(cell for cell in row if cell.strip())

    all_text = all_text.strip()
    if not all_text:
        return False  # Empty table — not garbage, just empty

    # Any CID pattern at all means garbage (legitimate tables never have these)
    return bool(_CID_PATTERN.search(all_text))


def extract_tables(report: Report, db: Session) -> list[ExtractedTable]:
    """Stage 3: Extract tables from each page using pdfplumber."""

    file_bytes = open(report.file_path, "rb").read()
    tables_found: list[ExtractedTable] = []
    pages_with_tables = 0
    garbage_skipped = 0
    empty_skipped = 0

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            # Try strict line-based strategy first (explicit drawn lines)
            strategy_used = "lines_strict"
            page_tables = page.extract_tables(
                table_settings={
                    "vertical_strategy": "lines_strict",
                    "horizontal_strategy": "lines_strict",
                    "snap_tolerance": 5,
                }
            )

            # Fallback to lines (non-strict) which also uses rectangle edges
            if not page_tables:
                strategy_used = "lines"
                page_tables = page.extract_tables(
                    table_settings={
                        "vertical_strategy": "lines",
                        "horizontal_strategy": "lines",
                    }
                )

            # Last resort: text-based strategy
            if not page_tables:
                strategy_used = "text"
                page_tables = page.extract_tables(
                    table_settings={
                        "vertical_strategy": "text",
                        "horizontal_strategy": "text",
                    }
                )

            page_table_count = 0
            page_garbage_count = 0
            page_empty_count = 0
            for table_idx, table_data in enumerate(page_tables or []):
                if not table_data or len(table_data) < 2:
                    continue  # Need at least header + 1 data row

                # Clean cells: replace None with empty string
                headers = [cell or "" for cell in table_data[0]]
                rows = [
                    [cell or "" for cell in row]
                    for row in table_data[1:]
                ]

                # Skip tables with CID-encoded garbage content
                if _is_table_garbage(headers, rows):
                    page_garbage_count += 1
                    garbage_skipped += 1
                    continue

                # Skip tables where all cells are empty (e.g. chart gridlines)
                if _is_table_empty(headers, rows):
                    page_empty_count += 1
                    empty_skipped += 1
                    continue

                table_record = ExtractedTable(
                    report_id=report.id,
                    page_number=page_num,
                    table_index=table_idx,
                    headers_json=json.dumps(headers),
                    rows_json=json.dumps(rows),
                )
                tables_found.append(table_record)
                page_table_count += 1

            if page_table_count > 0:
                pages_with_tables += 1
                header_preview = ", ".join(str(h) for h in headers)
                msg = f"  [tables] Page {page_num:3d}: {page_table_count} table(s) via {strategy_used} — headers: [{header_preview}] — {len(rows)} row(s)"
                if page_garbage_count:
                    msg += f" (+{page_garbage_count} CID-garbage skipped)"
                if page_empty_count:
                    msg += f" (+{page_empty_count} empty-cell skipped)"
                print(msg)
            elif page_garbage_count > 0 or page_empty_count > 0:
                skipped_parts = []
                if page_garbage_count:
                    skipped_parts.append(f"{page_garbage_count} CID garbage")
                if page_empty_count:
                    skipped_parts.append(f"{page_empty_count} empty-cell")
                print(f"  [tables] Page {page_num:3d}: {' + '.join(skipped_parts)} table(s) skipped")

    db.bulk_save_objects(tables_found)
    db.commit()

    summary = f"  [tables] SUMMARY: {len(tables_found)} tables from {pages_with_tables} pages"
    skipped_parts = []
    if garbage_skipped:
        skipped_parts.append(f"{garbage_skipped} CID-garbage")
    if empty_skipped:
        skipped_parts.append(f"{empty_skipped} empty-cell")
    if skipped_parts:
        summary += f" ({', '.join(skipped_parts)} tables skipped)"
    print(summary)

    return db.query(ExtractedTable).filter_by(report_id=report.id).all()

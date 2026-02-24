import io
import re

import fitz  # PyMuPDF
import pdfplumber
from sqlalchemy.orm import Session

from src.models import Report, Page

# Minimum chars of extractable text to consider a page "native"
MIN_TEXT_LENGTH = 30

# Regex to detect CID-encoded garbage text: (cid:XX) patterns
_CID_PATTERN = re.compile(r"\(cid:\d+\)")

# If more than this fraction of the text consists of (cid:XX) tokens, treat as garbage
_CID_RATIO_THRESHOLD = 0.15


def _is_cid_garbage(text: str) -> bool:
    """Detect if extracted text is CID-encoded font garbage.

    PDFs with embedded fonts lacking ToUnicode mappings produce text like:
      (cid:0)(cid:2)(cid:3)(cid:4)(cid:5)...
    instead of readable characters. This function detects that pattern.
    """
    if not text or len(text.strip()) < MIN_TEXT_LENGTH:
        return False  # Too short to judge; will be caught by length check

    cid_matches = _CID_PATTERN.findall(text)
    if not cid_matches:
        return False

    # Calculate ratio of CID tokens character length to total text length
    cid_chars = sum(len(m) for m in cid_matches)
    ratio = cid_chars / len(text)

    return ratio > _CID_RATIO_THRESHOLD


def extract_text(report: Report, db: Session) -> list[Page]:
    """Stage 2: Extract text from every page. Use OCR fallback for scanned pages."""

    file_bytes = open(report.file_path, "rb").read()
    pages: list[Page] = []
    native_count = 0
    ocr_count = 0
    cid_count = 0

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page_num, pdf_page in enumerate(pdf.pages, start=1):
            text = pdf_page.extract_text() or ""

            if len(text.strip()) < MIN_TEXT_LENGTH:
                # Too little text — likely scanned
                print(f"  [text] Page {page_num:3d}: native text too short ({len(text.strip())} chars), falling back to OCR")
                text = _ocr_page(file_bytes, page_num - 1)
                method = "ocr"
                ocr_count += 1
            elif _is_cid_garbage(text):
                # Has text but it's CID-encoded garbage — force OCR
                cid_matches = _CID_PATTERN.findall(text)
                cid_chars = sum(len(m) for m in cid_matches)
                ratio = cid_chars / len(text)
                print(f"  [text] Page {page_num:3d}: CID garbage detected ({len(cid_matches)} CID tokens, ratio={ratio:.1%}), falling back to OCR")
                text = _ocr_page(file_bytes, page_num - 1)
                method = "ocr"
                ocr_count += 1
                cid_count += 1
            else:
                method = "native"
                native_count += 1

            char_count = len(text)
            text_oneline = text.replace("\n", " ").strip()
            print(f"  [text] Page {page_num:3d}: method={method:6s}  chars={char_count:5d}  | {text_oneline}")

            page = Page(
                report_id=report.id,
                page_number=page_num,
                raw_text=text,
                extraction_method=method,
            )
            pages.append(page)

    db.bulk_save_objects(pages)
    db.commit()

    summary = f"  [text] SUMMARY: {len(pages)} pages extracted — {native_count} native, {ocr_count} OCR"
    if cid_count:
        summary += f" ({cid_count} CID-garbage pages rescued via OCR)"
    print(summary)

    # Re-query to get IDs populated
    return db.query(Page).filter_by(report_id=report.id).order_by(Page.page_number).all()


def _ocr_page(file_bytes: bytes, page_index: int) -> str:
    """Render a page at 300 DPI and OCR it with Tesseract."""
    try:
        import pytesseract
        from PIL import Image

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        page = doc.load_page(page_index)

        # Render at 300 DPI
        mat = fitz.Matrix(300 / 72, 300 / 72)
        pix = page.get_pixmap(matrix=mat)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        doc.close()

        # OCR
        text = pytesseract.image_to_string(img, config="--psm 6")
        print(f"  [text]   OCR page {page_index + 1}: got {len(text)} chars")
        return text

    except ImportError:
        print(f"  [text]   OCR page {page_index + 1}: pytesseract not available, skipping")
        return ""
    except Exception as e:
        print(f"  [text]   OCR page {page_index + 1}: ERROR — {e}")
        return ""

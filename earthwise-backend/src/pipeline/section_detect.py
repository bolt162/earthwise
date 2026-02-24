import re

from sqlalchemy.orm import Session

from src.models import Report, Page

# Section patterns: keyword lists, optional position constraints, and priority.
# Priority is used to break ties: higher priority wins when scores are equal.
#   3 = highly specific (boring_log, laboratory, table_of_contents)
#   2 = moderately specific (groundwater, foundation, slab, pavement, etc.)
#   1 = generic (earthwork, recommendations, executive_summary, etc.)
SECTION_PATTERNS: dict[str, dict] = {
    "cover_page": {
        "keywords": [
            "geotechnical", "engineering report", "investigation report",
            "subsurface exploration", "soil investigation",
        ],
        "max_page_frac": 0.1,  # Only in first 10% of document
        "priority": 1,
    },
    "table_of_contents": {
        "keywords": ["table of contents", "contents"],
        "max_page_frac": 0.15,
        "priority": 3,
    },
    "executive_summary": {
        "keywords": [
            "executive summary", "summary of findings", "summary and conclusions",
            "general", "introduction",
        ],
        "max_page_frac": 0.3,
        "priority": 1,
    },
    "site_description": {
        "keywords": [
            "site description", "site location", "project description",
            "site conditions", "existing conditions", "project site",
        ],
        "priority": 1,
    },
    "field_exploration": {
        "keywords": [
            "field exploration", "subsurface exploration", "boring program",
            "field investigation", "drilling operations", "exploration program",
        ],
        "priority": 2,
    },
    "subsurface_conditions": {
        "keywords": [
            "subsurface conditions", "soil conditions", "geological conditions",
            "stratigraphy", "soil profile", "subsurface profile",
        ],
        "priority": 2,
    },
    "groundwater": {
        "keywords": [
            "groundwater", "water table", "hydrology", "hydrogeologic",
            "ground water",
        ],
        "priority": 2,
    },
    "laboratory": {
        "keywords": [
            "laboratory", "lab testing", "test results", "atterberg",
            "grain size", "moisture content",
        ],
        "priority": 3,
    },
    "recommendations": {
        "keywords": [
            "recommendations", "engineering analysis", "design recommendations",
            "engineering considerations",
        ],
        "priority": 1,
    },
    "foundation": {
        "keywords": [
            "foundation", "footing", "pier", "pile", "mat foundation",
            "spread footing", "drilled shaft", "deep foundation",
        ],
        "priority": 2,
    },
    "slab": {
        "keywords": [
            "slab", "floor slab", "slab-on-grade", "slab on grade",
            "concrete slab",
        ],
        "priority": 2,
    },
    "pavement": {
        "keywords": [
            "pavement", "parking", "drive area", "subgrade",
            "pavement section", "asphalt",
        ],
        "priority": 2,
    },
    "earthwork": {
        "keywords": [
            "earthwork", "excavation", "grading", "fill", "compaction",
            "site preparation", "subgrade preparation",
        ],
        "priority": 1,
    },
    "boring_log": {
        "keywords": [
            "boring log", "log of boring", "test boring", "log of test",
            "boring no", "boring b-", "test pit",
        ],
        "min_page_frac": 0.3,  # Usually in latter half
        "priority": 3,
    },
    "appendix": {
        "keywords": ["appendix", "attachment"],
        "min_page_frac": 0.5,
        "priority": 1,
    },
}

# Heading-like patterns (ALL CAPS or numbered sections at start of line)
HEADING_RE = re.compile(
    r"^(?:\d+[\.\d]*\s+)?([A-Z][A-Z\s\-/&]{4,})$",
    re.MULTILINE,
)


def detect_sections(report: Report, db: Session) -> list[Page]:
    """Stage 4: Assign section labels to each page based on keyword matching."""

    print(f"\n{'─'*60}")
    print(f"[SECTION_DETECT] Starting section detection for report #{report.id}")

    pages = (
        db.query(Page)
        .filter_by(report_id=report.id)
        .order_by(Page.page_number)
        .all()
    )

    if not pages:
        print("[SECTION_DETECT] No pages found — skipping")
        return []

    total_pages = len(pages)
    current_section = "cover_page"
    section_counts: dict[str, int] = {}

    print(f"[SECTION_DETECT] Analyzing {total_pages} pages for section labels")

    for page in pages:
        text_lower = page.raw_text.lower()
        page_frac = page.page_number / total_pages

        best_section = None
        best_score = 0.0
        best_priority = 0
        score_details: list[str] = []

        for section_name, patterns in SECTION_PATTERNS.items():
            # Check position constraints
            max_frac = patterns.get("max_page_frac", 1.0)
            min_frac = patterns.get("min_page_frac", 0.0)
            if page_frac > max_frac or page_frac < min_frac:
                continue

            score = 0.0
            priority = patterns.get("priority", 1)
            matched_keywords: list[str] = []
            for keyword in patterns["keywords"]:
                if keyword in text_lower:
                    # Weight by position: keyword in first 300 chars = likely heading
                    first_pos = text_lower.find(keyword)
                    if first_pos < 300:
                        score += 2.0
                        matched_keywords.append(f'"{keyword}" (heading +2.0)')
                    else:
                        score += 0.5
                        matched_keywords.append(f'"{keyword}" (body +0.5)')

            # Bonus if keyword appears in an ALL-CAPS heading
            headings = HEADING_RE.findall(page.raw_text[:500])
            for heading in headings:
                heading_lower = heading.lower().strip()
                for keyword in patterns["keywords"]:
                    if keyword in heading_lower:
                        score += 3.0
                        matched_keywords.append(f'"{keyword}" in heading "{heading.strip()}" (+3.0)')

            # Higher score wins; on tie, higher priority wins
            if score > best_score or (score == best_score and score > 0 and priority > best_priority):
                best_score = score
                best_priority = priority
                best_section = section_name
                score_details = matched_keywords

        # Only switch section if we have strong signal
        prev_section = current_section
        if best_section and best_score >= 2.0:
            current_section = best_section

        page.section_label = current_section
        section_counts[current_section] = section_counts.get(current_section, 0) + 1

        # Log section changes and strong matches
        if best_section and best_score >= 2.0 and current_section != prev_section:
            print(f"  Page {page.page_number:3d}: → [{current_section}] (score={best_score:.1f}) matched: {', '.join(score_details)}")
        elif best_section and best_score >= 2.0:
            print(f"  Page {page.page_number:3d}: = [{current_section}] (score={best_score:.1f})")

    db.commit()

    print(f"\n[SECTION_DETECT] Section distribution:")
    for section, count in sorted(section_counts.items(), key=lambda x: -x[1]):
        print(f"  {section:30s} → {count} pages")
    print(f"[SECTION_DETECT] Done — {total_pages} pages labeled")

    return pages

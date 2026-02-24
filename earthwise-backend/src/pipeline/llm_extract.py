import json
import re

from openai import OpenAI
from sqlalchemy.orm import Session

from src.config import settings
from src.models import Report, Page, ExtractedTable
from src.schemas import (
    ExtractionResult,
    ExtractedMetadata,
    ExtractedBoring,
    ExtractedStratum,
    ExtractedGroundwater,
    ExtractedRecommendation,
    ExtractedRiskFlag,
)
from src.prompts.metadata import build_metadata_prompt
from src.prompts.borings import build_borings_prompt
from src.prompts.recommendations import build_recommendations_prompt
from src.prompts.risk_flags import build_risk_flags_prompt


def _get_client() -> OpenAI:
    return OpenAI(api_key=settings.openai_api_key)


def _call_llm(prompt: str, label: str = "") -> str:
    """Call GPT-4o and return the text response."""
    tag = f"[LLM:{label}]" if label else "[LLM]"
    print(f"\n  {tag} Sending prompt ({len(prompt)} chars):")
    for line in prompt.split("\n"):
        print(f"    > {line}")

    client = _get_client()
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=8192,
    )
    raw = response.choices[0].message.content or ""

    usage = response.usage
    if usage:
        print(f"  {tag} Tokens — prompt: {usage.prompt_tokens}, completion: {usage.completion_tokens}, total: {usage.total_tokens}")
    print(f"  {tag} Response ({len(raw)} chars):")
    for line in raw.split("\n"):
        print(f"    | {line}")

    return raw


def _parse_json(text: str, label: str = "") -> dict:
    """Extract JSON from LLM response, handling markdown code blocks."""
    tag = f"[PARSE:{label}]" if label else "[PARSE]"
    text = text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first line (```json) and last line (```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)
    try:
        result = json.loads(text)
        print(f"  {tag} Parsed JSON successfully — top-level keys: {list(result.keys())}")
        return result
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(text[start:end])
            print(f"  {tag} Parsed JSON (extracted from text) — top-level keys: {list(result.keys())}")
            return result
        print(f"  {tag} WARNING: Failed to parse JSON from response")
        return {}


def _get_pages_by_sections(
    report_id: int, sections: list[str], db: Session
) -> list[Page]:
    """Get pages matching any of the given section labels."""
    return (
        db.query(Page)
        .filter(Page.report_id == report_id, Page.section_label.in_(sections))
        .order_by(Page.page_number)
        .all()
    )


def _format_pages(pages: list[Page]) -> str:
    """Format pages into text for LLM prompt."""
    parts = []
    for p in pages:
        parts.append(f"--- PAGE {p.page_number} ---\n{p.raw_text}")
    return "\n\n".join(parts)


def _format_tables(tables: list[ExtractedTable]) -> str:
    """Format extracted tables into text for LLM context."""
    if not tables:
        return ""
    parts = []
    for t in tables:
        headers = json.loads(t.headers_json)
        rows = json.loads(t.rows_json)
        parts.append(f"[TABLE on page {t.page_number}]")
        if headers:
            parts.append(" | ".join(str(h) for h in headers))
            parts.append("-" * 40)
        for row in rows:
            parts.append(" | ".join(str(c) for c in row))
        parts.append("")
    return "\n".join(parts)


def _chunk_pages(pages: list[Page], chunk_size: int) -> list[list[Page]]:
    """Split pages into chunks for LLM processing."""
    return [pages[i : i + chunk_size] for i in range(0, len(pages), chunk_size)]


def extract_metadata(report: Report, db: Session) -> ExtractedMetadata:
    """Extract project metadata from cover/summary pages."""
    print(f"\n{'─'*60}")
    print(f"[LLM_EXTRACT] Pass 1/4: METADATA extraction")

    pages = _get_pages_by_sections(
        report.id,
        ["cover_page", "table_of_contents", "executive_summary", "site_description"],
        db,
    )
    if not pages:
        # Fallback: use first 5 pages
        print("  Using fallback: first 5 pages (no section-matched pages found)")
        pages = (
            db.query(Page)
            .filter_by(report_id=report.id)
            .order_by(Page.page_number)
            .limit(5)
            .all()
        )

    page_nums = [p.page_number for p in pages[:5]]
    print(f"  Source pages: {page_nums}")

    page_text = _format_pages(pages[:5])  # Limit to 5 pages for metadata
    prompt = build_metadata_prompt(page_text)
    raw = _call_llm(prompt, label="metadata")
    data = _parse_json(raw, label="metadata")

    metadata = ExtractedMetadata(
        project_name=data.get("project_name"),
        client_name=data.get("client_name"),
        firm_name=data.get("firm_name"),
        report_date=data.get("report_date"),
        location=data.get("location"),
    )

    print(f"\n  [LLM_EXTRACT] Metadata result:")
    print(f"    Project: {metadata.project_name}")
    print(f"    Client:  {metadata.client_name}")
    print(f"    Firm:    {metadata.firm_name}")
    print(f"    Date:    {metadata.report_date}")
    print(f"    Location:{metadata.location}")

    return metadata


_BORING_LOG_RE = re.compile(r"Boring\s+Log", re.IGNORECASE)


def extract_borings(report: Report, db: Session) -> list[ExtractedBoring]:
    """Extract boring/test pit data from boring log and subsurface sections."""
    print(f"\n{'─'*60}")
    print(f"[LLM_EXTRACT] Pass 2/4: BORINGS extraction")

    pages = _get_pages_by_sections(
        report.id,
        [
            "boring_log", "field_exploration", "subsurface_conditions",
            "groundwater", "laboratory",
        ],
        db,
    )
    if not pages:
        # Fallback: use all pages
        print("  Using fallback: all pages (no section-matched pages found)")
        pages = (
            db.query(Page)
            .filter_by(report_id=report.id)
            .order_by(Page.page_number)
            .all()
        )

    # Safety net: check earthwork-labeled pages for boring log content
    # (boring log pages often get mislabeled as earthwork due to "FILL" keyword)
    section_page_nums = {p.page_number for p in pages}
    earthwork_pages = (
        db.query(Page)
        .filter(Page.report_id == report.id, Page.section_label == "earthwork")
        .order_by(Page.page_number)
        .all()
    )
    rescued_pages = [
        p for p in earthwork_pages
        if p.page_number not in section_page_nums and _BORING_LOG_RE.search(p.raw_text)
    ]
    if rescued_pages:
        rescued_nums = [p.page_number for p in rescued_pages]
        print(f"  Safety net: found {len(rescued_pages)} earthwork pages with boring log content: {rescued_nums}")
        pages = sorted(pages + rescued_pages, key=lambda p: p.page_number)

    print(f"  Source pages: {[p.page_number for p in pages]}")

    # Get relevant tables
    page_nums = [p.page_number for p in pages]
    tables = (
        db.query(ExtractedTable)
        .filter(
            ExtractedTable.report_id == report.id,
            ExtractedTable.page_number.in_(page_nums),
        )
        .all()
    )
    print(f"  Tables available: {len(tables)} across pages {sorted(set(t.page_number for t in tables))}")

    all_borings: list[ExtractedBoring] = []
    chunks = _chunk_pages(pages, settings.pages_per_llm_chunk)
    print(f"  Processing in {len(chunks)} chunks of up to {settings.pages_per_llm_chunk} pages each")

    for chunk_idx, chunk in enumerate(chunks, 1):
        chunk_page_nums = [p.page_number for p in chunk]
        chunk_tables = [t for t in tables if t.page_number in chunk_page_nums]
        print(f"\n  [CHUNK {chunk_idx}/{len(chunks)}] Pages: {chunk_page_nums}, tables: {len(chunk_tables)}")

        page_text = _format_pages(chunk)
        table_text = _format_tables(chunk_tables)

        prompt = build_borings_prompt(page_text, table_text)
        raw = _call_llm(prompt, label=f"borings-chunk{chunk_idx}")
        data = _parse_json(raw, label=f"borings-chunk{chunk_idx}")

        chunk_borings = data.get("borings", [])
        print(f"  [CHUNK {chunk_idx}] Extracted {len(chunk_borings)} borings")

        for b in chunk_borings:
            boring = ExtractedBoring(
                boring_id=b.get("boring_id", ""),
                surface_elevation=b.get("surface_elevation"),
                termination_depth=b.get("termination_depth"),
                refusal_depth=b.get("refusal_depth"),
                refusal_material=b.get("refusal_material"),
                strata=[
                    ExtractedStratum(**s) for s in b.get("strata", [])
                ],
                groundwater_observations=[
                    ExtractedGroundwater(**g) for g in b.get("groundwater_observations", [])
                ],
                red_flag_indicators=b.get("red_flag_indicators", []),
                notes=b.get("notes"),
                source_pages=b.get("source_pages", []),
            )
            print(f"    Boring {boring.boring_id}: {len(boring.strata)} strata, "
                  f"refusal={boring.refusal_depth}, gw_obs={len(boring.groundwater_observations)}, "
                  f"red_flags={boring.red_flag_indicators}")
            all_borings.append(boring)

    # Deduplicate: keep the most complete version of each boring
    deduped = _deduplicate_borings(all_borings)
    print(f"\n  [LLM_EXTRACT] Borings: {len(all_borings)} raw → {len(deduped)} after dedup")
    for b in deduped:
        print(f"    {b.boring_id}: {len(b.strata)} strata, pages={b.source_pages}")

    return deduped


def _deduplicate_borings(borings: list[ExtractedBoring]) -> list[ExtractedBoring]:
    """Deduplicate borings by ID, keeping the version with more strata."""
    by_id: dict[str, ExtractedBoring] = {}
    for b in borings:
        key = b.boring_id.upper().strip()
        if key not in by_id or len(b.strata) > len(by_id[key].strata):
            # Merge source pages
            if key in by_id:
                existing_pages = set(by_id[key].source_pages)
                new_pages = set(b.source_pages)
                b.source_pages = sorted(existing_pages | new_pages)
            by_id[key] = b
    return list(by_id.values())


def extract_recommendations(report: Report, db: Session) -> list[ExtractedRecommendation]:
    """Extract recommendations from recommendation sections."""
    print(f"\n{'─'*60}")
    print(f"[LLM_EXTRACT] Pass 3/4: RECOMMENDATIONS extraction")

    pages = _get_pages_by_sections(
        report.id,
        [
            "recommendations", "foundation", "slab", "pavement",
            "earthwork", "executive_summary",
        ],
        db,
    )
    if not pages:
        print("  Using fallback: all pages")
        pages = (
            db.query(Page)
            .filter_by(report_id=report.id)
            .order_by(Page.page_number)
            .all()
        )

    print(f"  Source pages: {[p.page_number for p in pages]}")

    all_recs: list[ExtractedRecommendation] = []
    chunks = _chunk_pages(pages, settings.pages_per_llm_chunk)
    print(f"  Processing in {len(chunks)} chunks")

    for chunk_idx, chunk in enumerate(chunks, 1):
        chunk_page_nums = [p.page_number for p in chunk]
        print(f"\n  [CHUNK {chunk_idx}/{len(chunks)}] Pages: {chunk_page_nums}")

        page_text = _format_pages(chunk)
        prompt = build_recommendations_prompt(page_text)
        raw = _call_llm(prompt, label=f"recs-chunk{chunk_idx}")
        data = _parse_json(raw, label=f"recs-chunk{chunk_idx}")

        chunk_recs = data.get("recommendations", [])
        print(f"  [CHUNK {chunk_idx}] Extracted {len(chunk_recs)} recommendations")

        for r in chunk_recs:
            rec = ExtractedRecommendation(
                category=r.get("category", "foundation"),
                summary=r.get("summary", ""),
                page_references=r.get("page_references", []),
                keywords=r.get("keywords", []),
            )
            print(f"    [{rec.category}] {rec.summary} (pages={rec.page_references}, keywords={rec.keywords})")
            all_recs.append(rec)

    print(f"\n  [LLM_EXTRACT] Total recommendations: {len(all_recs)}")
    cats = {}
    for r in all_recs:
        cats[r.category] = cats.get(r.category, 0) + 1
    for cat, count in cats.items():
        print(f"    {cat}: {count}")

    return all_recs


def extract_risk_flags(report: Report, db: Session) -> list[ExtractedRiskFlag]:
    """Extract risk flags from the entire report, focusing on key sections."""
    print(f"\n{'─'*60}")
    print(f"[LLM_EXTRACT] Pass 4/4: RISK FLAGS extraction")

    pages = _get_pages_by_sections(
        report.id,
        [
            "subsurface_conditions", "groundwater", "recommendations",
            "earthwork", "executive_summary", "foundation", "slab", "pavement",
        ],
        db,
    )
    if not pages:
        print("  Using fallback: all pages")
        pages = (
            db.query(Page)
            .filter_by(report_id=report.id)
            .order_by(Page.page_number)
            .all()
        )

    print(f"  Source pages: {[p.page_number for p in pages]}")

    all_flags: list[ExtractedRiskFlag] = []
    chunks = _chunk_pages(pages, settings.pages_per_llm_chunk)
    print(f"  Processing in {len(chunks)} chunks")

    for chunk_idx, chunk in enumerate(chunks, 1):
        chunk_page_nums = [p.page_number for p in chunk]
        print(f"\n  [CHUNK {chunk_idx}/{len(chunks)}] Pages: {chunk_page_nums}")

        page_text = _format_pages(chunk)
        prompt = build_risk_flags_prompt(page_text)
        raw = _call_llm(prompt, label=f"risks-chunk{chunk_idx}")
        data = _parse_json(raw, label=f"risks-chunk{chunk_idx}")

        chunk_flags = data.get("risk_flags", [])
        print(f"  [CHUNK {chunk_idx}] Extracted {len(chunk_flags)} risk flags")

        for f in chunk_flags:
            flag = ExtractedRiskFlag(
                category=f.get("category", ""),
                confidence_level=f.get("confidence_level", "medium"),
                description=f.get("description", ""),
                evidence=f.get("evidence", ""),
                page_reference=f.get("page_reference"),
            )
            print(f"    [{flag.confidence_level.upper()}] {flag.category}: {flag.description} (page={flag.page_reference})")
            all_flags.append(flag)

    print(f"\n  [LLM_EXTRACT] Total risk flags: {len(all_flags)}")
    by_level = {}
    for f in all_flags:
        by_level[f.confidence_level] = by_level.get(f.confidence_level, 0) + 1
    for level, count in by_level.items():
        print(f"    {level}: {count}")

    return all_flags


def run_llm_extraction(report: Report, db: Session) -> ExtractionResult:
    """Stage 5: Run all LLM extraction passes and return combined result."""
    print(f"\n{'='*60}")
    print(f"[LLM_EXTRACT] Starting LLM extraction — 4 passes using {settings.openai_model}")
    print(f"{'='*60}")

    metadata = extract_metadata(report, db)
    borings = extract_borings(report, db)
    recommendations = extract_recommendations(report, db)
    risk_flags = extract_risk_flags(report, db)

    print(f"\n{'='*60}")
    print(f"[LLM_EXTRACT] ALL PASSES COMPLETE")
    print(f"  Metadata:        {metadata.project_name or 'N/A'}")
    print(f"  Borings:         {len(borings)}")
    print(f"  Recommendations: {len(recommendations)}")
    print(f"  Risk flags:      {len(risk_flags)}")
    print(f"{'='*60}")

    return ExtractionResult(
        metadata=metadata,
        borings=borings,
        recommendations=recommendations,
        risk_flags=risk_flags,
    )

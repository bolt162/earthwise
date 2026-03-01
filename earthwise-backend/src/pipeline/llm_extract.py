import json
import re
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field

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


# ── LLM helpers ──────────────────────────────────────────────────────────────


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


def _call_llm_parallel(prompts: list[tuple[str, str]]) -> list[str]:
    """Fire multiple LLM calls concurrently. Returns results in input order."""
    if not prompts:
        return []
    if len(prompts) == 1:
        return [_call_llm(prompts[0][0], prompts[0][1])]

    with ThreadPoolExecutor(max_workers=len(prompts), thread_name_prefix="llm") as pool:
        futures = [pool.submit(_call_llm, p, l) for p, l in prompts]
        return [f.result() for f in futures]


def _strip_nulls(d: dict) -> dict:
    """Remove None values so Pydantic uses field defaults instead of failing."""
    return {k: v for k, v in d.items() if v is not None}


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


# ── Formatting helpers ───────────────────────────────────────────────────────


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


# ── Pre-loaded data (avoids DB access in threads) ───────────────────────────


@dataclass
class _PageData:
    """All pages and tables for a report, pre-loaded from DB."""
    all_pages: list[Page]
    all_tables: list[ExtractedTable]
    _by_section: dict[str, list[Page]] = field(init=False, repr=False)
    _tables_by_page: dict[int, list[ExtractedTable]] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self._by_section = {}
        for p in self.all_pages:
            self._by_section.setdefault(p.section_label or "", []).append(p)
        self._tables_by_page = {}
        for t in self.all_tables:
            self._tables_by_page.setdefault(t.page_number, []).append(t)

    def pages_by_sections(self, sections: list[str]) -> list[Page]:
        """Get pages matching any of the given section labels, deduped & sorted."""
        seen: set[int] = set()
        result: list[Page] = []
        for s in sections:
            for p in self._by_section.get(s, []):
                if p.page_number not in seen:
                    seen.add(p.page_number)
                    result.append(p)
        return sorted(result, key=lambda p: p.page_number)

    def first_n_pages(self, n: int) -> list[Page]:
        return sorted(self.all_pages, key=lambda p: p.page_number)[:n]

    def tables_for_pages(self, page_nums: list[int]) -> list[ExtractedTable]:
        result: list[ExtractedTable] = []
        for pn in page_nums:
            result.extend(self._tables_by_page.get(pn, []))
        return result


# ── Phase 1: Prompt preparation (fast, main thread) ─────────────────────────


def _prepare_metadata_prompts(data: _PageData) -> list[tuple[str, str]]:
    """Build prompts for metadata extraction. Returns [(prompt, label)]."""
    print(f"\n{'─'*60}")
    print(f"[PREPARE] Pass 1/4: METADATA")

    pages = data.pages_by_sections(
        ["cover_page", "table_of_contents", "executive_summary", "site_description"]
    )
    if not pages:
        print("  Using fallback: first 5 pages (no section-matched pages found)")
        pages = data.first_n_pages(5)

    pages = pages[:5]  # Limit to 5 pages for metadata
    print(f"  Source pages: {[p.page_number for p in pages]}")
    print(f"  Prompts: 1")

    page_text = _format_pages(pages)
    prompt = build_metadata_prompt(page_text)
    return [(prompt, "metadata")]


_BORING_LOG_RE = re.compile(r"Boring\s+Log", re.IGNORECASE)


def _prepare_borings_prompts(
    data: _PageData,
) -> tuple[list[tuple[str, str]], list[list[Page]]]:
    """Build prompts for boring extraction. Returns ([(prompt, label)], [chunk_pages])."""
    print(f"\n{'─'*60}")
    print(f"[PREPARE] Pass 2/4: BORINGS")

    pages = data.pages_by_sections(
        ["boring_log", "field_exploration", "subsurface_conditions", "groundwater", "laboratory"]
    )
    if not pages:
        print("  Using fallback: all pages (no section-matched pages found)")
        pages = sorted(data.all_pages, key=lambda p: p.page_number)

    # Safety net: rescue earthwork pages with boring log content
    section_page_nums = {p.page_number for p in pages}
    earthwork_pages = data.pages_by_sections(["earthwork"])
    rescued = [
        p for p in earthwork_pages
        if p.page_number not in section_page_nums and _BORING_LOG_RE.search(p.raw_text)
    ]
    if rescued:
        print(f"  Safety net: found {len(rescued)} earthwork pages with boring log content: {[p.page_number for p in rescued]}")
        pages = sorted(pages + rescued, key=lambda p: p.page_number)

    print(f"  Source pages: {[p.page_number for p in pages]}")

    chunks = _chunk_pages(pages, settings.pages_per_llm_chunk)
    print(f"  Prompts: {len(chunks)} chunks of up to {settings.pages_per_llm_chunk} pages")

    prompts: list[tuple[str, str]] = []
    for idx, chunk in enumerate(chunks, 1):
        chunk_page_nums = [p.page_number for p in chunk]
        chunk_tables = data.tables_for_pages(chunk_page_nums)
        print(f"    Chunk {idx}: pages {chunk_page_nums}, tables: {len(chunk_tables)}")
        page_text = _format_pages(chunk)
        table_text = _format_tables(chunk_tables)
        prompt = build_borings_prompt(page_text, table_text)
        prompts.append((prompt, f"borings-chunk{idx}"))

    return prompts, chunks


def _prepare_recommendations_prompts(
    data: _PageData,
) -> tuple[list[tuple[str, str]], list[list[Page]]]:
    """Build prompts for recommendation extraction."""
    print(f"\n{'─'*60}")
    print(f"[PREPARE] Pass 3/4: RECOMMENDATIONS")

    pages = data.pages_by_sections(
        ["recommendations", "foundation", "slab", "pavement", "earthwork", "executive_summary"]
    )
    if not pages:
        print("  Using fallback: all pages")
        pages = sorted(data.all_pages, key=lambda p: p.page_number)

    print(f"  Source pages: {[p.page_number for p in pages]}")

    chunks = _chunk_pages(pages, settings.pages_per_llm_chunk)
    print(f"  Prompts: {len(chunks)} chunks")

    prompts: list[tuple[str, str]] = []
    for idx, chunk in enumerate(chunks, 1):
        print(f"    Chunk {idx}: pages {[p.page_number for p in chunk]}")
        page_text = _format_pages(chunk)
        prompt = build_recommendations_prompt(page_text)
        prompts.append((prompt, f"recs-chunk{idx}"))

    return prompts, chunks


def _prepare_risk_flags_prompts(
    data: _PageData,
) -> tuple[list[tuple[str, str]], list[list[Page]]]:
    """Build prompts for risk flag extraction."""
    print(f"\n{'─'*60}")
    print(f"[PREPARE] Pass 4/4: RISK FLAGS")

    pages = data.pages_by_sections(
        ["subsurface_conditions", "groundwater", "recommendations",
         "earthwork", "executive_summary", "foundation", "slab", "pavement"]
    )
    if not pages:
        print("  Using fallback: all pages")
        pages = sorted(data.all_pages, key=lambda p: p.page_number)

    print(f"  Source pages: {[p.page_number for p in pages]}")

    chunks = _chunk_pages(pages, settings.pages_per_llm_chunk)
    print(f"  Prompts: {len(chunks)} chunks")

    prompts: list[tuple[str, str]] = []
    for idx, chunk in enumerate(chunks, 1):
        print(f"    Chunk {idx}: pages {[p.page_number for p in chunk]}")
        page_text = _format_pages(chunk)
        prompt = build_risk_flags_prompt(page_text)
        prompts.append((prompt, f"risks-chunk{idx}"))

    return prompts, chunks


# ── Phase 3: Result parsing (fast, main thread) ─────────────────────────────


def _parse_metadata_results(raws: list[str]) -> ExtractedMetadata:
    """Parse metadata from LLM response."""
    data = _parse_json(raws[0], label="metadata")

    metadata = ExtractedMetadata(
        project_name=data.get("project_name"),
        client_name=data.get("client_name"),
        firm_name=data.get("firm_name"),
        report_date=data.get("report_date"),
        location=data.get("location"),
        site_latitude=data.get("site_latitude"),
        site_longitude=data.get("site_longitude"),
    )

    print(f"\n  [RESULT] Metadata:")
    print(f"    Project: {metadata.project_name}")
    print(f"    Client:  {metadata.client_name}")
    print(f"    Firm:    {metadata.firm_name}")
    print(f"    Date:    {metadata.report_date}")
    print(f"    Location:{metadata.location}")

    return metadata


def _parse_borings_results(raws: list[str]) -> list[ExtractedBoring]:
    """Parse borings from LLM responses (one per chunk)."""
    all_borings: list[ExtractedBoring] = []

    for chunk_idx, raw in enumerate(raws, 1):
        data = _parse_json(raw, label=f"borings-chunk{chunk_idx}")
        chunk_borings = data.get("borings", [])
        print(f"  [RESULT] Borings chunk {chunk_idx}: {len(chunk_borings)} borings")

        for b in chunk_borings:
            boring = ExtractedBoring(
                boring_id=b.get("boring_id", ""),
                surface_elevation=b.get("surface_elevation"),
                termination_depth=b.get("termination_depth"),
                refusal_depth=b.get("refusal_depth"),
                refusal_material=b.get("refusal_material"),
                latitude=b.get("latitude"),
                longitude=b.get("longitude"),
                strata=[ExtractedStratum(**_strip_nulls(s)) for s in b.get("strata", [])],
                groundwater_observations=[
                    ExtractedGroundwater(**_strip_nulls(g)) for g in b.get("groundwater_observations", [])
                ],
                red_flag_indicators=b.get("red_flag_indicators", []),
                notes=b.get("notes"),
                source_pages=b.get("source_pages", []),
            )
            print(
                f"    Boring {boring.boring_id}: {len(boring.strata)} strata, "
                f"refusal={boring.refusal_depth}, gw_obs={len(boring.groundwater_observations)}, "
                f"red_flags={boring.red_flag_indicators}"
            )
            all_borings.append(boring)

    # Deduplicate
    deduped = _deduplicate_borings(all_borings)
    print(f"\n  [RESULT] Borings: {len(all_borings)} raw -> {len(deduped)} after dedup")
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


def _parse_recommendations_results(raws: list[str]) -> list[ExtractedRecommendation]:
    """Parse recommendations from LLM responses (one per chunk)."""
    all_recs: list[ExtractedRecommendation] = []

    for chunk_idx, raw in enumerate(raws, 1):
        data = _parse_json(raw, label=f"recs-chunk{chunk_idx}")
        chunk_recs = data.get("recommendations", [])
        print(f"  [RESULT] Recommendations chunk {chunk_idx}: {len(chunk_recs)} recommendations")

        for r in chunk_recs:
            rec = ExtractedRecommendation(
                category=r.get("category", "foundation"),
                summary=r.get("summary", ""),
                page_references=r.get("page_references", []),
                keywords=r.get("keywords", []),
            )
            print(f"    [{rec.category}] {rec.summary} (pages={rec.page_references}, keywords={rec.keywords})")
            all_recs.append(rec)

    print(f"\n  [RESULT] Total recommendations: {len(all_recs)}")
    cats: dict[str, int] = {}
    for r in all_recs:
        cats[r.category] = cats.get(r.category, 0) + 1
    for cat, count in cats.items():
        print(f"    {cat}: {count}")

    return all_recs


def _parse_risk_flags_results(raws: list[str]) -> list[ExtractedRiskFlag]:
    """Parse risk flags from LLM responses (one per chunk)."""
    all_flags: list[ExtractedRiskFlag] = []

    for chunk_idx, raw in enumerate(raws, 1):
        data = _parse_json(raw, label=f"risks-chunk{chunk_idx}")
        chunk_flags = data.get("risk_flags", [])
        print(f"  [RESULT] Risk flags chunk {chunk_idx}: {len(chunk_flags)} flags")

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

    print(f"\n  [RESULT] Total risk flags: {len(all_flags)}")
    by_level: dict[str, int] = {}
    for f in all_flags:
        by_level[f.confidence_level] = by_level.get(f.confidence_level, 0) + 1
    for level, count in by_level.items():
        print(f"    {level}: {count}")

    return all_flags


# ── Main entry point ─────────────────────────────────────────────────────────


def run_llm_extraction(report: Report, db: Session) -> ExtractionResult:
    """Stage 5: Run all LLM extraction passes with parallel API calls.

    Three-phase approach:
      Phase 1 (main thread): Pre-load data from DB, build all prompts
      Phase 2 (thread pool): Fire ALL LLM calls concurrently
      Phase 3 (main thread): Parse results, build typed objects
    """
    print(f"\n{'='*60}")
    print(f"[LLM_EXTRACT] Starting LLM extraction — parallel mode, model={settings.openai_model}")
    print(f"{'='*60}")

    # ── Pre-load all data from DB (single query each, fast) ──
    all_pages = (
        db.query(Page)
        .filter_by(report_id=report.id)
        .order_by(Page.page_number)
        .all()
    )
    all_tables = db.query(ExtractedTable).filter_by(report_id=report.id).all()
    data = _PageData(all_pages=all_pages, all_tables=all_tables)
    print(f"\n[LLM_EXTRACT] Pre-loaded {len(all_pages)} pages, {len(all_tables)} tables")

    # ── Phase 1: Build all prompts ──
    phase1_start = time.time()
    print(f"\n[LLM_EXTRACT] Phase 1: Building prompts...")

    meta_prompts = _prepare_metadata_prompts(data)
    boring_prompts, _boring_chunks = _prepare_borings_prompts(data)
    rec_prompts, _rec_chunks = _prepare_recommendations_prompts(data)
    risk_prompts, _risk_chunks = _prepare_risk_flags_prompts(data)

    all_prompts = meta_prompts + boring_prompts + rec_prompts + risk_prompts
    total_calls = len(all_prompts)
    print(f"\n[LLM_EXTRACT] Phase 1 done in {time.time() - phase1_start:.1f}s — {total_calls} LLM calls to make")
    print(f"  Breakdown: metadata={len(meta_prompts)}, borings={len(boring_prompts)}, "
          f"recs={len(rec_prompts)}, risks={len(risk_prompts)}")

    # ── Phase 2: Fire ALL LLM calls in parallel ──
    phase2_start = time.time()
    print(f"\n[LLM_EXTRACT] Phase 2: Firing {total_calls} LLM calls in parallel...")

    all_results = _call_llm_parallel(all_prompts)

    print(f"\n[LLM_EXTRACT] Phase 2 done in {time.time() - phase2_start:.1f}s — all {total_calls} calls completed")

    # ── Phase 3: Parse results ──
    phase3_start = time.time()
    print(f"\n[LLM_EXTRACT] Phase 3: Parsing results...")

    # Slice results back to each pass
    i = 0
    meta_results = all_results[i : i + len(meta_prompts)]
    i += len(meta_prompts)
    boring_results = all_results[i : i + len(boring_prompts)]
    i += len(boring_prompts)
    rec_results = all_results[i : i + len(rec_prompts)]
    i += len(rec_prompts)
    risk_results = all_results[i : i + len(risk_prompts)]

    metadata = _parse_metadata_results(meta_results)
    borings = _parse_borings_results(boring_results)
    recommendations = _parse_recommendations_results(rec_results)
    risk_flags = _parse_risk_flags_results(risk_results)

    print(f"\n[LLM_EXTRACT] Phase 3 done in {time.time() - phase3_start:.1f}s")

    # ── Summary ──
    total_time = time.time() - phase1_start
    print(f"\n{'='*60}")
    print(f"[LLM_EXTRACT] ALL PASSES COMPLETE in {total_time:.1f}s (was sequential, now parallel)")
    print(f"  Metadata:        {metadata.project_name or 'N/A'}")
    print(f"  Borings:         {len(borings)}")
    print(f"  Recommendations: {len(recommendations)}")
    print(f"  Risk flags:      {len(risk_flags)}")
    print(f"  LLM calls:       {total_calls} (fired concurrently)")
    print(f"{'='*60}")

    return ExtractionResult(
        metadata=metadata,
        borings=borings,
        recommendations=recommendations,
        risk_flags=risk_flags,
    )

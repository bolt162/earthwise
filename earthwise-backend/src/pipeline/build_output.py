import urllib.parse
import urllib.request
import json
from datetime import datetime

from src.schemas import (
    AnalysisData,
    ProjectSummary,
    WaterTableEntry,
    SoilCharacteristic,
    Recommendations,
    RecommendationItem,
    RiskFlag,
    ExtractionResult,
)
from src.models import Report


def _geocode_address(address: str) -> tuple[float, float] | None:
    """Geocode an address using OpenStreetMap Nominatim (free, no API key).

    Returns (latitude, longitude) or None on failure.
    """
    try:
        params = urllib.parse.urlencode({"q": address, "format": "json", "limit": "1"})
        url = f"https://nominatim.openstreetmap.org/search?{params}"
        req = urllib.request.Request(url, headers={"User-Agent": "Earthwise/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        if data:
            lat = float(data[0]["lat"])
            lon = float(data[0]["lon"])
            print(f"  [GEOCODE] '{address}' → ({lat}, {lon})")
            return lat, lon
        print(f"  [GEOCODE] No results for '{address}'")
        return None
    except Exception as e:
        print(f"  [GEOCODE] Failed for '{address}': {e}")
        return None


def build_analysis_data(report: Report, extraction: ExtractionResult) -> AnalysisData:
    """Stage 7: Transform extraction results into the frontend-compatible AnalysisData shape."""

    print(f"\n{'─'*60}")
    print(f"[BUILD_OUTPUT] Assembling AnalysisData JSON")

    borings = extraction.borings
    meta = extraction.metadata

    # Determine groundwater/rock flags
    groundwater_detected = any(
        any(gw.is_encountered for gw in b.groundwater_observations)
        for b in borings
    )
    rock_refusal_detected = any(
        b.refusal_depth is not None for b in borings
    )

    print(f"  Groundwater detected: {groundwater_detected}")
    print(f"  Rock/refusal detected: {rock_refusal_detected}")

    # Compute risk score
    risk_score = _compute_risk_score(extraction, groundwater_detected, rock_refusal_detected)

    # Resolve site-level coordinates
    # Priority: metadata LLM extraction → geocode address
    site_lat = meta.site_latitude
    site_lon = meta.site_longitude

    if site_lat is None or site_lon is None:
        # Try geocoding the extracted address
        if meta.location:
            coords = _geocode_address(meta.location)
            if coords:
                site_lat, site_lon = coords

    if site_lat is not None and site_lon is not None:
        print(f"  Site coordinates: ({site_lat}, {site_lon})")
    else:
        print(f"  Site coordinates: not available")

    # Build project summary
    project_summary = ProjectSummary(
        projectName=meta.project_name or report.original_filename.replace(".pdf", ""),
        uploadedFileName=report.original_filename,
        dateAnalyzed=datetime.now().strftime("%Y-%m-%d"),
        riskScore=risk_score,
        totalBorings=len(borings),
        groundwaterDetected=groundwater_detected,
        rockRefusalDetected=rock_refusal_detected,
        siteLatitude=site_lat,
        siteLongitude=site_lon,
    )

    print(f"\n  [BUILD_OUTPUT] Project Summary:")
    print(f"    Name:       {project_summary.projectName}")
    print(f"    File:       {project_summary.uploadedFileName}")
    print(f"    Risk Score: {project_summary.riskScore}")
    print(f"    Borings:    {project_summary.totalBorings}")

    # Build water table entries
    water_table: list[WaterTableEntry] = []
    for b in borings:
        gw_text = "Not encountered"
        gw_page = b.source_pages[0] if b.source_pages else 0
        evidence = ""

        for gw in b.groundwater_observations:
            if gw.is_encountered and gw.depth is not None:
                gw_text = gw.depth_text or f"{gw.depth} ft"
                if gw.page_number:
                    gw_page = gw.page_number
                evidence = gw.notes or f"Groundwater encountered at {gw_text}"
                break
            elif not gw.is_encountered:
                gw_text = "Not encountered"
                evidence = gw.notes or "Groundwater was not encountered during drilling"
                if gw.page_number:
                    gw_page = gw.page_number

        water_table.append(WaterTableEntry(
            boringId=b.boring_id,
            groundwaterDepth=gw_text,
            pageNumber=gw_page,
            evidenceSnippet=evidence,
        ))

    # Build soil characteristics
    soil_chars: list[SoilCharacteristic] = []
    for b in borings:
        soil_types = []
        for s in b.strata:
            name = s.uscs_symbol or ""
            desc = s.material_description or ""
            if name and desc:
                soil_types.append(f"{desc} ({name})")
            elif desc:
                soil_types.append(desc)
            elif name:
                soil_types.append(name)

        refusal_str = "N/A"
        if b.refusal_depth is not None:
            refusal_str = f"{b.refusal_depth} ft"

        # Resolve boring coordinates: boring-level → site-level fallback
        boring_lat = b.latitude if b.latitude is not None else site_lat
        boring_lon = b.longitude if b.longitude is not None else site_lon

        soil_chars.append(SoilCharacteristic(
            boringId=b.boring_id,
            soilTypes=soil_types if soil_types else ["No data extracted"],
            redFlagIndicators=b.red_flag_indicators,
            refusalDepth=refusal_str,
            notes=b.notes or "",
            latitude=boring_lat,
            longitude=boring_lon,
        ))

    # Build recommendations
    slab_recs = []
    foundation_recs = []
    pavement_recs = []

    for r in extraction.recommendations:
        item = RecommendationItem(
            summary=r.summary,
            pageReferences=r.page_references,
            keywordsDetected=r.keywords,
        )
        if r.category == "slab":
            slab_recs.append(item)
        elif r.category == "pavement":
            pavement_recs.append(item)
        else:
            foundation_recs.append(item)

    recommendations = Recommendations(
        slab=slab_recs,
        foundation=foundation_recs,
        pavement=pavement_recs,
    )

    # Build risk flags
    risk_flags: list[RiskFlag] = []
    for i, f in enumerate(extraction.risk_flags, start=1):
        risk_flags.append(RiskFlag(
            id=f"rf-{i}",
            category=f.category,
            confidenceLevel=f.confidence_level,
            pageReference=f.page_reference or 0,
            evidence=f.evidence,
            description=f.description,
        ))

    print(f"\n  [BUILD_OUTPUT] Water Table Entries: {len(water_table)}")
    for wt in water_table:
        print(f"    {wt.boringId}: depth={wt.groundwaterDepth}, page={wt.pageNumber}")

    print(f"\n  [BUILD_OUTPUT] Soil Characteristics: {len(soil_chars)}")
    for sc in soil_chars:
        print(f"    {sc.boringId}: {len(sc.soilTypes)} soil types, refusal={sc.refusalDepth}, red_flags={sc.redFlagIndicators}")

    print(f"\n  [BUILD_OUTPUT] Recommendations: slab={len(slab_recs)}, foundation={len(foundation_recs)}, pavement={len(pavement_recs)}")

    print(f"\n  [BUILD_OUTPUT] Risk Flags: {len(risk_flags)}")
    for rf in risk_flags:
        print(f"    [{rf.confidenceLevel}] {rf.category}: {rf.description}")

    print(f"\n[BUILD_OUTPUT] AnalysisData assembled successfully")

    return AnalysisData(
        projectSummary=project_summary,
        waterTable=water_table,
        borings=soil_chars,
        recommendations=recommendations,
        riskFlags=risk_flags,
        chatResponses=[],  # Chat is dynamic via LLM, not pre-generated
    )


# Category severity multipliers for risk flag scoring
_CATEGORY_SEVERITY: dict[str, float] = {
    # Critical — genuinely dangerous conditions
    "Contamination": 2.0,
    "Settlement": 2.0,
    "Slope Stability": 2.0,
    # Major — significant construction impact
    "Groundwater": 1.5,
    "Dewatering": 1.5,
    "Undocumented Fill": 1.5,
    "Buried Debris": 1.5,
    # Standard — common geotechnical concerns
    "Over Excavation": 1.0,
    "Undercut": 1.0,
    "Rock": 1.0,
    "Marshland": 1.0,
    # Minor — manageable with standard practice
    "Moisture Control": 0.5,
    "Fatty Soils": 0.5,
}

_RISK_FLAG_CAP = 30  # Max points from risk flags


def _compute_risk_score(
    extraction: ExtractionResult,
    groundwater_detected: bool,
    rock_refusal_detected: bool,
) -> int:
    """Compute a 0-100 risk score based on extracted data.

    Point budget (max 100):
      Base:             10
      Groundwater:      10
      Rock/refusal:     10
      Risk flags:       30 (capped, with category weighting + diminishing returns)
      Problematic soils:15
      Red flag indicators:15
      Boring count:     10
    """
    print(f"\n  [RISK_SCORE] Computing risk score breakdown:")
    score = 10  # Base score — every report has some inherent uncertainty
    print(f"    Base score:          +10 = {score}")

    # --- Groundwater: +10 ---
    if groundwater_detected:
        score += 10
        print(f"    Groundwater:         +10 = {score}")

    # --- Rock/refusal: +10 ---
    if rock_refusal_detected:
        score += 10
        print(f"    Rock/refusal:        +10 = {score}")

    # --- Risk flags: capped at 30 ---
    # Deduplicate by category: keep highest-confidence flag per category for scoring
    # (all flags still shown in UI, this only affects score)
    best_per_category: dict[str, tuple[str, float]] = {}  # category → (confidence, weighted_pts)
    confidence_rank = {"high": 3, "medium": 2, "low": 1}
    base_points = {"high": 8, "medium": 3, "low": 1}

    high_count = sum(1 for f in extraction.risk_flags if f.confidence_level == "high")
    med_count = sum(1 for f in extraction.risk_flags if f.confidence_level == "medium")
    low_count = sum(1 for f in extraction.risk_flags if f.confidence_level == "low")

    for flag in extraction.risk_flags:
        severity = _CATEGORY_SEVERITY.get(flag.category, 1.0)
        pts = base_points.get(flag.confidence_level, 1) * severity
        rank = confidence_rank.get(flag.confidence_level, 0)

        existing = best_per_category.get(flag.category)
        if existing is None or rank > existing[0]:
            best_per_category[flag.category] = (rank, pts)

    # Sort deduped flags by points descending for diminishing returns
    sorted_flag_pts = sorted(
        (pts for _, pts in best_per_category.values()),
        reverse=True,
    )

    # First 3 flags at full value, rest at half value (diminishing returns)
    flag_points = 0.0
    for i, pts in enumerate(sorted_flag_pts):
        if i < 3:
            flag_points += pts
        else:
            flag_points += pts * 0.5

    flag_points_capped = min(round(flag_points), _RISK_FLAG_CAP)
    score += flag_points_capped
    dedup_count = len(best_per_category)
    print(f"    Risk flags ({high_count}H/{med_count}M/{low_count}L, {dedup_count} categories): +{flag_points_capped} = {score}  (raw={flag_points:.1f}, cap={_RISK_FLAG_CAP})")

    # --- Problematic soils: +15 ---
    problematic_uscs = {"CH", "OH", "PT", "MH", "OL"}
    has_problematic = False
    found_problematic: list[str] = []
    for b in extraction.borings:
        for s in b.strata:
            if s.uscs_symbol and s.uscs_symbol in problematic_uscs:
                has_problematic = True
                found_problematic.append(f"{s.uscs_symbol} in {b.boring_id}")
        if has_problematic:
            break

    if has_problematic:
        score += 15
        print(f"    Problematic soils:   +15 = {score}  ({', '.join(found_problematic)})")

    # --- Red flag indicators from borings: capped at 15 ---
    total_red_flags = sum(len(b.red_flag_indicators) for b in extraction.borings)
    red_flag_points = min(total_red_flags * 3, 15)
    score += red_flag_points
    if red_flag_points > 0:
        print(f"    Red flags ({total_red_flags}):      +{red_flag_points} = {score}")

    # --- Boring count penalty: up to +10 ---
    # Fewer borings = more uncertainty = higher risk
    num_borings = len(extraction.borings)
    if num_borings < 3:
        boring_penalty = 10
    elif num_borings < 6:
        boring_penalty = 5
    else:
        boring_penalty = 0

    if boring_penalty > 0:
        score += boring_penalty
        print(f"    Low boring count ({num_borings}): +{boring_penalty} = {score}")

    # --- Cap at 100 ---
    final = min(score, 100)
    if score > 100:
        print(f"    Capped at 100 (raw={score})")
    print(f"    FINAL RISK SCORE:    {final}")

    return final

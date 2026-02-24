import re

from src.schemas import ExtractionResult, ExtractedBoring, ExtractedStratum

# Valid USCS soil classification symbols
USCS_VALID = {
    "GW", "GP", "GM", "GC",
    "SW", "SP", "SM", "SC",
    "ML", "CL", "OL",
    "MH", "CH", "OH",
    "PT",
}

# Standard confidence level values
VALID_CONFIDENCE = {"high", "medium", "low"}


def normalize_extraction(result: ExtractionResult) -> ExtractionResult:
    """Stage 6: Normalize and validate extracted data."""
    print(f"\n{'─'*60}")
    print(f"[NORMALIZE] Starting normalization")
    print(f"  Input: {len(result.borings)} borings, {len(result.recommendations)} recs, {len(result.risk_flags)} risk flags")

    changes: list[str] = []

    # Normalize borings
    for boring in result.borings:
        old_id = boring.boring_id
        _normalize_boring(boring, changes)
        if boring.boring_id != old_id:
            changes.append(f"  Boring ID: '{old_id}' → '{boring.boring_id}'")

    # Normalize risk flag confidence levels
    for flag in result.risk_flags:
        old_level = flag.confidence_level
        level = flag.confidence_level.lower().strip()
        if level == "moderate":
            level = "medium"
            changes.append(f"  Risk flag confidence: '{old_level}' → '{level}' ({flag.category})")
        if level not in VALID_CONFIDENCE:
            changes.append(f"  Risk flag confidence invalid: '{old_level}' → 'medium' ({flag.category})")
            level = "medium"
        flag.confidence_level = level

    # Normalize recommendation categories
    valid_categories = {"slab", "foundation", "pavement"}
    for rec in result.recommendations:
        old_cat = rec.category
        cat = rec.category.lower().strip()
        if cat not in valid_categories:
            # Map common variations
            if "slab" in cat or "floor" in cat:
                cat = "slab"
            elif "pavement" in cat or "parking" in cat or "asphalt" in cat:
                cat = "pavement"
            else:
                cat = "foundation"
            changes.append(f"  Rec category: '{old_cat}' → '{cat}'")
        rec.category = cat

    if changes:
        print(f"[NORMALIZE] {len(changes)} changes made:")
        for c in changes:
            print(f"  {c}")
    else:
        print(f"[NORMALIZE] No normalization changes needed")

    print(f"[NORMALIZE] Done")
    return result


def _normalize_boring(boring: ExtractedBoring, changes: list[str]) -> None:
    """Normalize a single boring's data."""
    # Standardize boring ID
    boring.boring_id = _normalize_boring_id(boring.boring_id)

    # Normalize strata
    for stratum in boring.strata:
        _normalize_stratum(stratum, boring.boring_id, changes)

    # Sort strata by depth
    boring.strata.sort(key=lambda s: s.depth_top)

    # Validate: groundwater depth should not exceed termination depth
    if boring.termination_depth is not None:
        for gw in boring.groundwater_observations:
            if gw.depth is not None and gw.depth > boring.termination_depth:
                gw.notes = (gw.notes or "") + " [WARNING: GW depth exceeds boring depth]"
                changes.append(f"  WARNING: {boring.boring_id} GW depth {gw.depth} exceeds termination {boring.termination_depth}")


def _normalize_boring_id(raw_id: str) -> str:
    """Standardize boring IDs: B-01 -> B-1, TP-002 -> TP-2."""
    raw_id = raw_id.strip()
    match = re.match(r"^([A-Za-z]+)-?(\d+[A-Za-z]?)$", raw_id)
    if match:
        prefix = match.group(1).upper()
        number = match.group(2).lstrip("0") or "0"
        return f"{prefix}-{number}"
    return raw_id


def _normalize_stratum(stratum: ExtractedStratum, boring_id: str, changes: list[str]) -> None:
    """Normalize a single stratum's data."""
    # Validate USCS symbol
    if stratum.uscs_symbol:
        old_uscs = stratum.uscs_symbol
        uscs = stratum.uscs_symbol.upper().strip()
        # Handle dual symbols like "CL-ML" -> take first
        if "-" in uscs:
            parts = uscs.split("-")
            uscs = parts[0] if parts[0] in USCS_VALID else (
                parts[1] if len(parts) > 1 and parts[1] in USCS_VALID else None
            )
            if uscs != old_uscs:
                changes.append(f"  {boring_id} USCS dual symbol: '{old_uscs}' → '{uscs}'")
        if uscs and uscs not in USCS_VALID:
            changes.append(f"  {boring_id} USCS invalid: '{old_uscs}' → None")
            uscs = None
        stratum.uscs_symbol = uscs

    # Validate SPT N-value range (0-200 is practical range)
    if stratum.spt_n_value is not None:
        if stratum.spt_n_value < 0 or stratum.spt_n_value > 200:
            changes.append(f"  {boring_id} SPT N-value out of range: {stratum.spt_n_value} → None")
            stratum.spt_n_value = None


def parse_depth(value) -> float | None:
    """Parse depth from various text formats."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        value = value.strip().lower()
        if value in ("n/a", "not encountered", "none", ""):
            return None
        match = re.search(r"([\d.]+)", value)
        if match:
            return float(match.group(1))
    return None

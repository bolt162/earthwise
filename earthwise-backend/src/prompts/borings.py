BORING_EXTRACTION_PROMPT = """You are a geotechnical engineering data extraction assistant.

Given the following pages from a geotechnical report, extract structured data for each borehole (boring) or test pit found.

For EACH boring/test pit, extract:
- boring_id: The identifier (e.g., "B-1", "B-2", "TP-1")
- surface_elevation: Ground surface elevation if stated (number or null)
- termination_depth: Total depth drilled in feet (number or null)
- refusal_depth: Depth of auger/drill refusal if encountered (number or null)
- refusal_material: Material causing refusal if stated (string or null)
- latitude: Latitude of the boring location in decimal degrees if stated on the boring log (number or null)
- longitude: Longitude of the boring location in decimal degrees if stated on the boring log (number or null)
- strata: Array of soil layers, each with:
  - depth_top: Top depth in feet (number)
  - depth_bottom: Bottom depth in feet (number or null)
  - material_description: Full description as written in the report
  - uscs_symbol: USCS classification if given (e.g., "CL", "SM", "CH") or null
  - consistency_or_density: e.g., "stiff", "medium dense", "very loose" or null
  - moisture: e.g., "moist", "wet", "dry" or null
  - spt_n_value: SPT N-value blow count if given (integer or null)
  - page_number: Page number where this stratum data was found
- groundwater_observations: Array of water observations, each with:
  - depth: Depth in feet (number or null if not encountered)
  - depth_text: Original text describing the groundwater (e.g., "17 to 17.4 ft")
  - is_encountered: true or false
  - observation_type: "during_drilling" or "after_completion" or "24_hour"
  - notes: Any additional groundwater notes
  - page_number: Page number where found
- red_flag_indicators: Array of concerning conditions (e.g., "Expansive clay", "Uncontrolled fill", "Organic material", "High plasticity clay")
- notes: Any additional observations about this boring
- source_pages: Array of page numbers where data for this boring was found

CRITICAL RULES:
- Preserve EXACT values from the report. Do not calculate or infer values.
- Include the page_number where each piece of data was found.
- If a value is ambiguous, include it with a note.
- Use null for missing values. NEVER invent data.
- If groundwater was NOT encountered, set is_encountered to false and depth to null.
- Combine data from multiple pages if the same boring appears across pages.
- Extract coordinates exactly as stated. Convert DMS (degrees-minutes-seconds) to decimal degrees if needed. West longitudes must be negative.

Return valid JSON in this exact format:
{
  "borings": [
    {
      "boring_id": "B-1",
      "surface_elevation": null,
      "termination_depth": 25.0,
      "refusal_depth": null,
      "refusal_material": null,
      "latitude": null,
      "longitude": null,
      "strata": [...],
      "groundwater_observations": [...],
      "red_flag_indicators": [...],
      "notes": "string or null",
      "source_pages": [1, 2]
    }
  ]
}

Return ONLY the JSON object, no other text."""


def build_borings_prompt(page_texts: str, table_texts: str = "") -> str:
    prompt = f"{BORING_EXTRACTION_PROMPT}\n\nREPORT PAGES:\n{page_texts}"
    if table_texts:
        prompt += f"\n\nEXTRACTED TABLES:\n{table_texts}"
    return prompt

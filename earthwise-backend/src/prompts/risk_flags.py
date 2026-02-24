RISK_FLAGS_EXTRACTION_PROMPT = """You are a geotechnical engineering risk assessment assistant.

Given the following pages from a geotechnical report, identify ALL risk flags and concerns that could affect construction.

Risk categories to look for:
- "Over Excavation" — areas requiring removal of unsuitable material beyond design depth
- "Undercut" — areas where existing soil must be removed and replaced
- "Moisture Control" — soils requiring moisture conditioning for compaction
- "Fatty Soils" — high-plasticity clays (CH) that are difficult to work with
- "Rock" — bedrock or rock encountered at shallow depth affecting excavation
- "Marshland" — saturated soft soils, organic materials, or wetland conditions
- "Dewatering" — need for dewatering during construction due to groundwater
- "Undocumented Fill" — uncontrolled or undocumented fill material present
- "Buried Debris" — debris, rubble, or foreign materials in subsurface
- "Groundwater" — groundwater-related construction concerns
- "Contamination" — environmental contamination indicators
- "Settlement" — settlement concerns for structures or pavements
- "Slope Stability" — slope or lateral earth pressure concerns

For EACH risk flag, extract:
- category: One of the categories above (use the closest match)
- confidence_level: "high" (explicitly stated in report), "medium" (strongly implied), or "low" (possible based on soil conditions)
- description: What the risk is and why it matters (1-2 sentences)
- evidence: The specific text from the report that supports this flag (direct quote or close paraphrase, max 2 sentences)
- page_reference: Page number where the primary evidence was found

RULES:
- Only flag risks that are supported by evidence in the text.
- Prefer "high" confidence when the report explicitly calls out a risk or concern.
- Prefer "medium" when the report describes conditions that typically cause issues.
- Prefer "low" when conditions are present but the report doesn't flag them as concerns.
- Do NOT invent risks not supported by the text.

Return valid JSON in this exact format:
{
  "risk_flags": [
    {
      "category": "Groundwater",
      "confidence_level": "high",
      "description": "Groundwater encountered at 12.5 feet in multiple borings. Dewatering may be required for deep excavations.",
      "evidence": "Groundwater was encountered at depths ranging from 12.5 to 17.0 feet below existing grades during our exploration.",
      "page_reference": 8
    }
  ]
}

Return ONLY the JSON object, no other text."""


def build_risk_flags_prompt(page_texts: str) -> str:
    return f"{RISK_FLAGS_EXTRACTION_PROMPT}\n\nREPORT PAGES:\n{page_texts}"

RECOMMENDATIONS_EXTRACTION_PROMPT = """You are a geotechnical engineering data extraction assistant.

Given the following pages from a geotechnical report (recommendations and design sections), extract all engineering recommendations.

Categorize each recommendation into one of these categories:
- "slab" — slab-on-grade, floor slab recommendations
- "foundation" — foundation design, footing, pier, pile recommendations
- "pavement" — pavement section, parking, driveway recommendations

For EACH recommendation, extract:
- category: "slab", "foundation", or "pavement"
- summary: A concise summary of the recommendation (1-3 sentences)
- page_references: Array of page numbers where this recommendation appears
- keywords: Array of key technical terms found (e.g., "bearing capacity", "subgrade modulus", "minimum embedment", "moisture conditioning")

RULES:
- Extract recommendations EXACTLY as stated in the report.
- If a recommendation spans multiple topics, create separate entries per category.
- Include specific numeric values in the summary (e.g., "Allowable bearing pressure of 3,000 psf").
- If a recommendation doesn't fit slab/foundation/pavement, categorize it as the closest match.
- Include ALL page numbers where each recommendation's content appears.

Return valid JSON in this exact format:
{
  "recommendations": [
    {
      "category": "foundation",
      "summary": "Use spread footings with minimum embedment depth of 3 feet below finished grade. Allowable bearing pressure of 3,000 psf.",
      "page_references": [15, 16],
      "keywords": ["spread footing", "bearing pressure", "embedment depth"]
    }
  ]
}

Return ONLY the JSON object, no other text."""


def build_recommendations_prompt(page_texts: str) -> str:
    return f"{RECOMMENDATIONS_EXTRACTION_PROMPT}\n\nREPORT PAGES:\n{page_texts}"

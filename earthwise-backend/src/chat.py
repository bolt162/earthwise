from openai import OpenAI
from sqlalchemy.orm import Session

from src.config import settings
from src.models import Report, Page


CHAT_SYSTEM_PROMPT = """You are a geotechnical engineering assistant analyzing a specific geotechnical report.

Answer the user's question based ONLY on the report data provided below.
- Cite specific page numbers when referencing information.
- If the answer is not in the provided report data, say "I don't have enough information from this report to answer that question."
- Be concise and technical. Use geotechnical terminology appropriately.
- Do NOT fabricate data or make assumptions beyond what's stated in the report."""


def handle_chat(message: str, report: Report, db: Session) -> str:
    """RAG-based chat: retrieve relevant pages, send to LLM with the question."""

    if not report or report.status != "completed":
        return "No report has been analyzed yet. Please upload and process a report first."

    # Retrieve all pages for this report
    pages = (
        db.query(Page)
        .filter_by(report_id=report.id)
        .order_by(Page.page_number)
        .all()
    )

    if not pages:
        return "No extracted text available for this report."

    # Simple keyword relevance scoring
    question_terms = set(message.lower().split())
    scored_pages = []
    for page in pages:
        page_terms = set(page.raw_text.lower().split())
        overlap = len(question_terms & page_terms)
        scored_pages.append((page, overlap))

    scored_pages.sort(key=lambda x: x[1], reverse=True)

    # Take top 10 most relevant pages
    top_pages = scored_pages[:10]

    context_text = "\n\n".join(
        f"[Page {p.page_number} — Section: {p.section_label or 'unknown'}]\n{p.raw_text[:3000]}"
        for p, _ in top_pages
    )

    # Include the cached analysis summary if available
    analysis_summary = ""
    if report.analysis_json:
        analysis_summary = f"\n\nSTRUCTURED ANALYSIS SUMMARY:\n{report.analysis_json[:4000]}"

    user_prompt = f"""REPORT: {report.project_name or report.original_filename}

RELEVANT REPORT SECTIONS:
{context_text}
{analysis_summary}

USER QUESTION: {message}"""

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": CHAT_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,
        max_tokens=2048,
    )

    return response.choices[0].message.content or "Unable to generate a response."

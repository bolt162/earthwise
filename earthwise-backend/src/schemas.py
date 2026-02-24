from pydantic import BaseModel


# ── Frontend-compatible shapes (must match src/types/index.ts) ──


class ProjectSummary(BaseModel):
    projectName: str
    uploadedFileName: str
    dateAnalyzed: str
    riskScore: int
    totalBorings: int
    groundwaterDetected: bool
    rockRefusalDetected: bool


class WaterTableEntry(BaseModel):
    boringId: str
    groundwaterDepth: str
    pageNumber: int
    evidenceSnippet: str


class SoilCharacteristic(BaseModel):
    boringId: str
    soilTypes: list[str]
    redFlagIndicators: list[str]
    refusalDepth: str
    notes: str


class RecommendationItem(BaseModel):
    summary: str
    pageReferences: list[int]
    keywordsDetected: list[str]


class Recommendations(BaseModel):
    slab: list[RecommendationItem]
    foundation: list[RecommendationItem]
    pavement: list[RecommendationItem]


class RiskFlag(BaseModel):
    id: str
    category: str
    confidenceLevel: str  # high | medium | low
    pageReference: int
    evidence: str
    description: str


class ChatResponseItem(BaseModel):
    trigger: str
    response: str


class AnalysisData(BaseModel):
    projectSummary: ProjectSummary
    waterTable: list[WaterTableEntry]
    borings: list[SoilCharacteristic]
    recommendations: Recommendations
    riskFlags: list[RiskFlag]
    chatResponses: list[ChatResponseItem]


# ── API request/response schemas ──


class UploadResponse(BaseModel):
    reportId: int
    jobId: int
    status: str
    fileName: str


class JobStatus(BaseModel):
    jobId: int
    reportId: int
    status: str
    currentStage: str | None = None
    progressPercent: int = 0


class AnalyzeRequest(BaseModel):
    fileName: str


class ChatRequest(BaseModel):
    message: str
    context: str | None = None


class ChatResponse(BaseModel):
    response: str


# ── Internal intermediate extraction shapes ──


class ExtractedMetadata(BaseModel):
    project_name: str | None = None
    client_name: str | None = None
    firm_name: str | None = None
    report_date: str | None = None
    location: str | None = None


class ExtractedStratum(BaseModel):
    depth_top: float
    depth_bottom: float | None = None
    material_description: str
    uscs_symbol: str | None = None
    consistency_or_density: str | None = None
    moisture: str | None = None
    spt_n_value: int | None = None
    page_number: int | None = None


class ExtractedGroundwater(BaseModel):
    depth: float | None = None
    depth_text: str | None = None
    is_encountered: bool = True
    observation_type: str = "during_drilling"
    notes: str | None = None
    page_number: int | None = None


class ExtractedBoring(BaseModel):
    boring_id: str
    surface_elevation: float | None = None
    termination_depth: float | None = None
    refusal_depth: float | None = None
    refusal_material: str | None = None
    strata: list[ExtractedStratum] = []
    groundwater_observations: list[ExtractedGroundwater] = []
    red_flag_indicators: list[str] = []
    notes: str | None = None
    source_pages: list[int] = []


class ExtractedRecommendation(BaseModel):
    category: str  # slab | foundation | pavement
    summary: str
    page_references: list[int] = []
    keywords: list[str] = []


class ExtractedRiskFlag(BaseModel):
    category: str
    confidence_level: str  # high | medium | low
    description: str
    evidence: str
    page_reference: int | None = None


class ExtractionResult(BaseModel):
    metadata: ExtractedMetadata = ExtractedMetadata()
    borings: list[ExtractedBoring] = []
    recommendations: list[ExtractedRecommendation] = []
    risk_flags: list[ExtractedRiskFlag] = []

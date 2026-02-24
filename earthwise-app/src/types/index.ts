export interface ProjectSummary {
  projectName: string;
  uploadedFileName: string;
  dateAnalyzed: string;
  riskScore: number;
  totalBorings: number;
  groundwaterDetected: boolean;
  rockRefusalDetected: boolean;
}

export interface WaterTableEntry {
  boringId: string;
  groundwaterDepth: string;
  pageNumber: number;
  evidenceSnippet: string;
}

export interface SoilCharacteristic {
  boringId: string;
  soilTypes: string[];
  redFlagIndicators: string[];
  refusalDepth: string;
  notes: string;
}

export interface RecommendationItem {
  summary: string;
  pageReferences: number[];
  keywordsDetected: string[];
}

export interface Recommendations {
  slab: RecommendationItem[];
  foundation: RecommendationItem[];
  pavement: RecommendationItem[];
}

export interface RiskFlag {
  id: string;
  category: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  pageReference: number;
  evidence: string;
  description: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  trigger: string;
  response: string;
}

export interface AnalysisData {
  projectSummary: ProjectSummary;
  waterTable: WaterTableEntry[];
  borings: SoilCharacteristic[];
  recommendations: Recommendations;
  riskFlags: RiskFlag[];
  chatResponses: ChatResponse[];
}

export type AppMode = 'mock' | 'backend';

export type SidebarPage =
  | 'projects'
  | 'dashboard'
  | 'borelogs'
  | 'recommendations'
  | 'riskflags'
  | 'chat'
  | 'settings';

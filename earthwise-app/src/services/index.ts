import { isMockMode, MOCK_FILE_MAP, appConfig } from '../config';
import type { AnalysisData } from '../types';

const mockModules: Record<string, () => Promise<{ default: AnalysisData }>> = {
  geotech_report1: () => import('../mock-data/geotech_report1.json'),
  geotech_report2: () => import('../mock-data/geotech_report2.json'),
  geotech_report3: () => import('../mock-data/geotech_report3.json'),
  geotech_report4: () => import('../mock-data/geotech_report4.json'),
};

export async function loadAnalysisData(fileName: string): Promise<AnalysisData> {
  if (isMockMode()) {
    return loadMockData(fileName);
  }
  return fetchAnalysisFromBackend(fileName);
}

async function loadMockData(fileName: string): Promise<AnalysisData> {
  const mockKey = MOCK_FILE_MAP[fileName];
  if (!mockKey) {
    throw new Error(
      `No mock data available for "${fileName}". Supported files: ${Object.keys(MOCK_FILE_MAP).join(', ')}`
    );
  }

  const loader = mockModules[mockKey];
  if (!loader) {
    throw new Error(`Mock data loader not found for "${mockKey}"`);
  }

  const module = await loader();
  return module.default;
}

async function fetchAnalysisFromBackend(fileName: string): Promise<AnalysisData> {
  const response = await fetch(`${appConfig.apiBaseUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName }),
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  return response.json();
}

export async function sendChatMessage(
  message: string,
  _context?: string
): Promise<string> {
  if (isMockMode()) {
    return getMockChatResponse(message);
  }
  return fetchChatFromBackend(message, _context);
}

function getMockChatResponse(message: string): string {
  const lowered = message.toLowerCase();

  if (lowered.includes('water') || lowered.includes('groundwater')) {
    return 'Based on the geotechnical report, groundwater was encountered in multiple borings at varying depths. The water table appears to fluctuate seasonally. I recommend reviewing the Water Table Analysis section for detailed boring-by-boring data.';
  }
  if (lowered.includes('soil') || lowered.includes('clay') || lowered.includes('sand')) {
    return 'The report identifies several soil types across the borings, including lean clay (CL), sandy clay, and silty sand. Some borings show potentially expansive clay layers that may require special foundation considerations.';
  }
  if (lowered.includes('foundation') || lowered.includes('slab')) {
    return 'The report recommends a drilled pier foundation system given the soil conditions. Slab-on-grade construction should account for the expansive clay with proper moisture conditioning. See the Recommendations section for full details.';
  }
  if (lowered.includes('risk') || lowered.includes('flag')) {
    return 'Several risk flags were identified: potential for over-excavation due to soft upper soils, moisture control requirements for expansive clays, and possible dewatering needs in areas where groundwater is shallow.';
  }
  if (lowered.includes('rock') || lowered.includes('refusal')) {
    return 'Auger refusal was encountered in some borings, typically at depths between 15-25 feet. This may indicate weathered rock or dense gravel layers. Core sampling may be needed for deeper investigations.';
  }

  return 'I can help you analyze this geotechnical report. Try asking about groundwater levels, soil conditions, foundation recommendations, risk flags, or rock/refusal depths.';
}

async function fetchChatFromBackend(
  message: string,
  context?: string
): Promise<string> {
  const response = await fetch(`${appConfig.apiBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

import { isMockMode, MOCK_FILE_MAP, appConfig } from '../config';
import type { AnalysisData } from '../types';
import { getOrCreateSessionId } from '../utils/session';

const mockModules: Record<string, () => Promise<{ default: AnalysisData }>> = {
  geotech_report1: () => import('../mock-data/geotech_report1.json'),
  geotech_report2: () => import('../mock-data/geotech_report2.json'),
  geotech_report3: () => import('../mock-data/geotech_report3.json'),
  geotech_report4: () => import('../mock-data/geotech_report4.json'),
};

// ── Shared headers ──

function getSessionHeaders(): Record<string, string> {
  return { 'X-Session-ID': getOrCreateSessionId() };
}

function getJsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', ...getSessionHeaders() };
}

// ── Backend API response types ──

interface UploadResponse {
  reportId: number;
  jobId: number;
  status: string;
  fileName: string;
}

interface JobStatusResponse {
  jobId: number;
  reportId: number;
  status: string;
  currentStage: string | null;
  progressPercent: number;
}

interface SessionInfoResponse {
  sessionId: string;
  uploadCount: number;
  createdAt: string;
}

// ── Session info ──

export async function fetchSessionInfo(): Promise<SessionInfoResponse> {
  const response = await fetch(`${appConfig.apiBaseUrl}/api/session`, {
    headers: getSessionHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch session info: ${response.statusText}`);
  }

  return response.json();
}

// ── Upload & polling for backend mode ──

export async function uploadFileToBackend(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${appConfig.apiBaseUrl}/api/upload`, {
    method: 'POST',
    headers: getSessionHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Upload failed: ${detail}`);
  }

  return response.json();
}

export async function pollJobUntilComplete(
  jobId: number,
  onProgress?: (stage: string | null, percent: number) => void
): Promise<void> {
  const POLL_INTERVAL = 2000;
  const TIMEOUT = 10 * 60 * 1000; // 10 minutes
  const startTime = Date.now();

  while (true) {
    const response = await fetch(`${appConfig.apiBaseUrl}/api/jobs/${jobId}`, {
      headers: getSessionHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to check job status: ${response.statusText}`);
    }

    const job: JobStatusResponse = await response.json();

    onProgress?.(job.currentStage, job.progressPercent);

    if (job.status === 'completed') {
      return;
    }

    if (job.status === 'failed') {
      throw new Error('Pipeline processing failed. Check backend logs for details.');
    }

    if (Date.now() - startTime > TIMEOUT) {
      throw new Error('Processing timed out after 10 minutes.');
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
}

// ── Main data loading ──

export async function loadAnalysisData(
  fileOrName: string | File,
  onProgress?: (stage: string | null, percent: number) => void
): Promise<AnalysisData> {
  if (isMockMode()) {
    const fileName = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;
    return loadMockData(fileName);
  }

  // Backend mode
  if (fileOrName instanceof File) {
    const uploadResult = await uploadFileToBackend(fileOrName);

    // If already completed (duplicate hash), skip polling
    if (uploadResult.status !== 'completed') {
      await pollJobUntilComplete(uploadResult.jobId, onProgress);
    }

    return fetchAnalysisFromBackend(uploadResult.fileName);
  }

  // String filename — direct fetch (backward compat)
  return fetchAnalysisFromBackend(fileOrName);
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
    headers: getJsonHeaders(),
    body: JSON.stringify({ fileName }),
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  return response.json();
}

// ── Chat ──

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
    headers: getJsonHeaders(),
    body: JSON.stringify({ message, context }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

// ── Feedback & Waitlist ──

export async function submitFeedback(data: {
  rating?: number;
  comment?: string;
  email?: string;
  reportName?: string;
}): Promise<void> {
  await fetch(`${appConfig.apiBaseUrl}/api/feedback`, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: JSON.stringify(data),
  });
}

export async function submitWaitlist(
  email: string,
  source: string
): Promise<void> {
  await fetch(`${appConfig.apiBaseUrl}/api/waitlist`, {
    method: 'POST',
    headers: getJsonHeaders(),
    body: JSON.stringify({ email, source }),
  });
}

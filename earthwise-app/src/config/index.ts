import type { AppMode } from '../types';

export const appConfig = {
  mode: (import.meta.env.VITE_APP_MODE || 'mock') as AppMode,
  clerkPublishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
};

export const isMockMode = () => appConfig.mode === 'mock';
export const isBackendMode = () => appConfig.mode === 'backend';

export const MOCK_FILE_MAP: Record<string, string> = {
  'geotech_report1.pdf': 'geotech_report1',
  'geotech_report2.pdf': 'geotech_report2',
  'geotech_report3.pdf': 'geotech_report3',
  'geotech_report4.pdf': 'geotech_report4',
};

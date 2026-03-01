import { create } from 'zustand';
import type { AnalysisData, ChatMessage, SidebarPage } from '../types';
import { appConfig } from '../config';
import { getOrCreateSessionId } from '../utils/session';

interface AppState {
  // Environment
  environmentMode: typeof appConfig.mode;

  // Session
  sessionId: string;
  uploadCount: number;

  // Project state
  currentProject: string | null;
  uploadedFileName: string | null;
  analysisData: AnalysisData | null;

  // UI state
  activePage: SidebarPage;
  isSidebarOpen: boolean;
  isChatOpen: boolean;
  isLoading: boolean;
  error: string | null;

  // Feedback state
  feedbackDismissedFor: string | null;

  // Chat state
  chatMessages: ChatMessage[];

  // Actions
  setCurrentProject: (project: string | null) => void;
  setUploadedFileName: (fileName: string | null) => void;
  setAnalysisData: (data: AnalysisData | null) => void;
  setActivePage: (page: SidebarPage) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  resetProject: () => void;
  setUploadCount: (count: number) => void;
  incrementUploadCount: () => void;
  setFeedbackDismissed: (reportName: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  environmentMode: appConfig.mode,

  sessionId: getOrCreateSessionId(),
  uploadCount: 0,

  currentProject: null,
  uploadedFileName: null,
  analysisData: null,

  activePage: 'dashboard',
  isSidebarOpen: true,
  isChatOpen: false,
  isLoading: false,
  error: null,

  feedbackDismissedFor: null,

  chatMessages: [],

  setCurrentProject: (project) => set({ currentProject: project }),
  setUploadedFileName: (fileName) => set({ uploadedFileName: fileName }),
  setAnalysisData: (data) => set({ analysisData: data }),
  setActivePage: (page) => set({ activePage: page }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  setChatOpen: (open) => set({ isChatOpen: open }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  clearChatMessages: () => set({ chatMessages: [] }),
  resetProject: () =>
    set({
      currentProject: null,
      uploadedFileName: null,
      analysisData: null,
      chatMessages: [],
      error: null,
    }),
  setUploadCount: (count) => set({ uploadCount: count }),
  incrementUploadCount: () =>
    set((state) => ({ uploadCount: state.uploadCount + 1 })),
  setFeedbackDismissed: (reportName) =>
    set({ feedbackDismissedFor: reportName }),
}));

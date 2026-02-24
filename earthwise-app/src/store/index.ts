import { create } from 'zustand';
import type { AnalysisData, ChatMessage, SidebarPage } from '../types';
import { appConfig } from '../config';

interface AppState {
  // Environment
  environmentMode: typeof appConfig.mode;

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
}

export const useAppStore = create<AppState>((set) => ({
  environmentMode: appConfig.mode,

  currentProject: null,
  uploadedFileName: null,
  analysisData: null,

  activePage: 'dashboard',
  isSidebarOpen: true,
  isChatOpen: false,
  isLoading: false,
  error: null,

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
}));

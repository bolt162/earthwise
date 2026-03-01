import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import BoreLogsPage from './pages/BoreLogsPage';
import RecommendationsPage from './pages/RecommendationsPage';
import RiskFlagsPage from './pages/RiskFlagsPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/borelogs" element={<BoreLogsPage />} />
      <Route path="/recommendations" element={<RecommendationsPage />} />
      <Route path="/riskflags" element={<RiskFlagsPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Landing page — standalone, no layout wrapper */}
        <Route path="/" element={<LandingPage />} />

        {/* App pages — wrapped in MainLayout */}
        <Route
          path="/*"
          element={
            <MainLayout>
              <AppRoutes />
            </MainLayout>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

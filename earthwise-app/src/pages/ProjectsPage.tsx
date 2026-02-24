import FileUpload from '../components/FileUpload';
import { useAppStore } from '../store';
import { FileText, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProjectsPage() {
  const analysisData = useAppStore((s) => s.analysisData);
  const uploadedFileName = useAppStore((s) => s.uploadedFileName);
  const resetProject = useAppStore((s) => s.resetProject);
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <h1
        className="text-2xl font-bold text-[var(--text-primary)] mb-6"
        style={{ fontFamily: 'var(--font-oswald)' }}
      >
        Projects
      </h1>

      {/* Current project */}
      {analysisData && (
        <div className="mb-8 bg-[var(--card-bg)] rounded-lg shadow-lg p-6">
          <h2
            className="text-lg font-semibold text-[var(--text-primary)] mb-4"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Current Project
          </h2>
          <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
            <div className="flex items-center">
              <FileText
                size={24}
                className="text-[var(--accent-color)] mr-3"
              />
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {analysisData.projectSummary.projectName}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {uploadedFileName} &middot; Analyzed{' '}
                  {analysisData.projectSummary.dateAnalyzed}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1.5 text-sm rounded-md bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={resetProject}
                className="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--error-color)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload section */}
      <div className="bg-[var(--card-bg)] rounded-lg shadow-lg p-6">
        <h2
          className="text-lg font-semibold text-[var(--text-primary)] mb-4"
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          {analysisData ? 'Load Another Report' : 'Upload a Report'}
        </h2>
        <FileUpload />
      </div>
    </div>
  );
}

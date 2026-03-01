import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { loadAnalysisData } from '../services';
import { isMockMode, MOCK_FILE_MAP } from '../config';

const STAGE_LABELS: Record<string, string> = {
  ingest: 'Ingesting PDF',
  text_extract: 'Extracting text',
  table_extract: 'Extracting tables',
  section_detect: 'Detecting sections',
  llm_extract: 'AI analysis in progress',
  normalize: 'Normalizing data',
  build_output: 'Building results',
};

export default function FileUpload() {
  const navigate = useNavigate();
  const setUploadedFileName = useAppStore((s) => s.setUploadedFileName);
  const setAnalysisData = useAppStore((s) => s.setAnalysisData);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);
  const clearChatMessages = useAppStore((s) => s.clearChatMessages);
  const incrementUploadCount = useAppStore((s) => s.incrementUploadCount);

  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [progressInfo, setProgressInfo] = useState<{
    stage: string | null;
    percent: number;
  }>({ stage: null, percent: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mockMode = isMockMode();
  const supportedFiles = Object.keys(MOCK_FILE_MAP);

  const handleFile = async (file: File) => {
    const fileName = file.name;

    // In mock mode, only accept known mock files
    if (mockMode && !MOCK_FILE_MAP[fileName]) {
      setUploadState('error');
      setErrorMessage(
        `"${fileName}" is not a recognized report. Supported files: ${supportedFiles.join(', ')}`
      );
      return;
    }

    // In backend mode, only accept PDFs
    if (!mockMode && !fileName.toLowerCase().endsWith('.pdf')) {
      setUploadState('error');
      setErrorMessage('Only PDF files are accepted.');
      return;
    }

    // File size limit: 10 MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (!mockMode && file.size > MAX_FILE_SIZE) {
      setUploadState('error');
      setErrorMessage('File exceeds 10 MB limit. Please upload a smaller file.');
      return;
    }

    setUploadState('uploading');
    setProgressInfo({ stage: null, percent: 0 });
    setLoading(true);
    setError(null);
    clearChatMessages();

    try {
      // In backend mode, pass the File object so it gets uploaded
      // In mock mode, pass the filename string
      const data = await loadAnalysisData(
        mockMode ? fileName : file,
        (stage, percent) => setProgressInfo({ stage, percent })
      );
      setUploadedFileName(fileName);
      setAnalysisData(data);
      setCurrentProject(data.projectSummary.projectName);
      incrementUploadCount();
      setUploadState('success');

      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (err) {
      setUploadState('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to load analysis data'
      );
      setError(
        err instanceof Error ? err.message : 'Failed to load analysis data'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const stageLabel = progressInfo.stage
    ? STAGE_LABELS[progressInfo.stage] || progressInfo.stage
    : 'Processing geotechnical data';

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
          dragActive
            ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10'
            : 'border-[var(--border-color)] hover:border-[var(--accent-color)]'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleChange}
          className="hidden"
        />

        {uploadState === 'idle' && (
          <>
            <Upload
              size={40}
              className="mx-auto mb-4 text-[var(--text-muted)]"
            />
            <p
              className="text-lg font-medium text-[var(--text-primary)] mb-2"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Upload Geotechnical Report
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Drag and drop a PDF file or click to browse
            </p>
            {mockMode && (
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Supported: {supportedFiles.join(', ')}
              </p>
            )}
          </>
        )}

        {uploadState === 'uploading' && (
          <>
            <div className="w-10 h-10 mx-auto mb-4 border-4 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin" />
            <p
              className="text-lg font-medium text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Analyzing Report...
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {stageLabel}
            </p>
            {!mockMode && progressInfo.percent > 0 && (
              <div className="mt-3 w-full max-w-xs mx-auto">
                <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-color)] rounded-full transition-all duration-500"
                    style={{ width: `${progressInfo.percent}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {progressInfo.percent}%
                </p>
              </div>
            )}
          </>
        )}

        {uploadState === 'success' && (
          <>
            <CheckCircle
              size={40}
              className="mx-auto mb-4 text-[var(--success-color)]"
            />
            <p
              className="text-lg font-medium text-[var(--success-color)]"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Analysis Complete
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Redirecting to dashboard...
            </p>
          </>
        )}

        {uploadState === 'error' && (
          <>
            <AlertCircle
              size={40}
              className="mx-auto mb-4 text-[var(--error-color)]"
            />
            <p
              className="text-lg font-medium text-[var(--error-color)]"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Upload Failed
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {errorMessage}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUploadState('idle');
                setErrorMessage('');
              }}
              className="mt-3 px-4 py-2 bg-[var(--accent-color)] text-white rounded-md text-sm hover:bg-[var(--accent-hover)] transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>

      {/* Quick load buttons — only in mock mode */}
      {mockMode && (
        <div className="mt-6">
          <p
            className="text-sm text-[var(--text-muted)] mb-3 text-center"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Or load a sample report:
          </p>
          <div className="grid grid-cols-2 gap-3">
            {supportedFiles.map((file) => (
              <button
                key={file}
                onClick={() => {
                  const mockFile = new File([], file, {
                    type: 'application/pdf',
                  });
                  handleFile(mockFile);
                }}
                className="flex items-center px-3 py-2 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm hover:bg-[var(--accent-color)] hover:text-white transition-colors"
              >
                <FileText size={16} className="mr-2 flex-shrink-0" />
                <span className="truncate">{file}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

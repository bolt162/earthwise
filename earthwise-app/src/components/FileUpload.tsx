import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { loadAnalysisData } from '../services';
import { MOCK_FILE_MAP } from '../config';

export default function FileUpload() {
  const navigate = useNavigate();
  const setUploadedFileName = useAppStore((s) => s.setUploadedFileName);
  const setAnalysisData = useAppStore((s) => s.setAnalysisData);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);
  const clearChatMessages = useAppStore((s) => s.clearChatMessages);

  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFiles = Object.keys(MOCK_FILE_MAP);

  const handleFile = async (file: File) => {
    const fileName = file.name;

    if (!MOCK_FILE_MAP[fileName]) {
      setUploadState('error');
      setErrorMessage(
        `"${fileName}" is not a recognized report. Supported files: ${supportedFiles.join(', ')}`
      );
      return;
    }

    setUploadState('uploading');
    setLoading(true);
    setError(null);
    clearChatMessages();

    try {
      const data = await loadAnalysisData(fileName);
      setUploadedFileName(fileName);
      setAnalysisData(data);
      setCurrentProject(data.projectSummary.projectName);
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
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Supported: {supportedFiles.join(', ')}
            </p>
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
              Processing geotechnical data
            </p>
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

      {/* Quick load buttons for demo */}
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
    </div>
  );
}

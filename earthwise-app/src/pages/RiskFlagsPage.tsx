import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  ChevronDown,
  ChevronUp,
  Shovel,
  Droplets,
  Wind,
  Mountain,
  Waves,
  AlertTriangle,
  Construction,
} from 'lucide-react';
import { useAppStore } from '../store';
import EmptyState from '../components/EmptyState';
import type { RiskFlag } from '../types';

const categoryIcons: Record<string, React.ReactNode> = {
  'Over Excavation': <Shovel size={20} />,
  'Undercut': <Construction size={20} />,
  'Moisture Control': <Droplets size={20} />,
  'Fatty Soils': <Wind size={20} />,
  'Rock': <Mountain size={20} />,
  'Marshland': <Waves size={20} />,
  'Dewatering': <Droplets size={20} />,
};

export default function RiskFlagsPage() {
  const analysisData = useAppStore((s) => s.analysisData);
  const navigate = useNavigate();

  if (!analysisData) {
    return (
      <EmptyState
        title="No Report Loaded"
        description="Upload a geotechnical report to view risk flags and hazard assessments."
        action={
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center px-4 py-2 bg-[var(--accent-color)] text-white rounded-md hover:bg-[var(--accent-hover)] transition-colors"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            <Upload size={16} className="mr-2" />
            Upload Report
          </button>
        }
      />
    );
  }

  const { riskFlags } = analysisData;

  const highCount = riskFlags.filter((f) => f.confidenceLevel === 'high').length;
  const medCount = riskFlags.filter((f) => f.confidenceLevel === 'medium').length;
  const lowCount = riskFlags.filter((f) => f.confidenceLevel === 'low').length;

  return (
    <div className="animate-fade-in">
      <h1
        className="text-2xl font-bold text-[var(--text-primary)] mb-6"
        style={{ fontFamily: 'var(--font-oswald)' }}
      >
        Risk Flags
      </h1>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--card-bg)] rounded-lg shadow-lg p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-[var(--error-color)]/20">
            <AlertTriangle size={20} className="text-[var(--error-color)]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--error-color)]" style={{ fontFamily: 'var(--font-oswald)' }}>
              {highCount}
            </p>
            <p className="text-xs text-[var(--text-muted)]">High Confidence</p>
          </div>
        </div>
        <div className="bg-[var(--card-bg)] rounded-lg shadow-lg p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-[var(--warning-color)]/20">
            <AlertTriangle size={20} className="text-[var(--warning-color)]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--warning-color)]" style={{ fontFamily: 'var(--font-oswald)' }}>
              {medCount}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Medium Confidence</p>
          </div>
        </div>
        <div className="bg-[var(--card-bg)] rounded-lg shadow-lg p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-[var(--success-color)]/20">
            <AlertTriangle size={20} className="text-[var(--success-color)]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--success-color)]" style={{ fontFamily: 'var(--font-oswald)' }}>
              {lowCount}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Low Confidence</p>
          </div>
        </div>
      </div>

      {/* Flags list */}
      <div className="space-y-4">
        {riskFlags.map((flag) => (
          <RiskFlagCard key={flag.id} flag={flag} />
        ))}
        {riskFlags.length === 0 && (
          <div className="bg-[var(--card-bg)] rounded-lg shadow-lg p-8 text-center">
            <p className="text-[var(--text-muted)]">
              No risk flags detected in this report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RiskFlagCard({ flag }: { flag: RiskFlag }) {
  const [expanded, setExpanded] = useState(false);

  const confidenceColor =
    flag.confidenceLevel === 'high'
      ? 'var(--error-color)'
      : flag.confidenceLevel === 'medium'
        ? 'var(--warning-color)'
        : 'var(--success-color)';

  const icon = categoryIcons[flag.category] || (
    <AlertTriangle size={20} />
  );

  return (
    <div className="bg-[var(--card-bg)] rounded-lg shadow-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-md"
            style={{ backgroundColor: `${confidenceColor}20` }}
          >
            <span style={{ color: confidenceColor }}>{icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="font-medium text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-oswald)' }}
              >
                {flag.category}
              </span>
              <span
                className="px-2 py-0.5 text-xs rounded-full font-medium"
                style={{
                  backgroundColor: `${confidenceColor}20`,
                  color: confidenceColor,
                }}
              >
                {flag.confidenceLevel}
              </span>
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {flag.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)]">
            p. {flag.pageReference}
          </span>
          {expanded ? (
            <ChevronUp size={16} className="text-[var(--text-muted)]" />
          ) : (
            <ChevronDown size={16} className="text-[var(--text-muted)]" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border-color)] pt-3">
          <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
            Evidence
          </p>
          <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-3 rounded-md">
            {flag.evidence}
          </p>
        </div>
      )}
    </div>
  );
}

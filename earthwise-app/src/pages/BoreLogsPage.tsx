import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { useAppStore } from '../store';
import EmptyState from '../components/EmptyState';

export default function BoreLogsPage() {
  const analysisData = useAppStore((s) => s.analysisData);
  const navigate = useNavigate();

  if (!analysisData) {
    return (
      <EmptyState
        title="No Report Loaded"
        description="Upload a geotechnical report to view bore log data and soil characteristics."
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

  const { waterTable, borings } = analysisData;

  return (
    <div className="animate-fade-in">
      <h1
        className="text-2xl font-bold text-[var(--text-primary)] mb-6"
        style={{ fontFamily: 'var(--font-oswald)' }}
      >
        Bore Logs
      </h1>

      {/* Water Table */}
      <div className="bg-[var(--card-bg)] rounded-lg shadow-lg mb-6">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2
            className="font-semibold text-lg text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Water Table Analysis
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-tertiary)]">
              <tr>
                {['Boring ID', 'Groundwater Depth', 'Page #', 'Evidence Snippet'].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium text-[var(--text-primary)] uppercase tracking-wider"
                    style={{ fontFamily: 'var(--font-oswald)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {waterTable.map((entry) => (
                <tr
                  key={entry.boringId}
                  className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-[var(--accent-color)]">
                    {entry.boringId}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                    {entry.groundwaterDepth}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    p. {entry.pageNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {entry.evidenceSnippet}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Soil Characteristics */}
      <div className="bg-[var(--card-bg)] rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h2
            className="font-semibold text-lg text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Soil Characteristics
          </h2>
        </div>
        <div className="p-4 space-y-4">
          {borings.map((boring) => (
            <BoringCard key={boring.boringId} boring={boring} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BoringCard({
  boring,
}: {
  boring: {
    boringId: string;
    soilTypes: string[];
    redFlagIndicators: string[];
    refusalDepth: string;
    notes: string;
  };
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg bg-[var(--bg-tertiary)] overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span
            className="font-medium text-[var(--accent-color)]"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            {boring.boringId}
          </span>
          <div className="flex flex-wrap gap-1">
            {boring.soilTypes.map((type) => (
              <span
                key={type}
                className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
              >
                {type}
              </span>
            ))}
          </div>
          {boring.redFlagIndicators.length > 0 && (
            <AlertTriangle size={16} className="text-[var(--warning-color)]" />
          )}
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-[var(--text-muted)]" />
        ) : (
          <ChevronDown size={16} className="text-[var(--text-muted)]" />
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border-color)] pt-3 space-y-3">
          {boring.redFlagIndicators.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
                Red Flag Indicators
              </p>
              <div className="flex flex-wrap gap-1">
                {boring.redFlagIndicators.map((flag) => (
                  <span
                    key={flag}
                    className="px-2 py-0.5 text-xs rounded-full bg-[var(--error-color)]/20 text-[var(--error-color)]"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
              Refusal Depth
            </p>
            <p className="text-sm text-[var(--text-primary)]">
              {boring.refusalDepth}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] mb-1">
              Notes
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {boring.notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

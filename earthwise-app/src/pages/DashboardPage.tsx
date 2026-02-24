import {
  Layers,
  Droplets,
  AlertTriangle,
  Mountain,
  ChevronDown,
  ChevronUp,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import EmptyState from '../components/EmptyState';
import { SkeletonCard, SkeletonTable } from '../components/SkeletonLoader';

export default function DashboardPage() {
  const analysisData = useAppStore((s) => s.analysisData);
  const isLoading = useAppStore((s) => s.isLoading);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="skeleton h-24 w-full mb-6 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonTable />
      </div>
    );
  }

  if (!analysisData) {
    return (
      <EmptyState
        title="No Report Loaded"
        description="Upload a geotechnical report to see the analysis dashboard with soil data, water table analysis, and risk assessments."
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

  const { projectSummary, waterTable, borings, recommendations, riskFlags } =
    analysisData;

  const riskColor =
    projectSummary.riskScore >= 70
      ? 'var(--error-color)'
      : projectSummary.riskScore >= 40
        ? 'var(--warning-color)'
        : 'var(--success-color)';

  return (
    <div className="animate-fade-in">
      {/* Welcome Banner */}
      <WelcomeBanner projectSummary={projectSummary} />

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Risk Score"
          value={`${projectSummary.riskScore}/100`}
          icon={<AlertTriangle size={20} />}
          color={riskColor}
        />
        <MetricCard
          title="Total Borings"
          value={String(projectSummary.totalBorings)}
          icon={<Layers size={20} />}
        />
        <MetricCard
          title="Groundwater"
          value={projectSummary.groundwaterDetected ? 'Detected' : 'Not Found'}
          icon={<Droplets size={20} />}
          color={
            projectSummary.groundwaterDetected
              ? 'var(--warning-color)'
              : 'var(--success-color)'
          }
        />
        <MetricCard
          title="Rock/Refusal"
          value={
            projectSummary.rockRefusalDetected ? 'Detected' : 'Not Found'
          }
          icon={<Mountain size={20} />}
          color={
            projectSummary.rockRefusalDetected
              ? 'var(--warning-color)'
              : 'var(--success-color)'
          }
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Water Table Section */}
        <div className="lg:col-span-2 bg-[var(--card-bg)] rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center">
            <h2
              className="font-semibold text-lg text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Water Table Analysis
            </h2>
            <button
              onClick={() => navigate('/borelogs')}
              className="text-sm text-[var(--accent-color)] hover:text-[var(--accent-hover)]"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-tertiary)]">
                <tr>
                  {['Boring ID', 'GW Depth', 'Page', 'Evidence'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-medium text-[var(--text-primary)] uppercase tracking-wider"
                        style={{ fontFamily: 'var(--font-oswald)' }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {waterTable.slice(0, 5).map((entry) => (
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
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)] max-w-xs truncate">
                      {entry.evidenceSnippet}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk Flags Summary */}
        <div className="bg-[var(--card-bg)] rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center">
            <h2
              className="font-semibold text-lg text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Risk Flags
            </h2>
            <button
              onClick={() => navigate('/riskflags')}
              className="text-sm text-[var(--accent-color)] hover:text-[var(--accent-hover)]"
            >
              View All
            </button>
          </div>
          <div className="p-4 space-y-3">
            {riskFlags.slice(0, 4).map((flag) => (
              <RiskFlagItem key={flag.id} flag={flag} />
            ))}
            {riskFlags.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">
                No risk flags detected
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Soil Characteristics Preview */}
      <div className="mt-6 bg-[var(--card-bg)] rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center">
          <h2
            className="font-semibold text-lg text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Soil Characteristics
          </h2>
          <button
            onClick={() => navigate('/borelogs')}
            className="text-sm text-[var(--accent-color)] hover:text-[var(--accent-hover)]"
          >
            View All Borings
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {borings.slice(0, 3).map((boring) => (
            <div
              key={boring.boringId}
              className="p-4 rounded-lg bg-[var(--bg-tertiary)]"
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className="font-medium text-[var(--accent-color)]"
                  style={{ fontFamily: 'var(--font-oswald)' }}
                >
                  {boring.boringId}
                </span>
                {boring.redFlagIndicators.length > 0 && (
                  <AlertTriangle
                    size={16}
                    className="text-[var(--warning-color)]"
                  />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[var(--text-muted)]">Soil Types</p>
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
              </div>
              {boring.refusalDepth !== 'N/A' && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Refusal: {boring.refusalDepth}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations Preview */}
      <div className="mt-6 bg-[var(--card-bg)] rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center">
          <h2
            className="font-semibold text-lg text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Recommendations Summary
          </h2>
          <button
            onClick={() => navigate('/recommendations')}
            className="text-sm text-[var(--accent-color)] hover:text-[var(--accent-hover)]"
          >
            View All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          <RecommendationPreview
            title="Slab"
            items={recommendations.slab}
          />
          <RecommendationPreview
            title="Foundation"
            items={recommendations.foundation}
          />
          <RecommendationPreview
            title="Pavement"
            items={recommendations.pavement}
          />
        </div>
      </div>
    </div>
  );
}

function WelcomeBanner({
  projectSummary,
}: {
  projectSummary: {
    projectName: string;
    uploadedFileName: string;
    dateAnalyzed: string;
    riskScore: number;
  };
}) {
  return (
    <div className="rounded-lg overflow-hidden shadow-lg mb-6 bg-[var(--bg-secondary)]">
      <div className="px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-xl font-semibold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              {projectSummary.projectName}
            </h1>
            <p
              className="text-sm text-[var(--text-secondary)] mt-1"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              {projectSummary.uploadedFileName} &middot; Analyzed{' '}
              {projectSummary.dateAnalyzed}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor:
                  projectSummary.riskScore >= 70
                    ? 'rgba(239,68,68,0.2)'
                    : projectSummary.riskScore >= 40
                      ? 'rgba(245,158,11,0.2)'
                      : 'rgba(16,185,129,0.2)',
                color:
                  projectSummary.riskScore >= 70
                    ? 'var(--error-color)'
                    : projectSummary.riskScore >= 40
                      ? 'var(--warning-color)'
                      : 'var(--success-color)',
                fontFamily: 'var(--font-oswald)',
              }}
            >
              Risk: {projectSummary.riskScore}/100
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="bg-[var(--card-bg)] rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-start">
        <div>
          <p
            className="text-sm font-medium text-[var(--text-muted)]"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            {title}
          </p>
          <p
            className="text-2xl font-bold mt-1"
            style={{
              color: color || 'var(--text-primary)',
              fontFamily: 'var(--font-oswald)',
            }}
          >
            {value}
          </p>
        </div>
        <div
          className="p-2 rounded-md"
          style={{
            backgroundColor: color
              ? `${color}20`
              : 'var(--bg-tertiary)',
          }}
        >
          <span style={{ color: color || 'var(--icon-primary)' }}>
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
}

function RiskFlagItem({
  flag,
}: {
  flag: {
    id: string;
    category: string;
    confidenceLevel: string;
    description: string;
    evidence: string;
  };
}) {
  const [expanded, setExpanded] = useState(false);

  const confidenceColor =
    flag.confidenceLevel === 'high'
      ? 'var(--error-color)'
      : flag.confidenceLevel === 'medium'
        ? 'var(--warning-color)'
        : 'var(--success-color)';

  return (
    <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
      <div
        className="flex justify-between items-start cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-[var(--text-primary)]">
              {flag.category}
            </span>
            <span
              className="px-2 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: `${confidenceColor}20`,
                color: confidenceColor,
              }}
            >
              {flag.confidenceLevel}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {flag.description}
          </p>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-[var(--text-muted)] ml-2" />
        ) : (
          <ChevronDown size={16} className="text-[var(--text-muted)] ml-2" />
        )}
      </div>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
          <p className="text-xs text-[var(--text-secondary)]">
            {flag.evidence}
          </p>
        </div>
      )}
    </div>
  );
}

function RecommendationPreview({
  title,
  items,
}: {
  title: string;
  items: { summary: string; keywordsDetected: string[] }[];
}) {
  return (
    <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
      <h3
        className="font-medium text-sm text-[var(--text-primary)] mb-2"
        style={{ fontFamily: 'var(--font-oswald)' }}
      >
        {title}
      </h3>
      <ul className="space-y-2">
        {items.slice(0, 2).map((item, i) => (
          <li key={i} className="text-xs text-[var(--text-secondary)]">
            <span className="text-[var(--accent-color)] mr-1">&bull;</span>
            {item.summary.length > 100
              ? `${item.summary.substring(0, 100)}...`
              : item.summary}
          </li>
        ))}
      </ul>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {items[0].keywordsDetected.slice(0, 3).map((kw) => (
            <span
              key={kw}
              className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--accent-color)]/20 text-[var(--accent-color)]"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

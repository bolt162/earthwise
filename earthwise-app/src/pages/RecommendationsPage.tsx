import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { useAppStore } from '../store';
import EmptyState from '../components/EmptyState';
import type { RecommendationItem } from '../types';

export default function RecommendationsPage() {
  const analysisData = useAppStore((s) => s.analysisData);
  const navigate = useNavigate();

  if (!analysisData) {
    return (
      <EmptyState
        title="No Report Loaded"
        description="Upload a geotechnical report to view slab, foundation, and pavement recommendations."
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

  const { recommendations } = analysisData;

  return (
    <div className="animate-fade-in">
      <h1
        className="text-2xl font-bold text-[var(--text-primary)] mb-6"
        style={{ fontFamily: 'var(--font-oswald)' }}
      >
        Recommendations
      </h1>

      <div className="space-y-6">
        <RecommendationSection
          title="Slab Recommendations"
          items={recommendations.slab}
        />
        <RecommendationSection
          title="Foundation Recommendations"
          items={recommendations.foundation}
        />
        <RecommendationSection
          title="Pavement / Subgrade Recommendations"
          items={recommendations.pavement}
        />
      </div>
    </div>
  );
}

function RecommendationSection({
  title,
  items,
}: {
  title: string;
  items: RecommendationItem[];
}) {
  return (
    <div className="bg-[var(--card-bg)] rounded-lg shadow-lg">
      <div className="px-6 py-4 border-b border-[var(--border-color)]">
        <h2
          className="font-semibold text-lg text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          {title}
        </h2>
      </div>
      <div className="p-4 space-y-4">
        {items.map((item, i) => (
          <div key={i} className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
            <div className="flex items-start gap-2">
              <span className="text-[var(--accent-color)] font-bold mt-0.5">
                &bull;
              </span>
              <div className="flex-1">
                <p className="text-sm text-[var(--text-primary)]">
                  {item.summary}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-[var(--text-muted)]">
                    Pages: {item.pageReferences.map((p) => `p.${p}`).join(', ')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.keywordsDetected.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 text-xs rounded-full bg-[var(--accent-color)]/20 text-[var(--accent-color)]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

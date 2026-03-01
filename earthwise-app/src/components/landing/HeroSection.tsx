import { ArrowRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HeroSection() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[680px] flex items-center overflow-hidden landing-hero-bg">
      <div className="max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left — Text */}
          <div>
            <p
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-[var(--accent-color)]/20"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              AI-Powered Geotech Analysis
            </p>
            <h1
              className="text-4xl md:text-5xl lg:text-[56px] font-bold leading-[1.1] text-[var(--text-primary)] mb-6"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Analyze Bore Logs{' '}
              <span className="landing-gradient-text">Instantly</span> with AI
            </h1>
            <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-lg leading-relaxed">
              Upload your geotechnical PDFs and get instant risk assessments, soil
              analysis, water table mapping, and engineering recommendations — powered by AI.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate('/projects')}
                className="px-7 py-3.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                style={{ fontFamily: 'var(--font-oswald)' }}
              >
                Try It Free
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="px-7 py-3.5 rounded-lg font-semibold text-sm border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                style={{ fontFamily: 'var(--font-oswald)' }}
              >
                See How It Works
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Right — Visual */}
          <div className="hidden md:flex justify-center">
            <div className="relative w-full max-w-md">
              {/* Stylized dashboard preview cards */}
              <div className="rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-2xl p-6 landing-float-animation">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-[var(--error-color)]" />
                  <div className="w-3 h-3 rounded-full bg-[var(--warning-color)]" />
                  <div className="w-3 h-3 rounded-full bg-[var(--success-color)]" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)]">
                    <span className="text-xs font-medium text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-oswald)' }}>Risk Score</span>
                    <span className="text-lg font-bold text-[var(--warning-color)]" style={{ fontFamily: 'var(--font-oswald)' }}>62</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)]">
                    <span className="text-xs font-medium text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-oswald)' }}>Total Borings</span>
                    <span className="text-lg font-bold text-[var(--accent-color)]" style={{ fontFamily: 'var(--font-oswald)' }}>8</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)]">
                    <span className="text-xs font-medium text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-oswald)' }}>Groundwater</span>
                    <span className="text-xs font-semibold text-[var(--success-color)] px-2 py-0.5 rounded bg-[var(--success-color)]/10">Detected</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {['CL', 'SM', 'GP', 'CH', 'SC', 'ML'].map((uscs) => (
                      <span
                        key={uscs}
                        className="text-[10px] text-center py-1 rounded bg-[var(--accent-color)]/10 text-[var(--accent-color)] font-semibold"
                      >
                        {uscs}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

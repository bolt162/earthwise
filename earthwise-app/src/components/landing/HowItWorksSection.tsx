import { Upload, Brain, BarChart3, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    number: '01',
    title: 'Upload Your PDF',
    description:
      'Drag and drop your geotechnical bore log report. We support standard geotech PDFs including scanned documents with OCR fallback.',
  },
  {
    icon: Brain,
    number: '02',
    title: 'AI Analyzes the Report',
    description:
      'Our pipeline extracts text, tables, and sections, then runs parallel AI analysis for borings, risks, and recommendations.',
  },
  {
    icon: BarChart3,
    number: '03',
    title: 'Get Actionable Insights',
    description:
      'View risk scores, water table analysis, soil classifications, interactive bore maps, and engineering recommendations — all in one dashboard.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 bg-[var(--accent-color)]/10 text-[var(--accent-color)]"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            How It Works
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Three Steps to Insights
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <div key={step.number} className="relative">
              <div className="flex flex-col items-center text-center">
                {/* Number badge */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--accent-color)]/10 flex items-center justify-center">
                    <step.icon size={28} className="text-[var(--accent-color)]" />
                  </div>
                  <span
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[var(--accent-color)] text-white text-xs font-bold flex items-center justify-center"
                    style={{ fontFamily: 'var(--font-oswald)' }}
                  >
                    {step.number}
                  </span>
                </div>

                <h3
                  className="text-xl font-bold text-[var(--text-primary)] mb-3"
                  style={{ fontFamily: 'var(--font-oswald)' }}
                >
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>

              {/* Arrow connector */}
              {idx < steps.length - 1 && (
                <div className="hidden md:flex absolute top-8 -right-4 translate-x-1/2">
                  <ArrowRight size={20} className="text-[var(--text-muted)]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

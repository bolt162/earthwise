import {
  ShieldAlert,
  Droplets,
  Layers,
  Building2,
  MapPin,
  MessageSquare,
} from 'lucide-react';

const features = [
  {
    icon: ShieldAlert,
    title: 'Risk Assessment',
    description: 'AI-powered risk scoring from 0-100 based on soil conditions, groundwater, and site factors.',
  },
  {
    icon: Droplets,
    title: 'Water Table Analysis',
    description: 'Automatic groundwater detection with boring-by-boring depth mapping and evidence snippets.',
  },
  {
    icon: Layers,
    title: 'Soil Classification',
    description: 'USCS-based soil type identification across all borings with red flag detection.',
  },
  {
    icon: Building2,
    title: 'Foundation Recommendations',
    description: 'Data-driven slab, foundation, and pavement guidance with page references.',
  },
  {
    icon: MapPin,
    title: 'Interactive Bore Maps',
    description: 'Geospatial visualization of boring locations with color-coded risk indicators.',
  },
  {
    icon: MessageSquare,
    title: 'AI Chat Assistant',
    description: 'Ask questions about your report and get answers grounded in the actual data.',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4 bg-[var(--accent-color)]/10 text-[var(--accent-color)]"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Capabilities
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            What Earthwise Analyzes
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
            >
              <div className="w-11 h-11 rounded-xl bg-[var(--accent-color)]/10 flex items-center justify-center mb-4 group-hover:bg-[var(--accent-color)]/20 transition-colors">
                <feature.icon size={22} className="text-[var(--accent-color)]" />
              </div>
              <h3
                className="text-lg font-bold text-[var(--text-primary)] mb-2"
                style={{ fontFamily: 'var(--font-oswald)' }}
              >
                {feature.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

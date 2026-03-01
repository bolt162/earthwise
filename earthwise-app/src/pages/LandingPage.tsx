import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import WaitlistSection from '../components/landing/WaitlistSection';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span
            className="text-xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Earthwise
          </span>
          <div className="flex items-center gap-6">
            <a
              href="#features"
              className="hidden sm:block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hidden sm:block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              How It Works
            </a>
            <ThemeToggle />
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-1.5"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Try It Free
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* Spacer for fixed nav */}
      <div className="h-16" />

      {/* Page sections */}
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <WaitlistSection />
      <LandingFooter />
    </div>
  );
}

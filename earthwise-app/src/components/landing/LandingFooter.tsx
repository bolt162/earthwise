import { Link } from 'react-router-dom';

export default function LandingFooter() {
  return (
    <footer className="py-12 bg-[var(--sidebar-bg)] border-t border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <span
              className="text-xl font-bold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Earthwise
            </span>
            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
              AI-powered geotechnical analysis platform. Upload bore log PDFs and get instant engineering insights.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="text-sm font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#features"
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-color)] transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-color)] transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <Link
                  to="/projects"
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-color)] transition-colors"
                >
                  Upload Report
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4
              className="text-sm font-semibold text-[var(--text-primary)] mb-3 uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-[var(--text-muted)]">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-sm text-[var(--text-muted)]">
                  Terms of Service
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--border-color)]">
          <p className="text-xs text-[var(--text-muted)] text-center">
            &copy; {new Date().getFullYear()} Earthwise. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

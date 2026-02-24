import { useAppStore } from '../store';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage() {
  const environmentMode = useAppStore((s) => s.environmentMode);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h1
        className="text-2xl font-bold text-[var(--text-primary)] mb-6"
        style={{ fontFamily: 'var(--font-oswald)' }}
      >
        Settings
      </h1>

      <div className="space-y-6">
        {/* Theme */}
        <div className="bg-[var(--card-bg)] rounded-lg shadow-lg p-6">
          <h2
            className="font-semibold text-lg text-[var(--text-primary)] mb-4"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-primary)]">Dark Mode</p>
              <p className="text-xs text-[var(--text-muted)]">
                Toggle between light and dark themes
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                theme === 'dark' ? 'bg-[var(--accent-color)]' : 'bg-[var(--bg-tertiary)]'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Environment */}
        <div className="bg-[var(--card-bg)] rounded-lg shadow-lg p-6">
          <h2
            className="font-semibold text-lg text-[var(--text-primary)] mb-4"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Environment
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-primary)]">App Mode</p>
              <p className="text-xs text-[var(--text-muted)]">
                Current environment mode (set via VITE_APP_MODE)
              </p>
            </div>
            <span
              className="px-3 py-1 rounded-full text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              {environmentMode}
            </span>
          </div>
        </div>

        {/* About */}
        <div className="bg-[var(--card-bg)] rounded-lg shadow-lg p-6">
          <h2
            className="font-semibold text-lg text-[var(--text-primary)] mb-4"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            About
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Application</span>
              <span className="text-[var(--text-primary)]">Earthwise</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Version</span>
              <span className="text-[var(--text-primary)]">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)]">Description</span>
              <span className="text-[var(--text-primary)]">
                AI-Native Geotechnical Analysis
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

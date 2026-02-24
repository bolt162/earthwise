import { Menu, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--header-bg)] shadow-sm h-16 flex items-center px-4">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] mr-2"
          >
            <Menu size={24} className="text-[var(--text-primary)]" />
          </button>
          <Link to="/dashboard" className="flex items-center">
            <span
              className="text-xl font-bold text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Earthwise
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />

          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-2"
            >
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                U
              </div>
              <span className="hidden md:block text-[var(--text-primary)] text-sm">
                User
              </span>
              <ChevronDown size={16} className="text-[var(--text-primary)]" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-[var(--card-bg)] ring-1 ring-black ring-opacity-5 animate-fade-in">
                <div className="py-1">
                  <Link
                    to="/settings"
                    className="block px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    Settings
                  </Link>
                  <button className="block w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

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
        </div>
      </div>
    </header>
  );
}

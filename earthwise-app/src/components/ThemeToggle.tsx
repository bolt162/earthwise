import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun size={20} className="text-[var(--icon-primary)]" />
      ) : (
        <Moon size={20} className="text-[var(--icon-primary)]" />
      )}
    </button>
  );
}

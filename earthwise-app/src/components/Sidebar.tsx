import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Layers,
  FileCheck,
  AlertTriangle,
  MessageSquare,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useAppStore } from '../store';

const navItems = [
  { path: '/projects', label: 'Projects', icon: FolderOpen, page: 'projects' as const },
  { path: '/dashboard', label: 'Analysis Dashboard', icon: LayoutDashboard, page: 'dashboard' as const },
  { path: '/borelogs', label: 'Bore Logs', icon: Layers, page: 'borelogs' as const },
  { path: '/recommendations', label: 'Recommendations', icon: FileCheck, page: 'recommendations' as const },
  { path: '/riskflags', label: 'Risk Flags', icon: AlertTriangle, page: 'riskflags' as const },
  { path: '/chat', label: 'Chat AI', icon: MessageSquare, page: 'chat' as const },
  { path: '/settings', label: 'Settings', icon: Settings, page: 'settings' as const },
];

export default function Sidebar() {
  const location = useLocation();
  const isSidebarOpen = useAppStore((s) => s.isSidebarOpen);

  return (
    <div
      className={`fixed left-0 top-16 bottom-0 z-40 transition-all duration-300 ${
        isSidebarOpen
          ? 'w-64'
          : 'w-0 -translate-x-full md:w-20 md:translate-x-0'
      } bg-[var(--sidebar-bg)] shadow-md`}
    >
      <nav className="h-full py-4 flex flex-col">
        <div className="px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center py-3 px-3 rounded-md transition-colors ${
                  isActive
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                    : 'hover:bg-[var(--bg-tertiary)] text-[var(--sidebar-text)]'
                }`}
              >
                <Icon size={20} />
                <span
                  className={`ml-3 ${
                    isSidebarOpen ? 'block' : 'hidden'
                  } font-[var(--font-oswald)] text-sm`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-auto px-4 space-y-1">
          <Link
            to="/settings"
            className="flex items-center py-3 px-3 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--sidebar-text)]"
          >
            <HelpCircle size={20} />
            <span
              className={`ml-3 ${
                isSidebarOpen ? 'block' : 'hidden'
              } font-[var(--font-oswald)] text-sm`}
            >
              Help & Support
            </span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

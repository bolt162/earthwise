import type { ReactNode } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import ChatButton from '../components/ChatButton';
import { useAppStore } from '../store';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const isSidebarOpen = useAppStore((s) => s.isSidebarOpen);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <Sidebar />

      <main
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-0 md:ml-20'
        } pt-24 px-6 pb-8`}
      >
        {children}
      </main>

      <footer
        className={`py-4 px-6 ${
          isSidebarOpen ? 'md:ml-64' : 'md:ml-20'
        } bg-[var(--footer-bg)] transition-all duration-300`}
      >
        <div
          className="max-w-7xl mx-auto flex md:flex-row justify-between items-center text-[var(--footer-text)]"
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          <div className="text-sm mb-2 md:mb-0">
            &copy; {new Date().getFullYear()} Earthwise. All rights reserved.
          </div>
          <div className="flex space-x-4">
            <span className="text-sm hover:underline cursor-pointer">
              Privacy Policy
            </span>
            <span className="text-sm hover:underline cursor-pointer">
              Terms of Service
            </span>
            <span className="text-sm hover:underline cursor-pointer">
              Contact
            </span>
          </div>
        </div>
      </footer>

      <ChatButton />
    </div>
  );
}

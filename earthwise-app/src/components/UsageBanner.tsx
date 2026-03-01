import { Info } from 'lucide-react';
import { useAppStore } from '../store';

export default function UsageBanner() {
  const uploadCount = useAppStore((s) => s.uploadCount);

  if (uploadCount < 3 || uploadCount >= 5) return null;

  return (
    <div className="w-full max-w-xl mx-auto mb-4 px-4 py-3 rounded-lg bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/30 flex items-center gap-3">
      <Info size={18} className="text-[var(--accent-color)] flex-shrink-0" />
      <p className="text-sm text-[var(--text-primary)]">
        You've used <span className="font-semibold">{uploadCount} of 5</span> free analyses
      </p>
    </div>
  );
}

import { FileX } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)]">
      <div className="mb-4 opacity-50">
        {icon || <FileX size={48} />}
      </div>
      <h3
        className="text-xl font-medium mb-2 text-[var(--text-primary)]"
        style={{ fontFamily: 'var(--font-oswald)' }}
      >
        {title}
      </h3>
      <p className="text-[var(--text-muted)] mb-6 text-center max-w-md">
        {description}
      </p>
      {action}
    </div>
  );
}

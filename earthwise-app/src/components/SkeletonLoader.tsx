interface SkeletonProps {
  className?: string;
  count?: number;
}

export function SkeletonLine({ className = '' }: SkeletonProps) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-[var(--card-bg)] rounded-lg shadow-lg p-6 space-y-3">
      <SkeletonLine className="w-1/3 h-3" />
      <SkeletonLine className="w-1/2 h-6" />
      <SkeletonLine className="w-1/4 h-3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-6">
      <SkeletonLine className="w-full h-8" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} className="w-full h-12" />
      ))}
    </div>
  );
}

// Skeleton loading state for the hunts list page.
// Shown automatically by Next.js while the page server component is fetching.

// A single skeleton row matching the hunts table column layout
function SkeletonRow({ index }: { index: number }) {
  return (
    <div
      className={`flex items-center gap-4 py-4 ${index !== 0 ? 'border-t border-border' : ''}`}
    >
      {/* Title + city */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 w-48 bg-surface-2 rounded animate-pulse" />
        <div className="h-3 w-24 bg-surface-2 rounded animate-pulse" />
      </div>

      {/* Type badge */}
      <div className="hidden sm:block w-12 shrink-0 flex justify-center">
        <div className="h-5 w-10 bg-surface-2 rounded-full animate-pulse mx-auto" />
      </div>

      {/* Difficulty badge */}
      <div className="hidden md:block w-20 shrink-0">
        <div className="h-5 w-14 bg-surface-2 rounded-full animate-pulse mx-auto" />
      </div>

      {/* Status badge */}
      <div className="w-24 shrink-0">
        <div className="h-5 w-16 bg-surface-2 rounded-full animate-pulse mx-auto" />
      </div>

      {/* Created date */}
      <div className="hidden lg:block w-28 shrink-0">
        <div className="h-3 w-20 bg-surface-2 rounded animate-pulse ml-auto" />
      </div>

      {/* Actions */}
      <div className="hidden lg:block w-20 shrink-0">
        <div className="h-7 w-16 bg-surface-2 rounded-lg animate-pulse ml-auto" />
      </div>
    </div>
  );
}

export default function HuntsLoading() {
  return (
    <div className="p-8 max-w-6xl">

      {/* Page header skeleton */}
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-24 bg-surface-2 rounded animate-pulse" />
          <div className="h-4 w-16 bg-surface-2 rounded animate-pulse" />
        </div>
        <div className="h-10 w-28 bg-surface-2 rounded-lg animate-pulse" />
      </div>

      {/* Filters skeleton */}
      <div className="mb-5">
        <div className="h-9 w-40 bg-surface rounded-lg animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-surface border border-border rounded-xl px-6">
        {/* Column headers */}
        <div className="flex items-center gap-4 pb-3 pt-4 border-b border-border">
          <div className="flex-1 h-3 w-12 bg-surface-2 rounded animate-pulse" />
          <div className="hidden sm:block w-12 h-3 bg-surface-2 rounded animate-pulse" />
          <div className="hidden md:block w-20 h-3 bg-surface-2 rounded animate-pulse" />
          <div className="w-24 h-3 bg-surface-2 rounded animate-pulse" />
          <div className="hidden lg:block w-28 h-3 bg-surface-2 rounded animate-pulse" />
          <div className="hidden lg:block w-20 h-3 bg-surface-2 rounded animate-pulse" />
        </div>

        {/* 5 skeleton rows */}
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonRow key={i} index={i} />
        ))}
      </div>
    </div>
  );
}

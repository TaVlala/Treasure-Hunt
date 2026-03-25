// Skeleton loading state for the players list page.
// Shown automatically by Next.js while the page server component is fetching.

// A single skeleton row matching the players table column layout
function SkeletonRow({ index }: { index: number }) {
  return (
    <div
      className={`flex items-center gap-4 py-4 ${index !== 0 ? 'border-t border-border' : ''}`}
    >
      {/* Display name + email */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 w-36 bg-surface-2 rounded animate-pulse" />
        <div className="h-3 w-48 bg-surface-2 rounded animate-pulse" />
      </div>

      {/* City */}
      <div className="hidden md:block w-32 shrink-0">
        <div className="h-3 w-20 bg-surface-2 rounded animate-pulse" />
      </div>

      {/* Sessions */}
      <div className="hidden sm:block w-16 shrink-0">
        <div className="h-3.5 w-6 bg-surface-2 rounded animate-pulse mx-auto" />
      </div>

      {/* Status toggle */}
      <div className="w-20 shrink-0">
        <div className="h-6 w-12 bg-surface-2 rounded-full animate-pulse mx-auto" />
      </div>

      {/* Last active */}
      <div className="hidden lg:block w-28 shrink-0">
        <div className="h-3 w-20 bg-surface-2 rounded animate-pulse ml-auto" />
      </div>

      {/* Joined */}
      <div className="hidden xl:block w-28 shrink-0">
        <div className="h-3 w-20 bg-surface-2 rounded animate-pulse ml-auto" />
      </div>
    </div>
  );
}

export default function PlayersLoading() {
  return (
    <div className="p-8 max-w-6xl">

      {/* Page header skeleton */}
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-24 bg-surface-2 rounded animate-pulse" />
          <div className="h-4 w-16 bg-surface-2 rounded animate-pulse" />
        </div>
      </div>

      {/* Filters skeleton */}
      <div className="mb-5">
        <div className="h-9 w-72 bg-surface rounded-lg animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-surface border border-border rounded-xl px-6">
        {/* Column headers */}
        <div className="flex items-center gap-4 pb-3 pt-4 border-b border-border">
          <div className="flex-1 h-3 bg-surface-2 rounded animate-pulse" />
          <div className="hidden md:block w-32 h-3 bg-surface-2 rounded animate-pulse" />
          <div className="hidden sm:block w-16 h-3 bg-surface-2 rounded animate-pulse" />
          <div className="w-20 h-3 bg-surface-2 rounded animate-pulse" />
          <div className="hidden lg:block w-28 h-3 bg-surface-2 rounded animate-pulse" />
          <div className="hidden xl:block w-28 h-3 bg-surface-2 rounded animate-pulse" />
        </div>

        {/* 5 skeleton rows */}
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonRow key={i} index={i} />
        ))}
      </div>
    </div>
  );
}

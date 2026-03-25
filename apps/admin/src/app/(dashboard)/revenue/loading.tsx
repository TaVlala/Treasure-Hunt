// Skeleton loading state for the revenue dashboard page.
// Shown automatically by Next.js while the page server component is fetching.

// Skeleton stat card matching the revenue page StatCard layout
function SkeletonStatCard() {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
      <div className="h-3 w-24 bg-surface-2 rounded animate-pulse" />
      <div className="h-10 w-32 bg-surface-2 rounded animate-pulse" />
    </div>
  );
}

// Skeleton row for the monthly breakdown table
function SkeletonMonthRow({ index }: { index: number }) {
  return (
    <div
      className={`flex items-center gap-4 py-4 ${index !== 0 ? 'border-t border-border' : ''}`}
    >
      <div className="w-24 shrink-0">
        <div className="h-3.5 w-16 bg-surface-2 rounded animate-pulse" />
      </div>
      <div className="w-28 shrink-0">
        <div className="h-3.5 w-16 bg-surface-2 rounded animate-pulse ml-auto" />
      </div>
      <div className="w-24 shrink-0">
        <div className="h-3.5 w-8 bg-surface-2 rounded animate-pulse ml-auto" />
      </div>
      <div className="hidden sm:block flex-1">
        <div className="h-2 bg-surface-2 rounded-full animate-pulse" style={{ width: `${40 + (index * 13) % 50}%` }} />
      </div>
    </div>
  );
}

// Skeleton row for the recent payments table
function SkeletonPaymentRow({ index }: { index: number }) {
  return (
    <div
      className={`flex items-center gap-4 py-4 ${index !== 0 ? 'border-t border-border' : ''}`}
    >
      <div className="w-28 shrink-0">
        <div className="h-5 w-20 bg-surface-2 rounded-full animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="h-3 w-24 bg-surface-2 rounded animate-pulse" />
      </div>
      <div className="w-24 shrink-0">
        <div className="h-3.5 w-14 bg-surface-2 rounded animate-pulse ml-auto" />
      </div>
      <div className="hidden sm:block w-24 shrink-0">
        <div className="h-5 w-16 bg-surface-2 rounded-full animate-pulse mx-auto" />
      </div>
      <div className="hidden md:block w-40 shrink-0">
        <div className="h-3 w-28 bg-surface-2 rounded animate-pulse ml-auto" />
      </div>
    </div>
  );
}

export default function RevenueLoading() {
  return (
    <div className="p-8 max-w-5xl">

      {/* Page header skeleton */}
      <div className="mb-8 space-y-2">
        <div className="h-7 w-28 bg-surface-2 rounded animate-pulse" />
        <div className="h-4 w-64 bg-surface-2 rounded animate-pulse" />
      </div>

      {/* Stat cards skeleton — 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Monthly breakdown skeleton */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="h-3 w-36 bg-surface-2 rounded animate-pulse" />
          <div className="h-3 w-24 bg-surface-2 rounded animate-pulse" />
        </div>

        {/* Chart placeholder bar */}
        <div className="bg-surface border border-border rounded-xl px-6">
          <div className="flex items-center gap-4 pb-3 pt-4 border-b border-border">
            <div className="w-24 h-3 bg-surface-2 rounded animate-pulse" />
            <div className="w-28 h-3 bg-surface-2 rounded animate-pulse" />
            <div className="w-24 h-3 bg-surface-2 rounded animate-pulse" />
            <div className="hidden sm:block flex-1 h-3 bg-surface-2 rounded animate-pulse" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonMonthRow key={i} index={i} />
          ))}
        </div>
      </div>

      {/* Recent payments skeleton */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-3 w-32 bg-surface-2 rounded animate-pulse" />
          <div className="h-3 w-12 bg-surface-2 rounded animate-pulse" />
        </div>

        <div className="bg-surface border border-border rounded-xl px-6">
          <div className="flex items-center gap-4 pb-3 pt-4 border-b border-border">
            <div className="w-28 h-3 bg-surface-2 rounded animate-pulse" />
            <div className="flex-1 h-3 bg-surface-2 rounded animate-pulse" />
            <div className="w-24 h-3 bg-surface-2 rounded animate-pulse" />
            <div className="hidden sm:block w-24 h-3 bg-surface-2 rounded animate-pulse" />
            <div className="hidden md:block w-40 h-3 bg-surface-2 rounded animate-pulse" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonPaymentRow key={i} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Admin dashboard — server component, fetches live hunt and sponsor counts.
// Returns null from serverFetch on auth error; renders "—" as fallback.

import Link from 'next/link';
import { serverFetch } from '@/lib/server-api';
import type { Hunt, Sponsor, PaginatedData } from '@treasure-hunt/shared';

// -- Stat card subcomponent --

function StatCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number | string;
  href?: string;
  accent?: boolean;
}) {
  const content = (
    <div
      className={`
        bg-surface border rounded-xl p-6 transition-colors
        ${accent ? 'border-accent/30 bg-accent/5' : 'border-border hover:border-border-strong'}
      `}
    >
      <p className="text-[11px] uppercase tracking-widest text-text-muted font-medium mb-3">
        {label}
      </p>
      <p className={`text-4xl font-semibold tabular-nums ${accent ? 'text-accent' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }
  return content;
}

// -- Recent hunt row --

function HuntRow({ hunt, index }: { hunt: Hunt; index: number }) {
  const statusColors: Record<string, string> = {
    active: 'text-green-400 bg-green-400/10',
    draft: 'text-text-muted bg-surface-2',
    paused: 'text-yellow-400 bg-yellow-400/10',
    completed: 'text-blue-400 bg-blue-400/10',
    archived: 'text-text-faint bg-surface-2',
  };
  const statusStyle = statusColors[hunt.status] ?? 'text-text-muted bg-surface-2';

  return (
    <div
      className={`
        flex items-center justify-between py-4
        ${index !== 0 ? 'border-t border-border' : ''}
      `}
    >
      <div className="min-w-0">
        <p className="text-sm text-white font-medium truncate">{hunt.title}</p>
        <p className="text-xs text-text-muted mt-0.5">{hunt.city}</p>
      </div>
      <span
        className={`
          ml-4 shrink-0 text-[10px] uppercase tracking-widest font-medium
          px-2.5 py-1 rounded-full ${statusStyle}
        `}
      >
        {hunt.status}
      </span>
    </div>
  );
}

// -- Page --

export default async function DashboardPage() {
  // Fetch hunts and sponsors in parallel; both return null on failure
  const [huntsData, sponsors] = await Promise.all([
    serverFetch<PaginatedData<Hunt>>('/api/v1/admin/hunts?pageSize=100'),
    serverFetch<PaginatedData<Sponsor>>('/api/v1/admin/sponsors?pageSize=100'),
  ]);

  const hunts = huntsData?.items ?? [];
  const totalHunts = huntsData?.total ?? 0;
  const activeHunts = hunts.filter((h) => h.status === 'active').length;
  const totalSponsors = sponsors?.total ?? 0;

  // Show the 5 most recently created hunts
  const recentHunts = hunts.slice(0, 5);

  return (
    <div className="p-8 max-w-5xl">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">Overview of your hunts and sponsors</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Active Hunts" value={activeHunts} href="/hunts" accent={activeHunts > 0} />
        <StatCard label="Total Hunts" value={totalHunts} href="/hunts" />
        <StatCard label="Sponsors" value={totalSponsors} href="/sponsors" />
        <StatCard label="Players" value="—" />
      </div>

      {/* Quick actions */}
      <div className="mb-10">
        <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/hunts/new"
            className="
              inline-flex items-center gap-2 bg-accent hover:bg-accent-hover
              text-black font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors
            "
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New Hunt
          </Link>
          <Link
            href="/sponsors/new"
            className="
              inline-flex items-center gap-2 bg-surface border border-border
              hover:border-border-strong text-white text-sm px-5 py-2.5 rounded-lg transition-colors
            "
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            New Sponsor
          </Link>
        </div>
      </div>

      {/* Recent hunts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Recent Hunts
          </h2>
          <Link href="/hunts" className="text-xs text-accent hover:text-accent-hover transition-colors">
            View all →
          </Link>
        </div>

        <div className="bg-surface border border-border rounded-xl px-6">
          {recentHunts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-text-muted">No hunts yet</p>
              <Link
                href="/hunts/new"
                className="text-xs text-accent hover:text-accent-hover mt-2 inline-block transition-colors"
              >
                Create your first hunt →
              </Link>
            </div>
          ) : (
            recentHunts.map((hunt, i) => (
              <HuntRow key={hunt.id} hunt={hunt} index={i} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

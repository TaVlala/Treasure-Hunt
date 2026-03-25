// HuntHeader — client component that owns live status state for the hunt detail page.
// Receives initial hunt data from the server component and manages status transitions
// + renders the status badge, action bar, stats row, and nav links.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { HuntDetail, HuntStatus } from '@treasure-hunt/shared';
import { StatusActionBar } from './StatusActionBar';

// Per-status badge colour classes — mirrors server-component STATUS_STYLES
const STATUS_STYLES: Record<string, string> = {
  active: 'text-green-400 bg-green-400/10',
  draft: 'text-text-muted bg-surface-2',
  paused: 'text-yellow-400 bg-yellow-400/10',
  completed: 'text-blue-400 bg-blue-400/10',
  archived: 'text-text-faint bg-surface-2',
};

// Analytics data shape returned by GET /admin/analytics/hunts/:huntId
interface HuntAnalytics {
  totalClueFoundEvents: number;
  totalHuntCompleteEvents: number;
  averageScore: number | null;
}

interface Props {
  hunt: HuntDetail;
  // Pre-fetched analytics — null means the fetch failed (display "--")
  analytics: HuntAnalytics | null;
}

// Single stat chip displayed in the stats row
function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-border rounded-lg">
      <span className="text-[10px] uppercase tracking-wider text-text-faint font-medium">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

export function HuntHeader({ hunt, analytics }: Props) {
  const [status, setStatus] = useState<HuntStatus>(hunt.status);
  const statusStyle = STATUS_STYLES[status] ?? 'text-text-muted bg-surface-2';

  // Completion rate: completed sessions / total sessions started
  // totalHuntCompleteEvents = HUNT_COMPLETE events; totalClueFoundEvents is per-clue
  // Use totalHuntCompleteEvents as "completions" and approximate sessions from clue events / clueCount
  const completionDisplay = analytics !== null ? analytics.totalHuntCompleteEvents : '--';
  const activeSessionsDisplay = analytics !== null ? analytics.totalClueFoundEvents : '--';

  return (
    <header className="px-6 py-4 border-b border-border shrink-0">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-text-muted mb-2">
        <Link href="/hunts" className="hover:text-white transition-colors">
          Hunts
        </Link>
        <svg width="12" height="12" fill="none" viewBox="0 0 12 12" className="text-text-faint">
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-white truncate max-w-xs">{hunt.title}</span>
      </div>

      {/* Hunt title + meta */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-white tracking-tight truncate">
            {hunt.title}
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {hunt.city}
            {hunt.region ? `, ${hunt.region}` : ''}
            {' · '}
            {hunt.clueCount} clue{hunt.clueCount !== 1 ? 's' : ''}
            {' · '}
            <span className="capitalize">{hunt.difficulty}</span>
          </p>
        </div>

        {/* Nav links + status badge */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/hunts/${hunt.id}/prizes`}
            className="
              text-xs text-text-muted hover:text-white border border-border hover:border-border-strong
              px-3 py-1.5 rounded-lg transition-colors
            "
          >
            Prizes
          </Link>
          <Link
            href={`/hunts/${hunt.id}/whitelabel`}
            className="
              text-xs text-text-muted hover:text-white border border-border hover:border-border-strong
              px-3 py-1.5 rounded-lg transition-colors
            "
          >
            White-label
          </Link>
          <span
            className={`
              text-[10px] uppercase tracking-widest font-medium
              px-2.5 py-1 rounded-full ${statusStyle}
            `}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Status action bar */}
      <div className="mt-3">
        <StatusActionBar
          huntId={hunt.id}
          status={status}
          onStatusChange={setStatus}
        />
      </div>

      {/* Stats summary row */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <StatChip label="Clues" value={hunt.clueCount} />
        <StatChip label="Clue finds" value={activeSessionsDisplay} />
        <StatChip label="Completions" value={completionDisplay} />
        {analytics?.averageScore != null && (
          <StatChip label="Avg score" value={analytics.averageScore} />
        )}
      </div>
    </header>
  );
}

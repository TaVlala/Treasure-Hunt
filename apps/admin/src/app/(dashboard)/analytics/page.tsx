// Admin analytics dashboard — server component.
// Fetches overall event stats from /api/v1/admin/analytics and renders summary cards + recent events table.

import { serverFetch } from '@/lib/server-api';

// ---------------------------------------------------------------------------
// Types matching the analytics admin route response shapes
// ---------------------------------------------------------------------------

interface EventCountByType {
  eventType: string;
  count: number;
}

interface DailyTrend {
  date: string;
  count: number;
}

interface RecentEvent {
  id: string;
  eventType: string;
  huntId: string | null;
  playerId: string | null;
  createdAt: string;
}

interface OverallStats {
  totalEvents: number;
  byType: EventCountByType[];
  last7DaysTrend: DailyTrend[];
  recentEvents: RecentEvent[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Format ISO timestamp to "Mar 9, 2026, 14:32"
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// Truncate a UUID to first 8 chars for display
function truncateId(id: string | null): string {
  if (!id) return '—';
  return id.slice(0, 8) + '…';
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      className={`
        bg-surface border rounded-xl p-6 transition-colors
        ${accent ? 'border-accent/30 bg-accent/5' : 'border-border'}
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
}

const EVENT_TYPE_STYLES: Record<string, string> = {
  CLUE_FOUND: 'text-green-400 bg-green-400/10',
  HUNT_COMPLETE: 'text-accent bg-accent/10',
};

function EventTypeBadge({ eventType }: { eventType: string }) {
  const style = EVENT_TYPE_STYLES[eventType] ?? 'text-text-muted bg-surface-2';
  return (
    <span
      className={`
        text-[10px] uppercase tracking-widest font-medium
        px-2.5 py-1 rounded-full ${style}
      `}
    >
      {eventType.replace('_', ' ')}
    </span>
  );
}

function EventRow({ event, index }: { event: RecentEvent; index: number }) {
  return (
    <div
      className={`
        flex items-center gap-4 py-4
        ${index !== 0 ? 'border-t border-border' : ''}
      `}
    >
      {/* Event type badge */}
      <div className="w-36 shrink-0">
        <EventTypeBadge eventType={event.eventType} />
      </div>

      {/* Hunt ID (truncated) */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-muted font-mono">{truncateId(event.huntId)}</p>
      </div>

      {/* Timestamp */}
      <div className="hidden sm:block w-40 shrink-0 text-right">
        <p className="text-xs text-text-faint">{formatDateTime(event.createdAt)}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AnalyticsPage() {
  const data = await serverFetch<OverallStats>('/api/v1/admin/analytics');

  // Derive per-type counts with safe fallbacks
  const totalEvents = data?.totalEvents ?? 0;
  const clueFoundCount = data?.byType.find((b) => b.eventType === 'CLUE_FOUND')?.count ?? 0;
  const huntCompleteCount = data?.byType.find((b) => b.eventType === 'HUNT_COMPLETE')?.count ?? 0;
  const recentEvents = data?.recentEvents ?? [];

  return (
    <div className="p-8 max-w-5xl">

      {/* Breadcrumb + page header */}
      <div className="mb-8">
        <p className="text-xs text-text-faint mb-1">
          <span className="text-text-muted">Analytics</span>
        </p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Analytics</h1>
        <p className="text-sm text-text-muted mt-1">Event tracking across all hunts</p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Total Events" value={totalEvents} />
        <StatCard label="Clues Found" value={clueFoundCount} accent={clueFoundCount > 0} />
        <StatCard label="Hunts Completed" value={huntCompleteCount} accent={huntCompleteCount > 0} />
      </div>

      {/* Recent events table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Recent Events
          </h2>
          <p className="text-xs text-text-faint">Last 50</p>
        </div>

        <div className="bg-surface border border-border rounded-xl px-6">

          {/* Column headers */}
          {recentEvents.length > 0 && (
            <div className="flex items-center gap-4 pb-3 pt-4 border-b border-border">
              <p className="w-36 shrink-0 text-[10px] uppercase tracking-widest text-text-faint">
                Event Type
              </p>
              <p className="flex-1 text-[10px] uppercase tracking-widest text-text-faint">
                Hunt ID
              </p>
              <p className="hidden sm:block w-40 shrink-0 text-right text-[10px] uppercase tracking-widest text-text-faint">
                Time
              </p>
            </div>
          )}

          {/* Rows or fallback states */}
          {data === null ? (
            <div className="py-12 text-center">
              <p className="text-sm text-text-muted">Failed to load analytics</p>
            </div>
          ) : recentEvents.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-text-muted">No events recorded yet</p>
              <p className="text-xs text-text-faint mt-1">
                Events are recorded when players find clues or complete hunts
              </p>
            </div>
          ) : (
            recentEvents.map((event, i) => (
              <EventRow key={event.id} event={event} index={i} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

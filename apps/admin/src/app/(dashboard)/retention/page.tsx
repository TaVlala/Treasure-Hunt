// Retention analytics page — server component.
// Shows weekly player cohort heatmap: how many players return in subsequent weeks.

import { serverFetch } from '@/lib/server-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RetentionCohort {
  week: string;
  size: number;
  rates: (number | null)[];
}

interface RetentionData {
  cohorts: RetentionCohort[];
  weekCount: number;
  avgWeek1Retention: number | null;
  avgWeek2Retention: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Format ISO week start date to "Mar 3"
function fmtWeek(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Returns a Tailwind background + text class based on retention %
function heatColor(pct: number): string {
  if (pct === 100) return 'bg-[#f59e0b] text-black';
  if (pct >= 70)  return 'bg-[#f59e0b]/70 text-black';
  if (pct >= 50)  return 'bg-[#f59e0b]/50 text-black';
  if (pct >= 30)  return 'bg-[#f59e0b]/30 text-white';
  if (pct >= 10)  return 'bg-[#f59e0b]/15 text-[#888]';
  return 'bg-[#1c1c1c] text-[#444]';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#141414] border border-[#242424] rounded-xl p-6">
      <p className="text-[11px] uppercase tracking-widest text-[#555] font-medium mb-3">{label}</p>
      <p className="text-4xl font-semibold text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-[#555] mt-2">{sub}</p>}
    </div>
  );
}

// Single cohort row in the heatmap table
function CohortRow({
  cohort,
  weekCount,
  isFirst,
}: {
  cohort: RetentionCohort;
  weekCount: number;
  isFirst: boolean;
}) {
  return (
    <tr className={isFirst ? '' : 'border-t border-[#1c1c1c]'}>
      {/* Cohort label */}
      <td className="px-4 py-3 text-xs text-[#888] whitespace-nowrap font-mono">
        {fmtWeek(cohort.week)}
      </td>
      {/* Cohort size */}
      <td className="px-4 py-3 text-xs text-[#555] text-right tabular-nums">
        {cohort.size}
      </td>
      {/* Heat cells — one per week offset */}
      {Array.from({ length: weekCount }, (_, i) => {
        const rate = cohort.rates[i] ?? null;
        if (rate === null) {
          return (
            <td key={i} className="px-1 py-2">
              <div className="w-full min-w-[44px] h-9 rounded-md bg-[#111] border border-[#1c1c1c]" />
            </td>
          );
        }
        return (
          <td key={i} className="px-1 py-2">
            <div
              className={`w-full min-w-[44px] h-9 rounded-md flex items-center justify-center text-[11px] font-medium tabular-nums ${heatColor(rate)}`}
            >
              {rate === 0 ? '—' : `${rate}%`}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RetentionPage() {
  const data = await serverFetch<RetentionData>('/api/v1/admin/analytics/retention');

  // Empty / no-DB state
  if (!data || data.cohorts.length === 0) {
    return (
      <div className="p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Player Retention</h1>
          <p className="text-sm text-text-muted mt-1">Weekly cohort heatmap — last 12 weeks</p>
        </div>
        <div className="bg-surface-1 border border-border rounded-xl p-12 text-center">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-sm text-white font-medium mb-1">No data yet</p>
          <p className="text-xs text-text-faint">Retention data appears once players start completing hunts.</p>
        </div>
      </div>
    );
  }

  const totalPlayers = data.cohorts.reduce((s, c) => s + c.size, 0);
  const weekLabels = Array.from({ length: data.weekCount }, (_, i) =>
    i === 0 ? 'Week 0' : `+${i}w`,
  );

  return (
    <div className="p-8 max-w-6xl">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Player Retention</h1>
        <p className="text-sm text-text-muted mt-1">
          Weekly cohort heatmap — {data.cohorts.length} cohorts · last 12 weeks
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Total players (12 wks)"
          value={totalPlayers.toString()}
        />
        <StatCard
          label="Avg week-1 retention"
          value={data.avgWeek1Retention !== null ? `${data.avgWeek1Retention}%` : '—'}
          sub="% of players who return the following week"
        />
        <StatCard
          label="Avg week-2 retention"
          value={data.avgWeek2Retention !== null ? `${data.avgWeek2Retention}%` : '—'}
          sub="% of players still active after 2 weeks"
        />
      </div>

      {/* Cohort heatmap */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-[#555] font-medium mb-4">
          Cohort Heatmap
        </h2>
        <div className="bg-[#141414] border border-[#242424] rounded-xl overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#242424]">
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-[#444] font-medium whitespace-nowrap">
                  Cohort week
                </th>
                <th className="px-4 py-3 text-right text-[10px] uppercase tracking-widest text-[#444] font-medium whitespace-nowrap">
                  Players
                </th>
                {weekLabels.map((label) => (
                  <th
                    key={label}
                    className="px-1 py-3 text-center text-[10px] uppercase tracking-widest text-[#444] font-medium min-w-[52px] whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((cohort, i) => (
                <CohortRow
                  key={cohort.week}
                  cohort={cohort}
                  weekCount={data.weekCount}
                  isFirst={i === 0}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <p className="text-[10px] text-[#444] uppercase tracking-widest">Retention %</p>
          {[
            { label: '≥70%', cls: 'bg-[#f59e0b]/70' },
            { label: '≥50%', cls: 'bg-[#f59e0b]/50' },
            { label: '≥30%', cls: 'bg-[#f59e0b]/30' },
            { label: '≥10%', cls: 'bg-[#f59e0b]/15' },
            { label: '<10%', cls: 'bg-[#1c1c1c]' },
            { label: 'Future', cls: 'bg-[#111] border border-[#1c1c1c]' },
          ].map(({ label, cls }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-4 h-4 rounded-sm ${cls}`} />
              <span className="text-[10px] text-[#555]">{label}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

// Sponsor analytics page — server component.
// Fetches per-sponsor analytics (clue visits, prizes, redemptions) from the admin analytics API.
// Route: /sponsors/:id/analytics

import Link from 'next/link';
import { serverFetch } from '@/lib/server-api';

// ---------------------------------------------------------------------------
// Types matching the GET /api/v1/admin/analytics/sponsors/:sponsorId response
// ---------------------------------------------------------------------------

interface ClueFunnelEntry {
  clueId: string;
  clueTitle: string;
  foundCount: number;
}

interface SponsorAnalytics {
  sponsorId: string;
  businessName: string;
  totalClueVisits: number;
  clueFunnel: ClueFunnelEntry[];
  activePrizes: number;
  totalRedemptions: number;
  redemptionRate: number;
}

// ---------------------------------------------------------------------------
// Sub-components
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SponsorAnalyticsPage({ params }: PageProps) {
  const { id } = await params;

  const data = await serverFetch<SponsorAnalytics>(
    `/api/v1/admin/analytics/sponsors/${id}`,
  );

  const businessName = data?.businessName ?? 'Sponsor';
  const totalClueVisits = data?.totalClueVisits ?? 0;
  const activePrizes = data?.activePrizes ?? 0;
  const totalRedemptions = data?.totalRedemptions ?? 0;
  const redemptionRate = data?.redemptionRate ?? 0;
  const clueFunnel = data?.clueFunnel ?? [];

  // Max visits for proportional bar widths — default to 1 to avoid div/0
  const maxVisits = clueFunnel.reduce((m, c) => Math.max(m, c.foundCount), 1);

  return (
    <div className="p-8 max-w-5xl">

      {/* Breadcrumb */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
          <Link href="/sponsors" className="hover:text-white transition-colors">
            Sponsors
          </Link>
          <span>/</span>
          <Link href={`/sponsors/${id}`} className="hover:text-white transition-colors truncate max-w-xs">
            {businessName}
          </Link>
          <span>/</span>
          <span className="text-white">Analytics</span>
        </div>

        <h1 className="text-2xl font-semibold text-white tracking-tight">
          {businessName} — Analytics
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Clue engagement and prize redemption stats
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Clue Visits" value={totalClueVisits} />
        <StatCard label="Prizes Active" value={activePrizes} />
        <StatCard label="Total Redemptions" value={totalRedemptions} accent={totalRedemptions > 0} />
        <StatCard
          label="Redemption Rate"
          value={`${(redemptionRate * 100).toFixed(1)}%`}
          accent={redemptionRate > 0}
        />
      </div>

      {/* Clue funnel table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Clue Funnel
          </h2>
          <p className="text-xs text-text-faint">{clueFunnel.length} clue{clueFunnel.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-surface border border-border rounded-xl px-6">

          {/* Column headers */}
          {clueFunnel.length > 0 && (
            <div className="flex items-center gap-4 pb-3 pt-4 border-b border-border">
              <p className="flex-1 text-[10px] uppercase tracking-widest text-text-faint">
                Clue Title
              </p>
              <p className="w-16 shrink-0 text-right text-[10px] uppercase tracking-widest text-text-faint">
                Visits
              </p>
              <p className="hidden sm:block w-40 shrink-0 text-[10px] uppercase tracking-widest text-text-faint">
                &nbsp;
              </p>
            </div>
          )}

          {/* Rows or fallback states */}
          {data === null ? (
            <div className="py-12 text-center">
              <p className="text-sm text-text-muted">Failed to load analytics</p>
            </div>
          ) : clueFunnel.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-text-muted">No clue visits yet</p>
              <p className="text-xs text-text-faint mt-1">
                Visits are recorded when players find clues linked to this sponsor
              </p>
            </div>
          ) : (
            clueFunnel.map((clue, i) => {
              const pct = maxVisits > 0 ? Math.round((clue.foundCount / maxVisits) * 100) : 0;
              return (
                <div
                  key={clue.clueId}
                  className={`flex items-center gap-4 py-4 ${i !== 0 ? 'border-t border-border' : ''}`}
                >
                  {/* Clue title */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{clue.clueTitle}</p>
                  </div>

                  {/* Visit count */}
                  <div className="w-16 shrink-0 text-right">
                    <p className="text-sm tabular-nums text-text-muted">{clue.foundCount}</p>
                  </div>

                  {/* Visual bar */}
                  <div className="hidden sm:block w-40 shrink-0">
                    <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-1.5 bg-accent rounded-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

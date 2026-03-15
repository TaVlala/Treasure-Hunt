// Revenue dashboard page — server component.
// Fetches payment totals, monthly breakdown, and recent payments from the admin analytics API.
// Route: /revenue

import { serverFetch } from '@/lib/server-api';

// ---------------------------------------------------------------------------
// Types matching the GET /api/v1/admin/analytics/revenue response
// ---------------------------------------------------------------------------

interface MonthlyRevenueEntry {
  month: string; // "YYYY-MM"
  amountCents: number;
  count: number;
}

interface RecentPayment {
  id: string;
  paymentType: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface RevenueSummary {
  totalRevenueCents: number;
  ticketRevenueCents: number;
  sponsorRevenueCents: number;
  monthlyBreakdown: MonthlyRevenueEntry[];
  recentPayments: RecentPayment[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Format cents to "$X.XX"
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Format "YYYY-MM" to "Jan 2026"
function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-');
  if (!year || !month) return yyyyMm;
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Format ISO timestamp to "Mar 9, 2026"
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

// Truncate UUID to first 8 chars for display
function truncateId(id: string): string {
  return id.slice(0, 8) + '…';
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
  value: string;
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

const PAYMENT_TYPE_STYLES: Record<string, string> = {
  TICKET_PURCHASE: 'text-accent bg-accent/10',
  SPONSOR_FEE: 'text-purple-400 bg-purple-400/10',
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'text-green-400 bg-green-400/10',
  PENDING: 'text-yellow-400 bg-yellow-400/10',
  FAILED: 'text-red-400 bg-red-400/10',
  REFUNDED: 'text-text-faint bg-surface-2',
};

function TypeBadge({ paymentType }: { paymentType: string }) {
  const style = PAYMENT_TYPE_STYLES[paymentType] ?? 'text-text-muted bg-surface-2';
  const label = paymentType === 'TICKET_PURCHASE' ? 'Ticket' : paymentType === 'SPONSOR_FEE' ? 'Sponsor Fee' : paymentType.replace('_', ' ');
  return (
    <span
      className={`
        text-[10px] uppercase tracking-widest font-medium
        px-2.5 py-1 rounded-full whitespace-nowrap ${style}
      `}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = PAYMENT_STATUS_STYLES[status] ?? 'text-text-muted bg-surface-2';
  return (
    <span
      className={`
        text-[10px] uppercase tracking-widest font-medium
        px-2.5 py-1 rounded-full ${style}
      `}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RevenuePage() {
  const data = await serverFetch<RevenueSummary>('/api/v1/admin/analytics/revenue');

  const totalRevenueCents = data?.totalRevenueCents ?? 0;
  const ticketRevenueCents = data?.ticketRevenueCents ?? 0;
  const sponsorRevenueCents = data?.sponsorRevenueCents ?? 0;
  const monthlyBreakdown = data?.monthlyBreakdown ?? [];
  const recentPayments = data?.recentPayments ?? [];

  // Max monthly revenue for proportional bar widths — default 1 to avoid div/0
  const maxMonthly = monthlyBreakdown.reduce((m, r) => Math.max(m, r.amountCents), 1);

  return (
    <div className="p-8 max-w-5xl">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Revenue</h1>
        <p className="text-sm text-text-muted mt-1">
          All completed payments across ticket sales and sponsor fees
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Total Revenue" value={formatCents(totalRevenueCents)} />
        <StatCard
          label="Ticket Sales"
          value={formatCents(ticketRevenueCents)}
          accent={ticketRevenueCents > 0}
        />
        <StatCard label="Sponsor Fees" value={formatCents(sponsorRevenueCents)} />
      </div>

      {/* Monthly breakdown */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Monthly Breakdown
          </h2>
          <p className="text-xs text-text-faint">Last 12 months</p>
        </div>

        <div className="bg-surface border border-border rounded-xl px-6">

          {/* Column headers */}
          {monthlyBreakdown.length > 0 && (
            <div className="flex items-center gap-4 pb-3 pt-4 border-b border-border">
              <p className="w-24 shrink-0 text-[10px] uppercase tracking-widest text-text-faint">
                Month
              </p>
              <p className="w-28 shrink-0 text-right text-[10px] uppercase tracking-widest text-text-faint">
                Revenue
              </p>
              <p className="w-24 shrink-0 text-right text-[10px] uppercase tracking-widest text-text-faint">
                Transactions
              </p>
              <p className="hidden sm:block flex-1 text-[10px] uppercase tracking-widest text-text-faint">
                &nbsp;
              </p>
            </div>
          )}

          {/* Rows or fallback states */}
          {data === null ? (
            <div className="py-12 text-center">
              <p className="text-sm text-text-muted">Failed to load revenue data</p>
            </div>
          ) : monthlyBreakdown.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-text-muted">No revenue recorded yet</p>
            </div>
          ) : (
            monthlyBreakdown.map((row, i) => {
              const pct = maxMonthly > 0 ? Math.round((row.amountCents / maxMonthly) * 100) : 0;
              return (
                <div
                  key={row.month}
                  className={`flex items-center gap-4 py-4 ${i !== 0 ? 'border-t border-border' : ''}`}
                >
                  <div className="w-24 shrink-0">
                    <p className="text-sm text-white">{formatMonth(row.month)}</p>
                  </div>
                  <div className="w-28 shrink-0 text-right">
                    <p className="text-sm tabular-nums text-text-muted">{formatCents(row.amountCents)}</p>
                  </div>
                  <div className="w-24 shrink-0 text-right">
                    <p className="text-sm tabular-nums text-text-muted">{row.count}</p>
                  </div>
                  <div className="hidden sm:block flex-1">
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-2 bg-accent/70 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recent payments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Recent Payments
          </h2>
          <p className="text-xs text-text-faint">Last 20</p>
        </div>

        <div className="bg-surface border border-border rounded-xl px-6">

          {/* Column headers */}
          {recentPayments.length > 0 && (
            <div className="flex items-center gap-4 pb-3 pt-4 border-b border-border">
              <p className="w-28 shrink-0 text-[10px] uppercase tracking-widest text-text-faint">
                Type
              </p>
              <p className="flex-1 text-[10px] uppercase tracking-widest text-text-faint">
                ID
              </p>
              <p className="w-24 shrink-0 text-right text-[10px] uppercase tracking-widest text-text-faint">
                Amount
              </p>
              <p className="hidden sm:block w-24 shrink-0 text-center text-[10px] uppercase tracking-widest text-text-faint">
                Status
              </p>
              <p className="hidden md:block w-40 shrink-0 text-right text-[10px] uppercase tracking-widest text-text-faint">
                Date
              </p>
            </div>
          )}

          {/* Rows or fallback states */}
          {data === null ? (
            <div className="py-12 text-center">
              <p className="text-sm text-text-muted">Failed to load payment data</p>
            </div>
          ) : recentPayments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-text-muted">No payments recorded yet</p>
            </div>
          ) : (
            recentPayments.map((payment, i) => (
              <div
                key={payment.id}
                className={`flex items-center gap-4 py-4 ${i !== 0 ? 'border-t border-border' : ''}`}
              >
                {/* Type badge */}
                <div className="w-28 shrink-0">
                  <TypeBadge paymentType={payment.paymentType} />
                </div>

                {/* Truncated ID */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-muted font-mono">{truncateId(payment.id)}</p>
                </div>

                {/* Amount */}
                <div className="w-24 shrink-0 text-right">
                  <p className="text-sm tabular-nums text-white">
                    {formatCents(payment.amountCents)}
                  </p>
                </div>

                {/* Status badge */}
                <div className="hidden sm:flex w-24 shrink-0 justify-center">
                  <StatusBadge status={payment.status} />
                </div>

                {/* Date */}
                <div className="hidden md:block w-40 shrink-0 text-right">
                  <p className="text-xs text-text-faint">{formatDateTime(payment.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

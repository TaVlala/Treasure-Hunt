// Prizes list page for a specific hunt — server component.
// Fetches all prizes for the hunt and renders them in a table with type badges.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverFetch } from '@/lib/server-api';
import type { PaginatedData, PrizeType } from '@treasure-hunt/shared';

// Admin prize shape returned by /api/v1/admin/prizes
interface AdminPrize {
  id: string;
  sponsorId: string;
  huntId: string;
  title: string;
  description: string | null;
  prizeType: PrizeType;
  valueDescription: string | null;
  expiryDate: string | null;
  isGrandPrize: boolean;
  minCluesFound: number;
  redemptionLimit: number | null;
  redemptionsUsed: number;
  createdAt: string;
  sponsor: { id: string; businessName: string };
}

// Colour classes for each prize type badge
const PRIZE_TYPE_STYLES: Record<string, string> = {
  discount: 'text-blue-400 bg-blue-400/10',
  free_item: 'text-green-400 bg-green-400/10',
  experience: 'text-purple-400 bg-purple-400/10',
  gift_card: 'text-pink-400 bg-pink-400/10',
  merch: 'text-orange-400 bg-orange-400/10',
};

// Small coloured badge pill
function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span
      className={`
        text-[10px] uppercase tracking-widest font-medium
        px-2.5 py-1 rounded-full ${className}
      `}
    >
      {text.replace('_', ' ')}
    </span>
  );
}

// Formats a YYYY-MM-DD date string to "Mar 9, 2026"
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HuntPrizesPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch up to 50 prizes for this hunt — admin view, no pagination needed for typical hunt sizes
  const data = await serverFetch<PaginatedData<AdminPrize>>(
    `/api/v1/admin/prizes?huntId=${id}&pageSize=50`,
  );

  if (data === null) notFound();

  const prizes = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="p-8 max-w-6xl">

      {/* Page header with breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-text-muted mb-3">
          <Link href="/hunts" className="hover:text-white transition-colors">
            Hunts
          </Link>
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12" className="text-text-faint">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <Link href={`/hunts/${id}`} className="hover:text-white transition-colors">
            {id.slice(0, 8)}…
          </Link>
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12" className="text-text-faint">
            <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-white">Prizes</span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Prizes</h1>
            <p className="text-sm text-text-muted mt-1">
              {total} prize{total !== 1 ? 's' : ''} for this hunt
            </p>
          </div>
          <Link
            href={`/hunts/${id}/prizes/new`}
            className="
              inline-flex items-center gap-2 bg-accent hover:bg-accent-hover
              text-black font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors
            "
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add Prize
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl px-6">

        {/* Column headers */}
        {prizes.length > 0 && (
          <div className="flex items-center gap-4 pb-3 pt-4 border-b border-border">
            <p className="flex-1 text-[10px] uppercase tracking-widest text-text-faint">Prize</p>
            <p className="hidden sm:block w-28 text-center text-[10px] uppercase tracking-widest text-text-faint">Type</p>
            <p className="hidden md:block w-36 text-[10px] uppercase tracking-widest text-text-faint">Sponsor</p>
            <p className="hidden lg:block w-24 text-center text-[10px] uppercase tracking-widest text-text-faint">Min Clues</p>
            <p className="hidden xl:block w-28 text-right text-[10px] uppercase tracking-widest text-text-faint">Expires</p>
            <p className="w-20 text-center text-[10px] uppercase tracking-widest text-text-faint">Grand</p>
          </div>
        )}

        {/* Rows or empty state */}
        {prizes.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-text-muted">No prizes yet for this hunt</p>
            <Link
              href={`/hunts/${id}/prizes/new`}
              className="text-xs text-accent hover:text-accent-hover mt-2 inline-block transition-colors"
            >
              Add first prize →
            </Link>
          </div>
        ) : (
          prizes.map((prize, i) => (
            <div
              key={prize.id}
              className={`flex items-center gap-4 py-4 ${i !== 0 ? 'border-t border-border' : ''}`}
            >
              {/* Title */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/hunts/${id}/prizes/${prize.id}`}
                  className="text-sm font-medium text-white hover:text-accent transition-colors truncate block"
                >
                  {prize.title}
                </Link>
                {prize.valueDescription && (
                  <p className="text-xs text-text-muted mt-0.5 truncate">{prize.valueDescription}</p>
                )}
              </div>

              {/* Prize type badge */}
              <div className="hidden sm:flex w-28 shrink-0 justify-center">
                <Badge
                  text={prize.prizeType}
                  className={PRIZE_TYPE_STYLES[prize.prizeType] ?? 'text-text-muted bg-surface-2'}
                />
              </div>

              {/* Sponsor name */}
              <div className="hidden md:block w-36 shrink-0">
                <p className="text-xs text-text-muted truncate">{prize.sponsor.businessName}</p>
              </div>

              {/* Minimum clues found */}
              <div className="hidden lg:block w-24 shrink-0 text-center">
                <p className="text-sm text-text-muted">{prize.minCluesFound}</p>
              </div>

              {/* Expiry date */}
              <div className="hidden xl:block w-28 shrink-0 text-right">
                <p className="text-xs text-text-muted">
                  {prize.expiryDate ? formatDate(prize.expiryDate) : '—'}
                </p>
              </div>

              {/* Grand prize indicator */}
              <div className="w-20 shrink-0 flex justify-center">
                {prize.isGrandPrize ? (
                  <span className="text-yellow-400 text-xs font-medium">★ Grand</span>
                ) : (
                  <span className="text-text-faint text-xs">—</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

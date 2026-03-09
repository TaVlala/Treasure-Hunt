// Sponsors list page — server component.
// Fetches paginated sponsors from the API with optional tier and status filters.

import Link from 'next/link';
import { Suspense } from 'react';
import { serverFetch } from '@/lib/server-api';
import type { SponsorDetail, PaginatedData } from '@treasure-hunt/shared';
import { SponsorsFilters } from './SponsorsFilters';

const PAGE_SIZE = 20;

// Format ISO date string to "Mar 9, 2026"
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format cents to dollar string e.g. "$150.00 / mo"
function formatFee(cents: number | null): string {
  if (cents === null) return '—';
  return `$${(cents / 100).toFixed(2)}/mo`;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'text-green-400 bg-green-400/10',
  paused: 'text-yellow-400 bg-yellow-400/10',
  expired: 'text-text-faint bg-surface-2',
};

const TIER_STYLES: Record<string, string> = {
  basic: 'text-text-muted bg-surface-2',
  featured: 'text-accent bg-accent/10',
  prize: 'text-purple-400 bg-purple-400/10',
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
      {text}
    </span>
  );
}

// Single row in the sponsors table
function SponsorRow({ sponsor, index }: { sponsor: SponsorDetail; index: number }) {
  return (
    <div
      className={`
        flex items-center gap-4 py-4
        ${index !== 0 ? 'border-t border-border' : ''}
      `}
    >
      {/* Business name + optional contact — takes remaining space */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/sponsors/${sponsor.id}`}
          className="text-sm font-medium text-white hover:text-accent transition-colors truncate block"
        >
          {sponsor.businessName}
        </Link>
        <p className="text-xs text-text-muted mt-0.5 truncate">
          {sponsor.contactEmail ?? sponsor.address}
        </p>
      </div>

      {/* Tier badge */}
      <div className="hidden sm:flex w-20 shrink-0 justify-center">
        <Badge
          text={sponsor.tier}
          className={TIER_STYLES[sponsor.tier] ?? 'text-text-muted bg-surface-2'}
        />
      </div>

      {/* Clue count */}
      <div className="hidden md:block w-12 shrink-0 text-center">
        <p className="text-sm text-text-muted">{sponsor.clueCount}</p>
      </div>

      {/* Monthly fee */}
      <div className="hidden lg:block w-24 shrink-0 text-right">
        <p className="text-xs text-text-muted">{formatFee(sponsor.monthlyFeeCents)}</p>
      </div>

      {/* Contract end */}
      <div className="hidden xl:block w-28 shrink-0 text-right">
        <p className="text-xs text-text-muted">
          {sponsor.contractEnd ? formatDate(sponsor.contractEnd) : '—'}
        </p>
      </div>

      {/* Status badge */}
      <div className="flex w-20 shrink-0 justify-center">
        <Badge
          text={sponsor.status}
          className={STATUS_STYLES[sponsor.status] ?? 'text-text-muted bg-surface-2'}
        />
      </div>
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{ tier?: string; status?: string; page?: string }>;
}

export default async function SponsorsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tier = params.tier;
  const status = params.status;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  // Build API query
  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (tier) qs.set('tier', tier);
  if (status) qs.set('status', status);

  const data = await serverFetch<PaginatedData<SponsorDetail>>(`/api/v1/admin/sponsors?${qs}`);
  const sponsors = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Build a URL for pagination links that preserves the current filters
  function pageUrl(p: number) {
    const u = new URLSearchParams();
    if (tier) u.set('tier', tier);
    if (status) u.set('status', status);
    if (p > 1) u.set('page', String(p));
    const str = u.toString();
    return `/sponsors${str ? `?${str}` : ''}`;
  }

  const hasFilters = tier || status;

  return (
    <div className="p-8 max-w-6xl">

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Sponsors</h1>
          <p className="text-sm text-text-muted mt-1">
            {total} sponsor{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/sponsors/new"
          className="
            inline-flex items-center gap-2 bg-accent hover:bg-accent-hover
            text-black font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors
          "
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Sponsor
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-5">
        <Suspense fallback={<div className="h-9 w-72 bg-surface rounded-lg" />}>
          <SponsorsFilters />
        </Suspense>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl px-6">

        {/* Column headers — only shown when there are rows */}
        {sponsors.length > 0 && (
          <div className="flex items-center gap-4 pb-3 pt-4 border-b border-border">
            <p className="flex-1 text-[10px] uppercase tracking-widest text-text-faint">Business</p>
            <p className="hidden sm:block w-20 text-center text-[10px] uppercase tracking-widest text-text-faint">Tier</p>
            <p className="hidden md:block w-12 text-center text-[10px] uppercase tracking-widest text-text-faint">Clues</p>
            <p className="hidden lg:block w-24 text-right text-[10px] uppercase tracking-widest text-text-faint">Fee</p>
            <p className="hidden xl:block w-28 text-right text-[10px] uppercase tracking-widest text-text-faint">Contract End</p>
            <p className="w-20 text-center text-[10px] uppercase tracking-widest text-text-faint">Status</p>
          </div>
        )}

        {/* Rows or empty/error states */}
        {data === null ? (
          <div className="py-12 text-center">
            <p className="text-sm text-text-muted">Failed to load sponsors</p>
          </div>
        ) : sponsors.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-text-muted">
              {hasFilters ? 'No sponsors match the selected filters' : 'No sponsors yet'}
            </p>
            {!hasFilters && (
              <Link
                href="/sponsors/new"
                className="text-xs text-accent hover:text-accent-hover mt-2 inline-block transition-colors"
              >
                Add your first sponsor →
              </Link>
            )}
          </div>
        ) : (
          sponsors.map((sponsor, i) => (
            <SponsorRow key={sponsor.id} sponsor={sponsor} index={i} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-text-muted">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                className="
                  text-sm text-text-muted hover:text-white
                  border border-border hover:border-border-strong
                  px-4 py-2 rounded-lg transition-colors
                "
              >
                ← Previous
              </Link>
            )}
            {data?.hasMore && (
              <Link
                href={pageUrl(page + 1)}
                className="
                  text-sm text-text-muted hover:text-white
                  border border-border hover:border-border-strong
                  px-4 py-2 rounded-lg transition-colors
                "
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

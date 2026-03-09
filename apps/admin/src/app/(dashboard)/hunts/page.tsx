// Hunt list page — server component.
// Fetches paginated hunts from the API with optional status filter and page param.

import Link from 'next/link';
import { Suspense } from 'react';
import { serverFetch } from '@/lib/server-api';
import type { Hunt, PaginatedData } from '@treasure-hunt/shared';
import { HuntsFilters } from './HuntsFilters';

const PAGE_SIZE = 20;

// Format ISO date string to "Mar 9, 2026"
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const STATUS_STYLES: Record<string, string> = {
  active: 'text-green-400 bg-green-400/10',
  draft: 'text-text-muted bg-surface-2',
  paused: 'text-yellow-400 bg-yellow-400/10',
  completed: 'text-blue-400 bg-blue-400/10',
  archived: 'text-text-faint bg-surface-2',
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'text-green-400 bg-green-400/10',
  medium: 'text-yellow-400 bg-yellow-400/10',
  hard: 'text-red-400 bg-red-400/10',
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

// Single row in the hunts table
function HuntRow({ hunt, index }: { hunt: Hunt; index: number }) {
  return (
    <div
      className={`
        flex items-center gap-4 py-4
        ${index !== 0 ? 'border-t border-border' : ''}
      `}
    >
      {/* Title + city — takes remaining space */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/hunts/${hunt.id}`}
          className="text-sm font-medium text-white hover:text-accent transition-colors truncate block"
        >
          {hunt.title}
        </Link>
        <p className="text-xs text-text-muted mt-0.5">
          {hunt.city}
          {hunt.region ? `, ${hunt.region}` : ''}
        </p>
      </div>

      {/* Hunt type badge */}
      <div className="hidden sm:flex w-12 shrink-0 justify-center">
        <Badge
          text={hunt.huntType}
          className={
            hunt.huntType === 'paid'
              ? 'text-accent bg-accent/10'
              : 'text-text-muted bg-surface-2'
          }
        />
      </div>

      {/* Difficulty badge */}
      <div className="hidden md:flex w-20 shrink-0 justify-center">
        <Badge
          text={hunt.difficulty}
          className={DIFFICULTY_STYLES[hunt.difficulty] ?? 'text-text-muted bg-surface-2'}
        />
      </div>

      {/* Status badge */}
      <div className="flex w-24 shrink-0 justify-center">
        <Badge
          text={hunt.status}
          className={STATUS_STYLES[hunt.status] ?? 'text-text-muted bg-surface-2'}
        />
      </div>

      {/* Created date */}
      <div className="hidden lg:block w-28 shrink-0 text-right">
        <p className="text-xs text-text-muted">{formatDate(hunt.createdAt)}</p>
      </div>
    </div>
  );
}

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function HuntsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = params.status;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  // Build API query
  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (status) qs.set('status', status);

  const data = await serverFetch<PaginatedData<Hunt>>(`/api/v1/admin/hunts?${qs}`);
  const hunts = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Build a URL for pagination links that preserves the current status filter
  function pageUrl(p: number) {
    const u = new URLSearchParams();
    if (status) u.set('status', status);
    if (p > 1) u.set('page', String(p));
    const str = u.toString();
    return `/hunts${str ? `?${str}` : ''}`;
  }

  return (
    <div className="p-8 max-w-6xl">

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Hunts</h1>
          <p className="text-sm text-text-muted mt-1">
            {total} hunt{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/hunts/new"
          className="
            inline-flex items-center gap-2 bg-accent hover:bg-accent-hover
            text-black font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors
          "
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Hunt
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-5">
        <Suspense fallback={<div className="h-9 w-40 bg-surface rounded-lg" />}>
          <HuntsFilters />
        </Suspense>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl px-6">

        {/* Column headers — only shown when there are rows */}
        {hunts.length > 0 && (
          <div className="flex items-center gap-4 pb-3 pt-4 border-b border-border">
            <p className="flex-1 text-[10px] uppercase tracking-widest text-text-faint">Hunt</p>
            <p className="hidden sm:block w-12 text-center text-[10px] uppercase tracking-widest text-text-faint">Type</p>
            <p className="hidden md:block w-20 text-center text-[10px] uppercase tracking-widest text-text-faint">Difficulty</p>
            <p className="w-24 text-center text-[10px] uppercase tracking-widest text-text-faint">Status</p>
            <p className="hidden lg:block w-28 text-right text-[10px] uppercase tracking-widest text-text-faint">Created</p>
          </div>
        )}

        {/* Rows or empty/error states */}
        {data === null ? (
          <div className="py-12 text-center">
            <p className="text-sm text-text-muted">Failed to load hunts</p>
          </div>
        ) : hunts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-text-muted">
              {status ? `No ${status} hunts` : 'No hunts yet'}
            </p>
            {!status && (
              <Link
                href="/hunts/new"
                className="text-xs text-accent hover:text-accent-hover mt-2 inline-block transition-colors"
              >
                Create your first hunt →
              </Link>
            )}
          </div>
        ) : (
          hunts.map((hunt, i) => <HuntRow key={hunt.id} hunt={hunt} index={i} />)
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

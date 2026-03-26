// Hunt list page — server component.
// Fetches paginated hunts from the API with optional status filter and page param.

import Link from 'next/link';
import { Suspense } from 'react';
import { serverFetch } from '@/lib/server-api';
import type { Hunt, PaginatedData } from '@treasure-hunt/shared';
import { HuntsFilters } from './HuntsFilters';
import { BulkHuntManager } from './BulkHuntManager';

const PAGE_SIZE = 20;

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

        {/* Rows with bulk selection — or empty/error states */}
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
          <BulkHuntManager hunts={hunts} />
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

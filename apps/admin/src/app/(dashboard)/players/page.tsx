// Players list page — server component.
// Fetches paginated player accounts from the API with optional search and status filter.

import Link from 'next/link';
import { Suspense } from 'react';
import { serverFetch } from '@/lib/server-api';
import type { PaginatedData } from '@treasure-hunt/shared';
import { PlayersFilters } from './PlayersFilters';
import { PlayerStatusToggle } from './PlayerStatusToggle';

const PAGE_SIZE = 20;

// Inline type — matches the backend PlayerListItem response shape
interface PlayerListItem {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  homeCity: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  sessionCount: number;
}

// Format ISO date string to "Mar 9, 2026" or "—" when null
function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function PlayersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search?.trim() || undefined;
  const status = params.status || undefined;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  // Build API query string
  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (search) qs.set('search', search);
  if (status) qs.set('status', status);

  const data = await serverFetch<PaginatedData<PlayerListItem>>(
    `/api/v1/admin/players?${qs}`,
  );
  const players = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Builds a pagination URL that preserves current filters
  function pageUrl(p: number) {
    const u = new URLSearchParams();
    if (search) u.set('search', search);
    if (status) u.set('status', status);
    if (p > 1) u.set('page', String(p));
    const str = u.toString();
    return `/players${str ? `?${str}` : ''}`;
  }

  return (
    <div className="p-8 max-w-6xl">

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Players</h1>
          <p className="text-sm text-text-muted mt-1">
            {total} player{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5">
        <Suspense fallback={<div className="h-9 w-72 bg-surface rounded-lg" />}>
          <PlayersFilters />
        </Suspense>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl px-6">

        {/* Column headers — only shown when there are rows */}
        {players.length > 0 && (
          <div className="flex items-center gap-4 pb-3 pt-4 border-b border-border">
            <p className="flex-1 min-w-0 text-[10px] uppercase tracking-widest text-text-faint">
              Player
            </p>
            <p className="hidden md:block w-32 text-[10px] uppercase tracking-widest text-text-faint">
              City
            </p>
            <p className="hidden sm:block w-16 text-center text-[10px] uppercase tracking-widest text-text-faint">
              Sessions
            </p>
            <p className="w-20 text-center text-[10px] uppercase tracking-widest text-text-faint">
              Status
            </p>
            <p className="hidden lg:block w-28 text-right text-[10px] uppercase tracking-widest text-text-faint">
              Last Active
            </p>
            <p className="hidden xl:block w-28 text-right text-[10px] uppercase tracking-widest text-text-faint">
              Joined
            </p>
          </div>
        )}

        {/* Rows or empty/error states */}
        {data === null ? (
          <div className="py-12 text-center">
            <p className="text-sm text-text-muted">Failed to load players</p>
          </div>
        ) : players.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-text-muted">
              {search || status ? 'No players match your filters' : 'No players yet'}
            </p>
          </div>
        ) : (
          players.map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center gap-4 py-4 ${i !== 0 ? 'border-t border-border' : ''}`}
            >
              {/* Display name + email */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {player.displayName}
                </p>
                <p className="text-xs text-text-muted mt-0.5 truncate">{player.email}</p>
              </div>

              {/* City */}
              <div className="hidden md:block w-32 shrink-0">
                <p className="text-xs text-text-muted truncate">
                  {player.homeCity ?? '—'}
                </p>
              </div>

              {/* Session count */}
              <div className="hidden sm:flex w-16 shrink-0 justify-center">
                <span className="text-xs text-text-muted tabular-nums">
                  {player.sessionCount}
                </span>
              </div>

              {/* Status toggle — client component */}
              <div className="flex w-20 shrink-0 justify-center">
                <PlayerStatusToggle
                  playerId={player.id}
                  isActive={player.isActive}
                />
              </div>

              {/* Last active date */}
              <div className="hidden lg:block w-28 shrink-0 text-right">
                <p className="text-xs text-text-muted">{formatDate(player.lastLoginAt)}</p>
              </div>

              {/* Joined date */}
              <div className="hidden xl:block w-28 shrink-0 text-right">
                <p className="text-xs text-text-muted">{formatDate(player.createdAt)}</p>
              </div>
            </div>
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

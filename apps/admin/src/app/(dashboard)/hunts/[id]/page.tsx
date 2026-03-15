// Hunt detail page — server component.
// Fetches the hunt (with clue count) and initial clue list, then renders
// the ClueManager client component for interactive map-based clue placement.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { serverFetch } from '@/lib/server-api';
import type { HuntDetail, AdminClue } from '@treasure-hunt/shared';
import { ClueManager } from './ClueManager';

// Status badge colours — same palette as the hunt list page
const STATUS_STYLES: Record<string, string> = {
  active: 'text-green-400 bg-green-400/10',
  draft: 'text-text-muted bg-surface-2',
  paused: 'text-yellow-400 bg-yellow-400/10',
  completed: 'text-blue-400 bg-blue-400/10',
  archived: 'text-text-faint bg-surface-2',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HuntDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch hunt detail and clues in parallel
  const [hunt, clues] = await Promise.all([
    serverFetch<HuntDetail>(`/api/v1/admin/hunts/${id}`),
    serverFetch<AdminClue[]>(`/api/v1/admin/hunts/${id}/clues`),
  ]);

  // 404 if hunt doesn't exist or auth failed
  if (!hunt) notFound();

  const statusStyle = STATUS_STYLES[hunt.status] ?? 'text-text-muted bg-surface-2';

  return (
    // Full viewport height, flex column so ClueManager fills remaining space
    <div className="flex flex-col h-screen overflow-hidden">

      {/* Top bar */}
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

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={`/hunts/${id}/prizes`}
              className="
                text-xs text-text-muted hover:text-white border border-border hover:border-border-strong
                px-3 py-1.5 rounded-lg transition-colors
              "
            >
              Prizes
            </Link>
            <span
              className={`
                text-[10px] uppercase tracking-widest font-medium
                px-2.5 py-1 rounded-full ${statusStyle}
              `}
            >
              {hunt.status}
            </span>
          </div>
        </div>
      </header>

      {/* ClueManager fills the remaining height */}
      <ClueManager hunt={hunt} initialClues={clues ?? []} />
    </div>
  );
}

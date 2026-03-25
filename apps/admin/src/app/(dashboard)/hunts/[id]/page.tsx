// Hunt detail page — server component.
// Fetches the hunt (with clue count), initial clue list, and per-hunt analytics in parallel,
// then renders the HuntHeader client component + ClueManager for interactive map-based clue placement.

import { notFound } from 'next/navigation';
import { serverFetch } from '@/lib/server-api';
import type { HuntDetail, AdminClue } from '@treasure-hunt/shared';
import { ClueManager } from './ClueManager';
import { HuntHeader } from './HuntHeader';

// Analytics shape returned by GET /admin/analytics/hunts/:huntId
interface HuntAnalytics {
  huntId: string;
  totalClueFoundEvents: number;
  totalHuntCompleteEvents: number;
  averageScore: number | null;
  clueFunnel: unknown[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HuntDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch hunt detail, clues, and analytics in parallel
  const [hunt, clues, analytics] = await Promise.all([
    serverFetch<HuntDetail>(`/api/v1/admin/hunts/${id}`),
    serverFetch<AdminClue[]>(`/api/v1/admin/hunts/${id}/clues`),
    serverFetch<HuntAnalytics>(`/api/v1/admin/analytics/hunts/${id}`),
  ]);

  // 404 if hunt doesn't exist or auth failed
  if (!hunt) notFound();

  return (
    // Full viewport height, flex column so ClueManager fills remaining space
    <div className="flex flex-col h-screen overflow-hidden">

      {/* Top bar — client component to support status transitions */}
      <HuntHeader
        hunt={hunt}
        analytics={analytics}
      />

      {/* ClueManager fills the remaining height */}
      <ClueManager hunt={hunt} initialClues={clues ?? []} />
    </div>
  );
}

// Sponsor detail / edit page — server component.
// Fetches the sponsor by ID and renders the EditSponsorForm client component.

import { notFound } from 'next/navigation';
import { serverFetch } from '@/lib/server-api';
import type { SponsorDetail } from '@treasure-hunt/shared';
import { EditSponsorForm } from './EditSponsorForm';
import { Breadcrumb } from '@/components/Breadcrumb';

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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SponsorDetailPage({ params }: PageProps) {
  const { id } = await params;

  const sponsor = await serverFetch<SponsorDetail>(`/api/v1/admin/sponsors/${id}`);

  // 404 if sponsor doesn't exist or auth failed
  if (!sponsor) notFound();

  const statusStyle = STATUS_STYLES[sponsor.status] ?? 'text-text-muted bg-surface-2';
  const tierStyle = TIER_STYLES[sponsor.tier] ?? 'text-text-muted bg-surface-2';

  return (
    <div className="p-8 max-w-3xl">

      {/* Breadcrumb + header */}
      <div className="mb-8">
        <div className="mb-3">
          <Breadcrumb
            items={[
              { label: 'Sponsors', href: '/sponsors' },
              { label: sponsor.businessName },
            ]}
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              {sponsor.businessName}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {sponsor.address}
              {' · '}
              {sponsor.clueCount} clue{sponsor.clueCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Tier + status badges */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`
                text-[10px] uppercase tracking-widest font-medium
                px-2.5 py-1 rounded-full ${tierStyle}
              `}
            >
              {sponsor.tier}
            </span>
            <span
              className={`
                text-[10px] uppercase tracking-widest font-medium
                px-2.5 py-1 rounded-full ${statusStyle}
              `}
            >
              {sponsor.status}
            </span>
          </div>
        </div>
      </div>

      <EditSponsorForm sponsor={sponsor} />
    </div>
  );
}

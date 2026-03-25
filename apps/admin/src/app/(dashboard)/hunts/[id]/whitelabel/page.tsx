// White-label settings page for a specific hunt — server component shell + client form.
// Fetches the hunt, then renders WhitelabelForm with current branding values pre-filled.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { serverFetch } from '@/lib/server-api';
import type { HuntDetail } from '@treasure-hunt/shared';
import { WhitelabelForm } from './WhitelabelForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WhitelabelPage({ params }: PageProps) {
  const { id } = await params;

  const hunt = await serverFetch<HuntDetail>(`/api/v1/admin/hunts/${id}`);
  if (!hunt) notFound();

  return (
    <div className="p-8 max-w-2xl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-text-muted mb-6">
        <Link href="/hunts" className="hover:text-white transition-colors">
          Hunts
        </Link>
        <svg width="12" height="12" fill="none" viewBox="0 0 12 12" className="text-text-faint">
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <Link href={`/hunts/${id}`} className="hover:text-white transition-colors truncate max-w-xs">
          {hunt.title}
        </Link>
        <svg width="12" height="12" fill="none" viewBox="0 0 12 12" className="text-text-faint">
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-white">White-label</span>
      </div>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">White-label</h1>
        <p className="text-sm text-text-muted mt-1">
          Customise branding shown to players for <span className="text-white">{hunt.title}</span>
        </p>
      </div>

      {/* Form */}
      <WhitelabelForm
        huntId={id}
        initialName={hunt.whitelabelName ?? ''}
        initialLogoUrl={hunt.whitelabelLogoUrl ?? ''}
        initialColor={hunt.whitelabelColor ?? '#3B82F6'}
      />
    </div>
  );
}

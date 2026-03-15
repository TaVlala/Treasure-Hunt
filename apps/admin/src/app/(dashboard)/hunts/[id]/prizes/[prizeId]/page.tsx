// Prize edit page — server component.
// Fetches the prize by ID and renders the EditPrizeForm client component.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverFetch } from '@/lib/server-api';
import type { PrizeType } from '@treasure-hunt/shared';
import { EditPrizeForm } from './EditPrizeForm';

// Admin prize shape returned by /api/v1/admin/prizes/:id
interface AdminPrize {
  id: string;
  sponsorId: string;
  huntId: string;
  title: string;
  description: string | null;
  prizeType: PrizeType;
  valueDescription: string | null;
  expiryDate: string | null;
  termsConditions: string | null;
  imageUrl: string | null;
  isGrandPrize: boolean;
  minCluesFound: number;
  redemptionLimit: number | null;
  redemptionsUsed: number;
  createdAt: string;
  sponsor: { id: string; businessName: string };
}

interface PageProps {
  params: Promise<{ id: string; prizeId: string }>;
}

export default async function EditPrizePage({ params }: PageProps) {
  const { id, prizeId } = await params;

  const prize = await serverFetch<AdminPrize>(`/api/v1/admin/prizes/${prizeId}`);
  if (!prize) notFound();

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
        <Link href={`/hunts/${id}`} className="hover:text-white transition-colors">
          {id.slice(0, 8)}…
        </Link>
        <svg width="12" height="12" fill="none" viewBox="0 0 12 12" className="text-text-faint">
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <Link href={`/hunts/${id}/prizes`} className="hover:text-white transition-colors">
          Prizes
        </Link>
        <svg width="12" height="12" fill="none" viewBox="0 0 12 12" className="text-text-faint">
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-white truncate max-w-xs">{prize.title}</span>
      </div>

      <h1 className="text-2xl font-semibold text-white tracking-tight mb-8">Edit Prize</h1>

      <EditPrizeForm prize={prize} huntId={id} />
    </div>
  );
}

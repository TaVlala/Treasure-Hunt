// New prize page — server component wrapper.
// Renders the CreatePrizeForm client component, passing the huntId from URL params.

import Link from 'next/link';
import { CreatePrizeForm } from './CreatePrizeForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewPrizePage({ params }: PageProps) {
  const { id } = await params;

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
        <span className="text-white">New</span>
      </div>

      <h1 className="text-2xl font-semibold text-white tracking-tight mb-8">Add Prize</h1>

      <CreatePrizeForm huntId={id} />
    </div>
  );
}

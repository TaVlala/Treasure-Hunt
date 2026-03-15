// DuplicateButton — client component that calls POST /api/v1/admin/hunts/:id/duplicate
// and redirects to the new hunt's edit page on success.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientFetch } from '@/lib/api';
import type { Hunt } from '@treasure-hunt/shared';

// Renders a small button that duplicates a hunt as a new DRAFT and navigates to it
export function DuplicateButton({ huntId }: { huntId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Confirms with the user, calls the duplicate endpoint, then navigates to the new hunt
  async function handleDuplicate() {
    if (!confirm('Duplicate this hunt as a new draft?')) return;
    try {
      setLoading(true);
      const result = await clientFetch<Hunt>(`/api/v1/admin/hunts/${huntId}/duplicate`, { method: 'POST' });
      router.push(`/hunts/${result.id}`);
    } catch {
      alert('Failed to duplicate hunt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDuplicate}
      disabled={loading}
      className="text-xs text-text-muted hover:text-white transition-colors disabled:opacity-40"
      title="Duplicate hunt"
    >
      {loading ? '…' : 'Duplicate'}
    </button>
  );
}

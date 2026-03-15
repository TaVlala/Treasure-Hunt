// Client component — activate / deactivate button for a single player row.
// Calls PATCH /api/v1/admin/players/:id/status then triggers a server-component refresh.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientFetch } from '@/lib/api';

interface Props {
  playerId: string;
  isActive: boolean;
}

// Renders a small toggle button; optimistically shows a loading state while the PATCH runs
export function PlayerStatusToggle({ playerId, isActive }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Sends the status change request and refreshes the server component tree on success
  async function handleToggle() {
    setLoading(true);
    try {
      await clientFetch(`/api/v1/admin/players/${playerId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !isActive }),
      });
      router.refresh();
    } catch {
      // Silently fail — the button returns to its original state automatically
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`
        text-[10px] uppercase tracking-widest font-medium
        px-2.5 py-1 rounded-full transition-colors
        ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${
          isActive
            ? 'text-green-400 bg-green-400/10 hover:bg-green-400/20'
            : 'text-text-muted bg-surface-2 hover:bg-surface-2/80'
        }
      `}
    >
      {loading ? '…' : isActive ? 'Active' : 'Inactive'}
    </button>
  );
}

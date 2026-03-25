// StatusActionBar — client component that renders status-transition buttons for a hunt.
// Sends PATCH /api/v1/admin/hunts/:id with the new status and calls onStatusChange on success.

'use client';

import { useState } from 'react';
import { clientFetch } from '@/lib/api';
import type { HuntStatus } from '@treasure-hunt/shared';

interface Props {
  huntId: string;
  status: HuntStatus;
  // Parent re-renders with updated status after a successful transition
  onStatusChange: (next: HuntStatus) => void;
}

// Sends a PATCH request to update the hunt status
async function patchStatus(huntId: string, next: HuntStatus): Promise<void> {
  await clientFetch(`/api/v1/admin/hunts/${huntId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: next }),
  });
}

export function StatusActionBar({ huntId, status, onStatusChange }: Props) {
  const [loading, setLoading] = useState<HuntStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fires the status transition and delegates state update to parent
  async function handleTransition(next: HuntStatus) {
    setError(null);
    setLoading(next);
    try {
      await patchStatus(huntId, next);
      onStatusChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(null);
    }
  }

  // Shared button classes for primary action (e.g. Publish, Resume)
  const primaryBtn =
    'inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ' +
    'bg-accent hover:bg-accent-hover text-black disabled:opacity-50 disabled:cursor-not-allowed';

  // Shared button classes for secondary action (e.g. Pause, Archive)
  const secondaryBtn =
    'inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ' +
    'border border-border hover:border-border-strong text-text-muted hover:text-white ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-wrap items-center gap-2">

      {/* DRAFT → Publish */}
      {status === 'draft' && (
        <button
          className={primaryBtn}
          disabled={loading !== null}
          onClick={() => handleTransition('active')}
        >
          {loading === 'active' ? 'Publishing…' : 'Publish'}
        </button>
      )}

      {/* ACTIVE → Pause + Archive */}
      {status === 'active' && (
        <>
          <button
            className={secondaryBtn}
            disabled={loading !== null}
            onClick={() => handleTransition('paused')}
          >
            {loading === 'paused' ? 'Pausing…' : 'Pause'}
          </button>
          <button
            className={secondaryBtn}
            disabled={loading !== null}
            onClick={() => handleTransition('archived')}
          >
            {loading === 'archived' ? 'Archiving…' : 'Archive'}
          </button>
        </>
      )}

      {/* PAUSED → Resume */}
      {status === 'paused' && (
        <button
          className={primaryBtn}
          disabled={loading !== null}
          onClick={() => handleTransition('active')}
        >
          {loading === 'active' ? 'Resuming…' : 'Resume'}
        </button>
      )}

      {/* ARCHIVED → badge only, no actions */}
      {status === 'archived' && (
        <span className="text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 rounded-full text-text-faint bg-surface-2">
          Archived
        </span>
      )}

      {/* COMPLETED → badge only, no actions */}
      {status === 'completed' && (
        <span className="text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 rounded-full text-blue-400 bg-blue-400/10">
          Completed
        </span>
      )}

      {/* Inline error message */}
      {error && (
        <span className="text-xs text-red-400 ml-1">{error}</span>
      )}
    </div>
  );
}

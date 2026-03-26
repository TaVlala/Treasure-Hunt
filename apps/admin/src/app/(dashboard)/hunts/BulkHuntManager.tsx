// BulkHuntManager — client component that adds checkbox selection + bulk actions to the hunts list.
// Receives the fetched hunts array as props from the server page component.

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clientFetch } from '@/lib/api';
import type { Hunt } from '@treasure-hunt/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BulkAction = 'publish' | 'archive' | 'duplicate';

interface BulkResult {
  affected: number;
  newIds?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const STATUS_STYLES: Record<string, string> = {
  active:    'text-green-400 bg-green-400/10',
  draft:     'text-text-muted bg-surface-2',
  paused:    'text-yellow-400 bg-yellow-400/10',
  completed: 'text-blue-400 bg-blue-400/10',
  archived:  'text-text-faint bg-surface-2',
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy:   'text-green-400 bg-green-400/10',
  medium: 'text-yellow-400 bg-yellow-400/10',
  hard:   'text-red-400 bg-red-400/10',
};

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span className={`text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 rounded-full ${className}`}>
      {text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single row with checkbox
// ---------------------------------------------------------------------------

function HuntRow({
  hunt,
  index,
  selected,
  onToggle,
}: {
  hunt: Hunt;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-4 py-4 ${index !== 0 ? 'border-t border-border' : ''} ${selected ? 'bg-accent/5' : ''} transition-colors`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(hunt.id)}
        className="w-4 h-4 rounded border-border bg-surface-2 accent-accent shrink-0 cursor-pointer"
        aria-label={`Select ${hunt.title}`}
      />

      {/* Title + city */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/hunts/${hunt.id}`}
          className="text-sm font-medium text-white hover:text-accent transition-colors truncate block"
        >
          {hunt.title}
        </Link>
        <p className="text-xs text-text-muted mt-0.5">
          {hunt.city}{hunt.region ? `, ${hunt.region}` : ''}
        </p>
      </div>

      {/* Type */}
      <div className="hidden sm:flex w-12 shrink-0 justify-center">
        <Badge
          text={hunt.huntType}
          className={hunt.huntType === 'paid' ? 'text-accent bg-accent/10' : 'text-text-muted bg-surface-2'}
        />
      </div>

      {/* Difficulty */}
      <div className="hidden md:flex w-20 shrink-0 justify-center">
        <Badge
          text={hunt.difficulty}
          className={DIFFICULTY_STYLES[hunt.difficulty] ?? 'text-text-muted bg-surface-2'}
        />
      </div>

      {/* Status */}
      <div className="flex w-24 shrink-0 justify-center">
        <Badge
          text={hunt.status}
          className={STATUS_STYLES[hunt.status] ?? 'text-text-muted bg-surface-2'}
        />
      </div>

      {/* Created date */}
      <div className="hidden lg:block w-28 shrink-0 text-right">
        <p className="text-xs text-text-muted">{formatDate(hunt.createdAt)}</p>
      </div>

      {/* Per-row duplicate (single) */}
      <div className="hidden lg:flex w-20 shrink-0 justify-end">
        <SingleDuplicateButton huntId={hunt.id} />
      </div>
    </div>
  );
}

// Inline per-row duplicate button (unchanged behaviour from old DuplicateButton)
function SingleDuplicateButton({ huntId }: { huntId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!confirm('Duplicate this hunt as a new draft?')) return;
    setLoading(true);
    try {
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
      onClick={handle}
      disabled={loading}
      className="text-xs text-text-muted hover:text-white transition-colors disabled:opacity-40"
    >
      {loading ? '…' : 'Duplicate'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Bulk action bar (floats at bottom when selection active)
// ---------------------------------------------------------------------------

function BulkActionBar({
  count,
  loading,
  onAction,
  onClear,
}: {
  count: number;
  loading: boolean;
  onAction: (action: BulkAction) => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1a1a1a] border border-[#333] rounded-2xl px-5 py-3 shadow-2xl">
      <p className="text-sm text-white font-medium mr-1">
        {count} selected
      </p>
      <div className="w-px h-4 bg-[#333]" />
      <button
        onClick={() => onAction('publish')}
        disabled={loading}
        className="text-xs text-green-400 hover:text-green-300 font-medium px-3 py-1.5 rounded-lg hover:bg-green-400/10 transition-colors disabled:opacity-40"
      >
        Publish
      </button>
      <button
        onClick={() => onAction('archive')}
        disabled={loading}
        className="text-xs text-[#888] hover:text-white font-medium px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-40"
      >
        Archive
      </button>
      <button
        onClick={() => onAction('duplicate')}
        disabled={loading}
        className="text-xs text-[#f59e0b] hover:text-[#d97706] font-medium px-3 py-1.5 rounded-lg hover:bg-[#f59e0b]/10 transition-colors disabled:opacity-40"
      >
        Duplicate
      </button>
      <div className="w-px h-4 bg-[#333]" />
      <button
        onClick={onClear}
        disabled={loading}
        className="text-xs text-[#555] hover:text-white transition-colors disabled:opacity-40"
        aria-label="Clear selection"
      >
        ✕
      </button>
      {loading && (
        <span className="text-xs text-[#888] animate-pulse ml-1">Working…</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function BulkHuntManager({ hunts }: { hunts: Hunt[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const allSelected = hunts.length > 0 && selected.size === hunts.length;

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(hunts.map((h) => h.id)));
  }, [allSelected, hunts]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  async function handleBulkAction(action: BulkAction) {
    const ids = Array.from(selected);
    const label = action === 'publish' ? 'publish' : action === 'archive' ? 'archive' : 'duplicate';
    if (!confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${ids.length} hunt(s)?`)) return;

    setLoading(true);
    try {
      await clientFetch<BulkResult>('/api/v1/admin/hunts/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids, action }),
      });
      clearSelection();
      router.refresh();
    } catch {
      alert(`Failed to ${label} selected hunts`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Select-all header row */}
      {hunts.length > 0 && (
        <div className="flex items-center gap-4 pb-3 pt-4 border-b border-border">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-4 h-4 rounded border-border bg-surface-2 accent-accent shrink-0 cursor-pointer"
            aria-label="Select all hunts"
          />
          <p className="flex-1 text-[10px] uppercase tracking-widest text-text-faint">Hunt</p>
          <p className="hidden sm:block w-12 text-center text-[10px] uppercase tracking-widest text-text-faint">Type</p>
          <p className="hidden md:block w-20 text-center text-[10px] uppercase tracking-widest text-text-faint">Difficulty</p>
          <p className="w-24 text-center text-[10px] uppercase tracking-widest text-text-faint">Status</p>
          <p className="hidden lg:block w-28 text-right text-[10px] uppercase tracking-widest text-text-faint">Created</p>
          <p className="hidden lg:block w-20 text-right text-[10px] uppercase tracking-widest text-text-faint">Actions</p>
        </div>
      )}

      {/* Hunt rows */}
      {hunts.map((hunt, i) => (
        <HuntRow
          key={hunt.id}
          hunt={hunt}
          index={i}
          selected={selected.has(hunt.id)}
          onToggle={toggleOne}
        />
      ))}

      {/* Floating bulk action bar */}
      {selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          loading={loading}
          onAction={handleBulkAction}
          onClear={clearSelection}
        />
      )}
    </>
  );
}

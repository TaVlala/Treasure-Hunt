// Client component — status filter dropdown for the hunts list.
// Updates URL search params on change; the server component re-fetches automatically.

'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { HuntStatus } from '@treasure-hunt/shared';

const STATUS_OPTIONS: { value: HuntStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export function HuntsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') ?? '';

  // Pushes a new URL param, resetting to page 1
  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={status}
        onChange={(e) => updateParam('status', e.target.value)}
        className="
          bg-surface-2 border border-border text-sm text-white rounded-lg px-3 py-2
          focus:outline-none focus:border-accent transition-colors cursor-pointer
        "
      >
        {STATUS_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value} className="bg-surface-2">
            {label}
          </option>
        ))}
      </select>

      {status && (
        <button
          onClick={() => updateParam('status', '')}
          className="text-xs text-text-muted hover:text-white transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

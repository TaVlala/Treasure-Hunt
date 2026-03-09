// Client component — tier and status filter dropdowns for the sponsors list.
// Updates URL search params on change; the server component re-fetches automatically.

'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { SponsorStatus, SponsorTier } from '@treasure-hunt/shared';

const TIER_OPTIONS: { value: SponsorTier | ''; label: string }[] = [
  { value: '', label: 'All Tiers' },
  { value: 'basic', label: 'Basic' },
  { value: 'featured', label: 'Featured' },
  { value: 'prize', label: 'Prize' },
];

const STATUS_OPTIONS: { value: SponsorStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'expired', label: 'Expired' },
];

const selectCls =
  'bg-surface-2 border border-border text-sm text-white rounded-lg px-3 py-2 ' +
  'focus:outline-none focus:border-accent transition-colors cursor-pointer';

export function SponsorsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tier = searchParams.get('tier') ?? '';
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

  const hasFilters = tier || status;

  return (
    <div className="flex items-center gap-3">
      <select
        value={tier}
        onChange={(e) => updateParam('tier', e.target.value)}
        className={selectCls}
      >
        {TIER_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value} className="bg-surface-2">
            {label}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => updateParam('status', e.target.value)}
        className={selectCls}
      >
        {STATUS_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value} className="bg-surface-2">
            {label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={() => {
            const params = new URLSearchParams();
            router.push(pathname + (params.toString() ? `?${params.toString()}` : ''));
          }}
          className="text-xs text-text-muted hover:text-white transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

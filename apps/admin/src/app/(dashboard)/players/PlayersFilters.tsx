// Client component — search input + status filter for the players list.
// Updates URL search params on change; the server component re-fetches automatically.

'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useRef } from 'react';

// Pushes updated params to the URL, resetting to page 1
export function PlayersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';

  // Debounce timer ref — avoids firing a navigation on every keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Updates a single URL param and resets the page to 1
  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  // Debounced handler for the search text input (300 ms delay)
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParam('search', value);
    }, 300);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Free-text search input */}
      <input
        type="text"
        defaultValue={search}
        onChange={handleSearchChange}
        placeholder="Search by name or email…"
        className="
          bg-surface-2 border border-border text-sm text-white rounded-lg px-3 py-2
          placeholder:text-text-faint focus:outline-none focus:border-accent transition-colors
          w-56
        "
      />

      {/* Status filter dropdown */}
      <select
        value={status}
        onChange={(e) => updateParam('status', e.target.value)}
        className="
          bg-surface-2 border border-border text-sm text-white rounded-lg px-3 py-2
          focus:outline-none focus:border-accent transition-colors cursor-pointer
        "
      >
        <option value="" className="bg-surface-2">All Players</option>
        <option value="active" className="bg-surface-2">Active</option>
        <option value="inactive" className="bg-surface-2">Inactive</option>
      </select>

      {/* Clear all filters link */}
      {(search || status) && (
        <button
          onClick={() => {
            const params = new URLSearchParams();
            router.push(pathname + (params.toString() ? `?${params}` : ''));
          }}
          className="text-xs text-text-muted hover:text-white transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

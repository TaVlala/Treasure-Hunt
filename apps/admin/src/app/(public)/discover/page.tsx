// Public hunt directory — server component.
// Fetches active hunts from the public API and renders a searchable grid.

import type { Hunt, PaginatedData } from '@treasure-hunt/shared';
import CityFilter from './CityFilter';

const PUBLIC_API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type HuntWithCount = Hunt & { clueCount: number };

// Fetches active hunts from the public (no-auth) endpoint
async function fetchHunts(city?: string): Promise<HuntWithCount[]> {
  try {
    const qs = new URLSearchParams({ pageSize: '24' });
    if (city) qs.set('city', city);

    const res = await fetch(`${PUBLIC_API}/api/v1/public/hunts?${qs}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];

    const json = (await res.json()) as { data: PaginatedData<HuntWithCount> };
    return json.data.items;
  } catch {
    return [];
  }
}

interface PageProps {
  searchParams: Promise<{ city?: string }>;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const hunts = await fetchHunts(params.city);

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">

      {/* Page heading */}
      <div className="mb-10">
        <p className="text-xs uppercase tracking-widest text-amber-400/60 mb-3 font-medium">
          Explore
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Active Hunts
        </h1>
        <p className="text-white/40 mt-2 text-sm">
          {hunts.length > 0
            ? `${hunts.length} hunt${hunts.length !== 1 ? 's' : ''} available`
            : 'Check back soon for new hunts'}
        </p>
      </div>

      {/* Client-side city filter + grid */}
      <CityFilter hunts={hunts} />

    </div>
  );
}

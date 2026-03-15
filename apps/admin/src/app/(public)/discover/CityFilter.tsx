// Client component — city search input that filters the displayed hunt list client-side.
// Receives all hunts as props, renders a text input and filters by city/title.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Hunt } from '@treasure-hunt/shared';

type HuntWithCount = Hunt & { clueCount: number };

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'text-green-400 bg-green-400/10',
  medium: 'text-amber-400 bg-amber-400/10',
  hard: 'text-red-400 bg-red-400/10',
};

// Formats ticket price cents to a readable string
function formatPrice(cents: number | null, currency: string): string {
  if (cents === null || cents === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

// Single hunt card
function HuntCard({ hunt }: { hunt: HuntWithCount }) {
  return (
    <Link
      href={`/discover/${hunt.slug}`}
      className="group bg-white/[0.03] border border-white/[0.07] rounded-xl p-5 flex flex-col gap-3 hover:border-amber-400/30 transition-colors"
    >
      {/* Cover image or placeholder */}
      <div className="w-full aspect-video rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
        {hunt.thumbnailUrl || hunt.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hunt.thumbnailUrl ?? hunt.coverImageUrl ?? ''}
            alt={hunt.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-4xl">🗺️</span>
        )}
      </div>

      {/* City + region */}
      <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
        {hunt.city}{hunt.region ? `, ${hunt.region}` : ''}
      </p>

      {/* Title */}
      <h3 className="text-white font-semibold text-lg leading-snug group-hover:text-amber-400 transition-colors">
        {hunt.title}
      </h3>

      {/* Difficulty badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 rounded-full ${DIFFICULTY_STYLES[hunt.difficulty] ?? 'text-white/40 bg-white/5'}`}
        >
          {hunt.difficulty}
        </span>
        {hunt.huntType === 'paid' && (
          <span className="text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 rounded-full text-amber-400 bg-amber-400/10">
            Paid
          </span>
        )}
        {hunt.teamMode !== 'solo' && (
          <span className="text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 rounded-full text-blue-400 bg-blue-400/10">
            Team
          </span>
        )}
      </div>

      {/* Clue count + price */}
      <div className="flex items-center justify-between mt-auto">
        <p className="text-white/30 text-xs">
          {hunt.clueCount} clue{hunt.clueCount !== 1 ? 's' : ''}
        </p>
        <p className="text-white/40 text-xs font-medium">
          {formatPrice(hunt.ticketPriceCents, hunt.currency)}
        </p>
      </div>

      {/* CTA */}
      <p className="text-amber-400 text-sm font-medium group-hover:text-amber-300 transition-colors">
        View Details →
      </p>
    </Link>
  );
}

interface Props {
  hunts: HuntWithCount[];
}

// City filter + hunt grid — client-rendered so the filter is interactive
export default function CityFilter({ hunts }: Props) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? hunts.filter(
        (h) =>
          h.city.toLowerCase().includes(query.toLowerCase()) ||
          h.title.toLowerCase().includes(query.toLowerCase()) ||
          (h.region ?? '').toLowerCase().includes(query.toLowerCase()),
      )
    : hunts;

  return (
    <div>
      {/* Search input */}
      <div className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by city or hunt name…"
          className="w-full max-w-sm bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-400/40 transition-colors"
        />
      </div>

      {/* Grid or empty state */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-5xl mb-4">🗺️</p>
          <p className="text-white/40 text-sm">
            {query ? `No hunts matching "${query}"` : 'No active hunts right now'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((hunt) => (
            <HuntCard key={hunt.id} hunt={hunt} />
          ))}
        </div>
      )}
    </div>
  );
}

// Embeddable hotel widget — client component.
// Renders a compact, dark-themed hunt list for embedding in partner/hotel iframes.
// Route: /embed/hunts?city=VALUE  (no dashboard layout — standalone page)

'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import type { Hunt, PaginatedData } from '@treasure-hunt/shared';

// ── Types ──────────────────────────────────────────────────────────────────────

type HuntWithCount = Hunt & { clueCount: number };

// ── Design tokens ──────────────────────────────────────────────────────────────

const C = {
  bg: '#0a0a0a',
  surface: '#141414',
  border: '#242424',
  accent: '#f59e0b',
  text: '#ffffff',
  muted: '#6b7280',
  easy: '#4ade80',
  medium: '#facc15',
  hard: '#f87171',
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

// Return colour for a difficulty level
function difficultyColor(d: Hunt['difficulty']): string {
  if (d === 'easy') return C.easy;
  if (d === 'medium') return C.medium;
  return C.hard;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function HuntCard({ hunt }: { hunt: HuntWithCount }) {
  const price =
    hunt.huntType === 'paid' && hunt.ticketPriceCents != null
      ? `$${(hunt.ticketPriceCents / 100).toFixed(0)}`
      : 'FREE';

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 8,
      }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: C.text,
            lineHeight: 1.3,
            flex: 1,
          }}
        >
          {hunt.title}
        </p>

        {/* Paid / FREE badge */}
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: hunt.huntType === 'paid' ? C.accent : C.muted,
            background: hunt.huntType === 'paid' ? `${C.accent}1a` : `${C.muted}1a`,
            borderRadius: 20,
            padding: '2px 8px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {price}
        </span>
      </div>

      {/* City + meta row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 6,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 12, color: C.muted }}>
          {hunt.city}{hunt.region ? `, ${hunt.region}` : ''}
        </span>

        {/* Clue count */}
        {'clueCount' in hunt && (
          <span style={{ fontSize: 11, color: C.muted }}>
            · {hunt.clueCount} clue{hunt.clueCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Difficulty badge */}
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: difficultyColor(hunt.difficulty),
            background: `${difficultyColor(hunt.difficulty)}1a`,
            borderRadius: 20,
            padding: '2px 7px',
          }}
        >
          {hunt.difficulty}
        </span>
      </div>

      {/* CTA button */}
      <a
        href={`https://treasurehunt.app/hunt/${hunt.id}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          marginTop: 12,
          fontSize: 12,
          fontWeight: 600,
          color: '#0a0a0a',
          background: C.accent,
          borderRadius: 6,
          padding: '6px 14px',
          textDecoration: 'none',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        Join the Hunt →
      </a>
    </div>
  );
}

// ── Main widget inner (needs useSearchParams — must be wrapped in Suspense) ────

function WidgetInner() {
  const searchParams = useSearchParams();
  const initialCity = searchParams.get('city') ?? '';

  const [city, setCity] = useState(initialCity);
  const [inputValue, setInputValue] = useState(initialCity);
  const [hunts, setHunts] = useState<HuntWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch hunts whenever city filter changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3002';
        const qs = new URLSearchParams({ pageSize: '20' });
        if (city) qs.set('city', city);

        const res = await fetch(`${base}/api/v1/public/hunts?${qs}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('fetch failed');

        const json = (await res.json()) as { data: PaginatedData<HuntWithCount> };
        if (!cancelled) {
          setHunts(json.data?.items ?? []);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [city]);

  // Submit city filter form
  function handleCitySubmit(e: React.FormEvent) {
    e.preventDefault();
    setCity(inputValue.trim());
  }

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: C.bg,
        minHeight: '100vh',
        padding: '0 0 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: C.accent,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            whiteSpace: 'nowrap',
          }}
        >
          🗺 Treasure Hunt
        </p>

        {/* City filter form */}
        <form onSubmit={handleCitySubmit} style={{ display: 'flex', gap: 6 }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Filter by city…"
            style={{
              fontSize: 12,
              color: C.text,
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: '5px 10px',
              outline: 'none',
              width: 130,
            }}
          />
          <button
            type="submit"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#0a0a0a',
              background: C.accent,
              border: 'none',
              borderRadius: 6,
              padding: '5px 10px',
              cursor: 'pointer',
            }}
          >
            Go
          </button>
        </form>
      </div>

      {/* Hunt list */}
      <div style={{ padding: '12px 12px 0' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: '32px 0' }}>
            Loading hunts…
          </p>
        ) : error ? (
          <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: '32px 0' }}>
            Could not load hunts. Please try again.
          </p>
        ) : hunts.length === 0 ? (
          <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: '32px 0' }}>
            {city ? `No active hunts in ${city}.` : 'No active hunts available.'}
          </p>
        ) : (
          hunts.map((hunt) => <HuntCard key={hunt.id} hunt={hunt} />)
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingTop: 4 }}>
        <a
          href="https://treasurehunt.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: C.muted, textDecoration: 'none' }}
        >
          Powered by Treasure Hunt
        </a>
      </div>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function EmbedHuntsPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            fontFamily: 'system-ui, sans-serif',
            background: '#0a0a0a',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p style={{ color: '#6b7280', fontSize: 13 }}>Loading…</p>
        </div>
      }
    >
      <WidgetInner />
    </Suspense>
  );
}

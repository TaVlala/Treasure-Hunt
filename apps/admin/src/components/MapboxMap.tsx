// Interactive Mapbox map for clue placement on the hunt detail page.
// Dynamically imports mapbox-gl (client-only). Shows numbered markers for
// existing clues; fires onMapClick when the user clicks empty space.

'use client';

import { useEffect, useRef } from 'react';
import type mapboxgl from 'mapbox-gl';
import type { AdminClue } from '@treasure-hunt/shared';

interface Props {
  clues: AdminClue[];
  centerLat: number;
  centerLng: number;
  zoomLevel: number;
  /** Called when the user clicks empty map space — use to open the Add Clue modal */
  onMapClick: (lat: number, lng: number) => void;
  /** Called when the user clicks an existing clue marker */
  onMarkerClick: (clue: AdminClue) => void;
}

const TOKEN = process.env['NEXT_PUBLIC_MAPBOX_TOKEN'];

// Builds a DOM element for a numbered clue marker
function makeMarkerEl(label: string, onClick: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.textContent = label;
  Object.assign(el.style, {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#f59e0b',
    color: '#000',
    fontWeight: '700',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '2px solid #fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
    lineHeight: '1',
    userSelect: 'none',
  });
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return el;
}

export function MapboxMap({ clues, centerLat, centerLng, zoomLevel, onMapClick, onMarkerClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || !TOKEN) return;

    let cancelled = false;

    void import('mapbox-gl').then((mod) => {
      if (cancelled || !containerRef.current) return;

      const mapboxgl = mod.default;
      mapboxgl.accessToken = TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [centerLng, centerLat],
        zoom: zoomLevel,
      });

      mapRef.current = map;

      // Fire onMapClick when the user clicks empty space (not a marker)
      map.on('click', (e) => {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      });

      // Add a numbered amber marker for each existing clue
      clues.forEach((clue, i) => {
        const el = makeMarkerEl(String(i + 1), () => onMarkerClick(clue));
        new mapboxgl.Marker({ element: el })
          .setLngLat([clue.longitude, clue.latitude])
          .addTo(map);
      });
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // Re-mount when clues list changes (new/deleted clue) — key prop handles this from parent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback when token is not configured
  if (!TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-2 gap-4">
        <svg width="36" height="36" fill="none" viewBox="0 0 36 36" className="text-text-faint">
          <circle cx="18" cy="15" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M18 21v9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M18 3v3M18 30v3M3 15h3M30 15h3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center px-8">
          <p className="text-sm text-white font-medium mb-1">Map not configured</p>
          <p className="text-xs text-text-muted leading-relaxed">
            Add{' '}
            <code className="text-accent font-mono text-[11px]">NEXT_PUBLIC_MAPBOX_TOKEN</code>
            <br />
            to <code className="text-text-muted font-mono text-[11px]">.env.local</code> and
            restart the server
          </p>
          <a
            href="https://account.mapbox.com/access-tokens/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent hover:text-accent-hover transition-colors mt-3 inline-block"
          >
            Get a token →
          </a>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}

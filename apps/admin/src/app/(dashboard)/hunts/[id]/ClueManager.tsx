// Two-panel clue management interface — clue list on the left, interactive
// Mapbox map on the right. Owns all clue state and modal open/close logic.

'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ClueModal } from './ClueModal';
import type { HuntDetail, AdminClue } from '@treasure-hunt/shared';

// Dynamically import the map to guarantee it never runs on the server
const MapboxMap = dynamic(
  () => import('@/components/MapboxMap').then((m) => m.MapboxMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-surface-2">
        <p className="text-sm text-text-muted">Loading map…</p>
      </div>
    ),
  },
);

// Clue type icons (short labels shown in the list)
const CLUE_TYPE_LABEL: Record<string, string> = {
  text_riddle: 'Riddle',
  image: 'Image',
  gps_proximity: 'GPS',
  qr_code: 'QR',
  photo_challenge: 'Photo',
};

interface ModalState {
  clue: AdminClue | null; // null = create
  lat: number;
  lng: number;
}

interface Props {
  hunt: HuntDetail;
  initialClues: AdminClue[];
}

export function ClueManager({ hunt, initialClues }: Props) {
  const [clues, setClues] = useState<AdminClue[]>(initialClues);
  const [modal, setModal] = useState<ModalState | null>(null);
  // Incrementing this key forces MapboxMap to remount with fresh markers
  const [mapKey, setMapKey] = useState(0);

  // Opens modal in create mode pre-filled with map-click coordinates
  function handleMapClick(lat: number, lng: number) {
    setModal({ clue: null, lat, lng });
  }

  // Opens modal in edit mode for an existing clue
  function handleMarkerClick(clue: AdminClue) {
    setModal({ clue, lat: clue.latitude, lng: clue.longitude });
  }

  // Opens modal in create mode using the hunt center as the default location
  function handleAddClue() {
    setModal({ clue: null, lat: hunt.centerLat, lng: hunt.centerLng });
  }

  // Updates clue list after create or edit, remounts map markers
  function handleSaved(saved: AdminClue) {
    setClues((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setMapKey((k) => k + 1);
    setModal(null);
  }

  // Removes a deleted clue from state and remounts map markers
  function handleDeleted(clueId: string) {
    setClues((prev) => prev.filter((c) => c.id !== clueId));
    setMapKey((k) => k + 1);
    setModal(null);
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* ---- Left panel: clue list ---- */}
      <aside className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden">

        {/* List header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-text-faint font-medium">
            Clues
          </p>
          <button
            onClick={handleAddClue}
            className="
              flex items-center gap-1.5 text-xs font-semibold text-black
              bg-accent hover:bg-accent-hover px-3 py-1.5 rounded-lg transition-colors
            "
          >
            <svg width="10" height="10" fill="none" viewBox="0 0 10 10">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Add Clue
          </button>
        </div>

        {/* Scrollable clue list */}
        <div className="flex-1 overflow-y-auto">
          {clues.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-text-muted">No clues yet</p>
              <p className="text-xs text-text-faint mt-1">
                Click the map or &ldquo;Add Clue&rdquo; to place your first clue
              </p>
            </div>
          ) : (
            clues.map((clue, i) => (
              <button
                key={clue.id}
                onClick={() => handleMarkerClick(clue)}
                className="
                  w-full flex items-start gap-3 px-4 py-3 text-left
                  border-b border-border hover:bg-surface-2 transition-colors
                "
              >
                {/* Numbered amber circle */}
                <div className="
                  w-6 h-6 rounded-full bg-accent text-black text-[10px] font-bold
                  flex items-center justify-center shrink-0 mt-0.5
                ">
                  {i + 1}
                </div>

                {/* Clue details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{clue.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-text-faint uppercase tracking-wide">
                      {CLUE_TYPE_LABEL[clue.clueType] ?? clue.clueType}
                    </span>
                    <span className="text-[10px] text-text-faint">·</span>
                    <span className="text-[10px] text-text-faint">{clue.points} pts</span>
                    {clue.isBonus && (
                      <>
                        <span className="text-[10px] text-text-faint">·</span>
                        <span className="text-[10px] text-accent uppercase tracking-wide">bonus</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Hint at the bottom */}
        {clues.length > 0 && (
          <div className="px-4 py-3 border-t border-border shrink-0">
            <p className="text-[10px] text-text-faint leading-relaxed">
              Click a marker or list row to edit · Click empty map to add
            </p>
          </div>
        )}
      </aside>

      {/* ---- Right panel: map ---- */}
      <div className="flex-1 relative">
        <MapboxMap
          key={mapKey}
          clues={clues}
          centerLat={hunt.centerLat}
          centerLng={hunt.centerLng}
          zoomLevel={hunt.zoomLevel}
          onMapClick={handleMapClick}
          onMarkerClick={handleMarkerClick}
        />
      </div>

      {/* ---- Clue modal ---- */}
      {modal && (
        <ClueModal
          huntId={hunt.id}
          clue={modal.clue}
          lat={modal.lat}
          lng={modal.lng}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}

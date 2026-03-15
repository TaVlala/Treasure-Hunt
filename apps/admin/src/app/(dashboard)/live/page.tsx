'use client';
// Live Hunt Monitor — client component that polls /api/v1/admin/analytics/players/live every 10 seconds.
// Displays a card grid of all active players with GPS position, progress, score, and elapsed time.

import { useEffect, useState, useCallback } from 'react';
import { clientFetch } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LivePlayer {
  sessionId: string;
  playerId: string;
  playerName: string;
  huntId: string;
  huntTitle: string;
  cluesFound: number;
  totalClues: number;
  score: number;
  startedAt: string;
  lastLat: number | null;
  lastLng: number | null;
  lastSeenAt: string | null;
}

interface LiveData {
  players: LivePlayer[];
  totalActive: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Compute human-readable elapsed time from a startedAt ISO string
function elapsed(startedAt: string): string {
  const mins = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// Format an ISO timestamp to short local time: "14:32"
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

// Pulsing green dot indicator used in the page header
function PulsingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
    </span>
  );
}

// Progress bar showing clues found vs total
function ProgressBar({ found, total }: { found: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((found / total) * 100)) : 0;
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-accent rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// Single player card
function PlayerCard({ player }: { player: LivePlayer }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      {/* Player name + hunt name */}
      <div>
        <p className="text-sm font-semibold text-white leading-tight">{player.playerName}</p>
        <p className="text-xs text-text-muted mt-0.5 truncate">{player.huntTitle}</p>
      </div>

      {/* Clue progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] uppercase tracking-widest text-text-faint font-medium">
            Progress
          </p>
          <p className="text-xs text-text-muted tabular-nums">
            {player.cluesFound} / {player.totalClues} clues
          </p>
        </div>
        <ProgressBar found={player.cluesFound} total={player.totalClues} />
      </div>

      {/* Score + elapsed time */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-text-faint font-medium mb-0.5">
            Score
          </p>
          <p className="text-sm font-semibold text-accent tabular-nums">{player.score}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-text-faint font-medium mb-0.5">
            Playing
          </p>
          <p className="text-sm text-text-muted tabular-nums">{elapsed(player.startedAt)}</p>
        </div>
      </div>

      {/* GPS + last seen */}
      <div className="pt-2 border-t border-border">
        {player.lastLat != null && player.lastLng != null ? (
          <p className="text-[11px] font-mono text-green-400">
            {player.lastLat.toFixed(2)}°, {player.lastLng.toFixed(2)}°
          </p>
        ) : (
          <p className="text-[11px] text-text-faint italic">No GPS data yet</p>
        )}
        {player.lastSeenAt && (
          <p className="text-[10px] text-text-faint mt-0.5">
            Last seen {formatTime(player.lastSeenAt)}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LiveMonitorPage() {
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch live player data from the backend
  const fetchLive = useCallback(async () => {
    try {
      const result = await clientFetch<LiveData>('/api/v1/admin/analytics/players/live');
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling interval of 10 seconds
  useEffect(() => {
    void fetchLive();
    const interval = setInterval(() => { void fetchLive(); }, 10_000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  const players = data?.players ?? [];
  const totalActive = data?.totalActive ?? 0;

  return (
    <div className="p-8 max-w-6xl">

      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-text-faint mb-1">
            <span className="text-text-muted">Live Monitor</span>
          </p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Live Monitor</h1>
          <p className="text-sm text-text-muted mt-1">
            {loading ? 'Loading…' : `${totalActive} player${totalActive !== 1 ? 's' : ''} active`}
          </p>
        </div>

        {/* Auto-refresh indicator */}
        <div className="flex items-center gap-2 mt-1 shrink-0">
          <PulsingDot />
          <p className="text-xs text-text-muted">Auto-refreshing every 10s</p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => { void fetchLive(); }}
            className="text-xs text-red-400 border border-red-500/40 rounded-lg px-3 py-1.5 hover:bg-red-500/10 transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-surface border border-border rounded-xl p-4 h-48 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && players.length === 0 && (
        <div className="bg-surface border border-border rounded-xl py-20 text-center">
          <p className="text-2xl mb-3">🗺️</p>
          <p className="text-sm font-medium text-text-muted">No active players right now</p>
          <p className="text-xs text-text-faint mt-1">
            Players will appear here once they start a hunt
          </p>
        </div>
      )}

      {/* Player grid */}
      {!loading && players.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((player) => (
            <PlayerCard key={player.sessionId} player={player} />
          ))}
        </div>
      )}
    </div>
  );
}

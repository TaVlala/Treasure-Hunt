// Sponsor portal prizes page — read-only list of this sponsor's prizes and redemption stats.
// Auth-guarded: reads 'sponsor_session' from localStorage on mount; redirects to login if missing.

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SponsorSession {
  accessToken: string;
  user: { id: string; email: string; name: string | null };
}

interface SponsorPrize {
  id: string;
  title: string;
  description: string | null;
  prizeType: 'DISCOUNT' | 'FREE_ITEM' | 'EXPERIENCE';
  valueDescription: string | null;
  redemptionLimit: number | null;
  redemptionsUsed: number;
  expiryDate: string | null;
  isGrandPrize: boolean;
  minCluesFound: number;
  imageUrl: string | null;
  huntId: string;
  huntTitle: string;
  huntStatus: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRIZE_TYPE_LABELS: Record<string, string> = {
  DISCOUNT:   'Discount',
  FREE_ITEM:  'Free Item',
  EXPERIENCE: 'Experience',
};

const PRIZE_TYPE_STYLES: Record<string, string> = {
  DISCOUNT:   'text-blue-400 bg-blue-400/10',
  FREE_ITEM:  'text-green-400 bg-green-400/10',
  EXPERIENCE: 'text-purple-400 bg-purple-400/10',
};

const HUNT_STATUS_STYLES: Record<string, string> = {
  ACTIVE:    'text-green-400 bg-green-400/10',
  DRAFT:     'text-[#888] bg-[#1c1c1c]',
  PAUSED:    'text-yellow-400 bg-yellow-400/10',
  COMPLETED: 'text-blue-400 bg-blue-400/10',
  ARCHIVED:  'text-[#555] bg-[#1c1c1c]',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Redemption progress bar — shows used vs limit
function RedemptionBar({ used, limit }: { used: number; limit: number | null }) {
  if (limit === null) {
    return (
      <span className="text-xs text-[#555]">
        {used} redeemed · <span className="text-[#444]">no limit</span>
      </span>
    );
  }
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-[#f59e0b]';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-[#555]">
        <span>{used} redeemed</span>
        <span>{limit} limit · {pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-[#242424] overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Individual prize card
function PrizeCard({ prize }: { prize: SponsorPrize }) {
  const typeStyle = PRIZE_TYPE_STYLES[prize.prizeType] ?? 'text-[#888] bg-[#1c1c1c]';
  const huntStyle = HUNT_STATUS_STYLES[prize.huntStatus.toUpperCase()] ?? 'text-[#888] bg-[#1c1c1c]';

  return (
    <div className="bg-[#141414] border border-[#242424] rounded-xl p-6 space-y-4 hover:border-[#333] transition-colors">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-medium text-white">{prize.title}</h3>
            {prize.isGrandPrize && (
              <span className="text-[10px] uppercase tracking-widest font-medium px-2 py-0.5 rounded-full text-[#f59e0b] bg-[#f59e0b]/10">
                Grand Prize
              </span>
            )}
          </div>
          {prize.description && (
            <p className="text-xs text-[#555] line-clamp-2">{prize.description}</p>
          )}
        </div>
        {/* Type badge */}
        <span className={`shrink-0 text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 rounded-full ${typeStyle}`}>
          {PRIZE_TYPE_LABELS[prize.prizeType] ?? prize.prizeType}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#555]">
        {/* Hunt */}
        <span className="flex items-center gap-1.5">
          <span>Hunt:</span>
          <span className="text-[#888]">{prize.huntTitle}</span>
          <span className={`text-[9px] uppercase tracking-widest font-medium px-1.5 py-0.5 rounded-full ${huntStyle}`}>
            {prize.huntStatus.toLowerCase()}
          </span>
        </span>
        {/* Value */}
        {prize.valueDescription && (
          <span>Value: <span className="text-[#888]">{prize.valueDescription}</span></span>
        )}
        {/* Min clues */}
        {prize.minCluesFound > 0 && (
          <span>Unlock after <span className="text-[#888]">{prize.minCluesFound} clues</span></span>
        )}
        {/* Expiry */}
        {prize.expiryDate && (
          <span>
            Expires <span className={new Date(prize.expiryDate) < new Date() ? 'text-red-400' : 'text-[#888]'}>
              {formatDate(prize.expiryDate)}
            </span>
          </span>
        )}
      </div>

      {/* Redemption bar */}
      <RedemptionBar used={prize.redemptionsUsed} limit={prize.redemptionLimit} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SponsorPrizesPage() {
  const router = useRouter();
  const [session, setSession] = useState<SponsorSession | null>(null);
  const [prizes, setPrizes] = useState<SponsorPrize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('sponsor_session');
    if (!raw) { router.replace('/sponsor/login'); return; }

    let parsed: SponsorSession;
    try { parsed = JSON.parse(raw) as SponsorSession; }
    catch { router.replace('/sponsor/login'); return; }

    setSession(parsed);

    fetch(`${API_URL}/api/v1/sponsor/prizes`, {
      headers: { Authorization: `Bearer ${parsed.accessToken}` },
      cache: 'no-store',
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem('sponsor_session');
          router.replace('/sponsor/login');
          return;
        }
        const json = await res.json() as { data?: SponsorPrize[] };
        setPrizes(json.data ?? []);
      })
      .catch(() => setError('Failed to load prizes.'))
      .finally(() => setLoading(false));
  }, [router]);

  function signOut() {
    localStorage.removeItem('sponsor_session');
    router.push('/sponsor/login');
  }

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-[#888] text-sm animate-pulse">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button onClick={signOut} className="text-xs text-[#888] hover:text-white underline transition-colors">
            Sign out and try again
          </button>
        </div>
      </div>
    );
  }

  // Group prizes by hunt
  const byHunt = prizes.reduce<Record<string, { huntTitle: string; huntStatus: string; prizes: SponsorPrize[] }>>((acc, p) => {
    if (!acc[p.huntId]) acc[p.huntId] = { huntTitle: p.huntTitle, huntStatus: p.huntStatus, prizes: [] };
    acc[p.huntId]!.prizes.push(p);
    return acc;
  }, {});

  const totalRedemptions = prizes.reduce((s, p) => s + p.redemptionsUsed, 0);
  const grandPrizeCount = prizes.filter((p) => p.isGrandPrize).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">

      {/* Top nav */}
      <header className="border-b border-[#242424] bg-[#0a0a0a] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <p className="text-xs tracking-[0.3em] text-[#f59e0b] uppercase font-medium">
              🗺️ Treasure Hunt
            </p>
            <nav className="flex items-center gap-1">
              <Link
                href="/sponsor/dashboard"
                className="text-xs text-[#555] hover:text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/sponsor/prizes"
                className="text-xs text-white bg-[#1c1c1c] px-3 py-1.5 rounded-lg"
              >
                Prizes
              </Link>
              <Link
                href="/sponsor/invoices"
                className="text-xs text-[#555] hover:text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Invoices
              </Link>
            </nav>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-[#888] hover:text-white border border-[#242424] hover:border-[#333] px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Your Prizes</h1>
          <p className="text-sm text-[#888] mt-1">
            {prizes.length} prize{prizes.length !== 1 ? 's' : ''} · {totalRedemptions} total redemptions
            {grandPrizeCount > 0 && ` · ${grandPrizeCount} grand prize${grandPrizeCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Empty state */}
        {prizes.length === 0 && (
          <div className="bg-[#141414] border border-[#242424] rounded-xl p-12 text-center">
            <p className="text-2xl mb-3">🎁</p>
            <p className="text-sm text-white font-medium mb-1">No prizes yet</p>
            <p className="text-xs text-[#555]">Your admin will set up prizes for your sponsored hunts.</p>
          </div>
        )}

        {/* Prizes grouped by hunt */}
        {Object.entries(byHunt).map(([huntId, group]) => (
          <section key={huntId}>
            <h2 className="text-xs uppercase tracking-widest text-[#888] font-medium mb-4">
              {group.huntTitle}
            </h2>
            <div className="space-y-4">
              {group.prizes.map((prize) => (
                <PrizeCard key={prize.id} prize={prize} />
              ))}
            </div>
          </section>
        ))}

      </main>
    </div>
  );
}

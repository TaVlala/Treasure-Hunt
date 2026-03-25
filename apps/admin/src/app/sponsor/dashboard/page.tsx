// Sponsor self-serve dashboard — shows profile, stats, clue list, and account info.
// Auth-guarded: reads 'sponsor_session' from localStorage on mount; redirects to login if missing.

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// ---------------------------------------------------------------------------
// Local types for API responses
// ---------------------------------------------------------------------------

interface SponsorSession {
  accessToken: string;
  sponsorId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface SponsorProfile {
  id: string;
  businessName: string;
  contactName: string | null;
  email: string;
  address: string | null;
  tier: string;
  status: string;
  monthlyFee: number | null;
  contractStart: string | null;
  contractEnd: string | null;
  activeClueCount: number;
}

interface SponsorAnalytics {
  totalClueVisits: number;
  totalRedemptions: number;
  activeClues: number;
}

interface SponsoredClue {
  clueId: string;
  clueTitle: string;
  huntId: string;
  huntName: string;
  huntStatus: string;
  visitCount: number;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={`
        rounded-xl border p-6 transition-colors
        ${accent
          ? 'bg-[#f59e0b]/5 border-[#f59e0b]/30'
          : 'bg-[#141414] border-[#242424]'
        }
      `}
    >
      <p className="text-[11px] uppercase tracking-widest text-[#888] font-medium mb-3">
        {icon} {label}
      </p>
      <p className={`text-4xl font-semibold tabular-nums ${accent ? 'text-[#f59e0b]' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

// Hunt status badge
const STATUS_STYLES: Record<string, string> = {
  ACTIVE:    'text-green-400 bg-green-400/10',
  DRAFT:     'text-[#888] bg-[#1c1c1c]',
  PAUSED:    'text-yellow-400 bg-yellow-400/10',
  COMPLETED: 'text-blue-400 bg-blue-400/10',
  ARCHIVED:  'text-[#555] bg-[#1c1c1c]',
};

function HuntStatusBadge({ status }: { status: string }) {
  const upper = status.toUpperCase();
  return (
    <span
      className={`
        text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 rounded-full
        ${STATUS_STYLES[upper] ?? 'text-[#888] bg-[#1c1c1c]'}
      `}
    >
      {status.toLowerCase()}
    </span>
  );
}

// Tier label → capitalised
function tierLabel(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

// Format ISO date to "Mar 9, 2026"
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SponsorDashboardPage() {
  const router = useRouter();

  const [session, setSession] = useState<SponsorSession | null>(null);
  const [profile, setProfile] = useState<SponsorProfile | null>(null);
  const [analytics, setAnalytics] = useState<SponsorAnalytics | null>(null);
  const [clues, setClues] = useState<SponsoredClue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Auth guard + data fetch on mount
  useEffect(() => {
    const raw = localStorage.getItem('sponsor_session');
    if (!raw) {
      router.replace('/sponsor/login');
      return;
    }

    let parsed: SponsorSession;
    try {
      parsed = JSON.parse(raw) as SponsorSession;
    } catch {
      router.replace('/sponsor/login');
      return;
    }

    setSession(parsed);

    const headers = { Authorization: `Bearer ${parsed.accessToken}` };

    // Fetch all three in parallel
    Promise.all([
      fetch(`${API_URL}/api/v1/sponsor/me`, { headers, cache: 'no-store' }),
      fetch(`${API_URL}/api/v1/sponsor/analytics`, { headers, cache: 'no-store' }),
      fetch(`${API_URL}/api/v1/sponsor/clues`, { headers, cache: 'no-store' }),
    ])
      .then(async ([meRes, analyticsRes, cluesRes]) => {
        // If any 401 → session expired
        if (meRes.status === 401 || analyticsRes.status === 401) {
          localStorage.removeItem('sponsor_session');
          router.replace('/sponsor/login');
          return;
        }

        const [meData, analyticsData, cluesData] = await Promise.all([
          meRes.ok ? (meRes.json() as Promise<SponsorProfile>) : Promise.resolve(null),
          analyticsRes.ok ? (analyticsRes.json() as Promise<SponsorAnalytics>) : Promise.resolve(null),
          cluesRes.ok ? (cluesRes.json() as Promise<SponsoredClue[]>) : Promise.resolve([]),
        ]);

        setProfile(meData);
        setAnalytics(analyticsData);
        setClues(cluesData ?? []);
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, [router]);

  // Sign out handler
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
          <button
            onClick={signOut}
            className="text-xs text-[#888] hover:text-white underline transition-colors"
          >
            Sign out and try again
          </button>
        </div>
      </div>
    );
  }

  const businessName = profile?.businessName ?? session?.user.name ?? 'Sponsor';
  const tier = profile ? tierLabel(profile.tier) : '—';
  const status = profile?.status ?? '—';
  const monthlyFee = profile?.monthlyFee != null ? `£${profile.monthlyFee}/mo` : '—';
  const totalVisits = analytics?.totalClueVisits ?? 0;
  const totalRedemptions = analytics?.totalRedemptions ?? 0;
  const activeClues = profile?.activeClueCount ?? analytics?.activeClues ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">

      {/* Top nav */}
      <header className="border-b border-[#242424] bg-[#0a0a0a] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-xs tracking-[0.3em] text-[#f59e0b] uppercase font-medium">
            🗺️ Treasure Hunt
          </p>
          <button
            onClick={signOut}
            className="text-xs text-[#888] hover:text-white border border-[#242424] hover:border-[#333] px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* Welcome banner */}
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Welcome, {businessName}
          </h1>
          <p className="text-sm text-[#888] mt-1">
            <span className="text-[#f59e0b]">{tier} Sponsor</span>
            {' · '}
            <span
              className={
                status.toLowerCase() === 'active'
                  ? 'text-green-400'
                  : 'text-[#888]'
              }
            >
              {status}
            </span>
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon="🔍" label="Total Clue Visits" value={totalVisits} />
          <StatCard icon="🎁" label="Prize Redemptions" value={totalRedemptions} accent={totalRedemptions > 0} />
          <StatCard icon="📍" label="Active Clues" value={activeClues} />
          <StatCard icon="💰" label="Monthly Fee" value={monthlyFee} />
        </div>

        {/* Clue list */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-widest text-[#888] font-medium">
              Your Clues
            </h2>
            <p className="text-xs text-[#555]">
              {clues.length} clue{clues.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-[#141414] border border-[#242424] rounded-xl px-6">

            {clues.length > 0 && (
              <div className="flex items-center gap-4 pb-3 pt-4 border-b border-[#242424]">
                <p className="flex-1 text-[10px] uppercase tracking-widest text-[#555]">Clue</p>
                <p className="hidden sm:block w-36 text-[10px] uppercase tracking-widest text-[#555]">Hunt</p>
                <p className="w-20 text-center text-[10px] uppercase tracking-widest text-[#555]">Status</p>
                <p className="w-20 text-right text-[10px] uppercase tracking-widest text-[#555]">Visits</p>
              </div>
            )}

            {clues.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-[#888]">No clues yet</p>
                <p className="text-xs text-[#555] mt-1">
                  Contact us to get your first clue placed on a hunt.
                </p>
              </div>
            ) : (
              clues.map((clue, i) => (
                <div
                  key={clue.clueId}
                  className={`flex items-center gap-4 py-4 ${i !== 0 ? 'border-t border-[#242424]' : ''}`}
                >
                  {/* Clue title */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      📍 {clue.clueTitle}
                    </p>
                  </div>

                  {/* Hunt name */}
                  <div className="hidden sm:block w-36 min-w-0 shrink-0">
                    <p className="text-sm text-[#888] truncate">{clue.huntName}</p>
                  </div>

                  {/* Hunt status badge */}
                  <div className="w-20 shrink-0 flex justify-center">
                    <HuntStatusBadge status={clue.huntStatus} />
                  </div>

                  {/* Visit count */}
                  <div className="w-20 shrink-0 text-right">
                    <p className="text-sm tabular-nums text-[#888]">
                      {clue.visitCount.toLocaleString()} visits
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Account section */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-[#888] font-medium mb-4">
            Account
          </h2>
          <div className="bg-[#141414] border border-[#242424] rounded-xl divide-y divide-[#242424]">

            <AccountRow label="Email" value={profile?.email ?? session?.user.email ?? '—'} />
            <AccountRow label="Tier" value={`${tier} Sponsor`} accent />
            <AccountRow
              label="Contract Start"
              value={profile?.contractStart ? formatDate(profile.contractStart) : '—'}
            />
            <AccountRow
              label="Contract End"
              value={profile?.contractEnd ? formatDate(profile.contractEnd) : '—'}
            />
            <AccountRow label="Monthly Fee" value={monthlyFee} />
            {profile?.address && (
              <AccountRow label="Business Address" value={profile.address} />
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

// Single labelled row in the account table
function AccountRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 gap-4">
      <p className="text-xs uppercase tracking-widest text-[#555] font-medium shrink-0">
        {label}
      </p>
      <p className={`text-sm text-right ${accent ? 'text-[#f59e0b]' : 'text-[#888]'}`}>
        {value}
      </p>
    </div>
  );
}

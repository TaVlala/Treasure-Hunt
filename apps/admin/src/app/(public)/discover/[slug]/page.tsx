// Hunt detail public page — server component.
// Fetches a single active hunt by slug and renders SEO-friendly details + app download CTA.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Hunt } from '@treasure-hunt/shared';

const PUBLIC_API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type HuntWithCount = Hunt & { clueCount: number };

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'text-green-400 bg-green-400/10 border-green-400/20',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  hard: 'text-red-400 bg-red-400/10 border-red-400/20',
};

// Fetches a single active hunt by slug — returns null on 404 or error
async function fetchHunt(slug: string): Promise<HuntWithCount | null> {
  try {
    const res = await fetch(`${PUBLIC_API}/api/v1/public/hunts/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: HuntWithCount };
    return json.data;
  } catch {
    return null;
  }
}

// Formats ticket price cents to a readable string
function formatPrice(cents: number | null, currency: string): string {
  if (cents === null || cents === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

// Formats ISO date to short readable form
function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

// SEO metadata generated from hunt data
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hunt = await fetchHunt(slug);
  if (!hunt) {
    return { title: 'Hunt Not Found — Treasure Hunt' };
  }
  return {
    title: hunt.metaTitle ?? `${hunt.title} — Treasure Hunt`,
    description: hunt.metaDescription ?? hunt.description,
    openGraph: {
      title: hunt.metaTitle ?? hunt.title,
      description: hunt.metaDescription ?? hunt.description,
      images: hunt.coverImageUrl ? [hunt.coverImageUrl] : [],
    },
  };
}

export default async function HuntDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const hunt = await fetchHunt(slug);

  if (!hunt) {
    notFound();
  }

  const difficultyClass = DIFFICULTY_STYLES[hunt.difficulty] ?? 'text-white/40 bg-white/5 border-white/10';
  const price = formatPrice(hunt.ticketPriceCents, hunt.currency);

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">

      {/* Back link */}
      <Link
        href="/discover"
        className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-10 transition-colors"
      >
        ← All Hunts
      </Link>

      {/* Cover image or gradient placeholder */}
      <div className="w-full aspect-video rounded-2xl overflow-hidden mb-10 bg-gradient-to-br from-amber-400/10 via-white/5 to-transparent flex items-center justify-center">
        {hunt.coverImageUrl || hunt.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hunt.coverImageUrl ?? hunt.thumbnailUrl ?? ''}
            alt={hunt.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-7xl">🗺️</span>
        )}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
          {hunt.city}{hunt.region ? `, ${hunt.region}` : ''}
        </span>
        <span className="text-white/10">·</span>
        <span className={`text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 rounded-full border ${difficultyClass}`}>
          {hunt.difficulty}
        </span>
        <span className={`text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 rounded-full border ${hunt.huntType === 'paid' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-green-400 bg-green-400/10 border-green-400/20'}`}>
          {hunt.huntType === 'paid' ? 'Paid' : 'Free'}
        </span>
        {hunt.teamMode !== 'solo' && (
          <span className="text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 rounded-full border text-blue-400 bg-blue-400/10 border-blue-400/20">
            Team Play
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
        {hunt.title}
      </h1>

      {/* Description */}
      {hunt.description && (
        <p className="text-white/50 text-base leading-relaxed mb-10 max-w-2xl">
          {hunt.description}
        </p>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
        <InfoCell label="Clues" value={`${hunt.clueCount} clue${hunt.clueCount !== 1 ? 's' : ''}`} />
        <InfoCell label="Price" value={price} />
        <InfoCell label="Time Limit" value={hunt.timeLimitMinutes ? `${hunt.timeLimitMinutes} min` : 'No limit'} />
        <InfoCell label="Team Mode" value={hunt.teamMode === 'solo' ? 'Solo' : `Team (max ${hunt.maxTeamSize})`} />
        <InfoCell label="Starts" value={formatDate(hunt.startsAt)} />
        <InfoCell label="Ends" value={formatDate(hunt.endsAt)} />
      </div>

      {/* App Download CTA */}
      <div className="rounded-2xl p-8 sm:p-10 bg-amber-400/10 border border-amber-400/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="text-4xl">📱</div>
          <div className="flex-1">
            <h2 className="text-white font-bold text-xl mb-1">
              Download the App to Play
            </h2>
            <p className="text-white/50 text-sm">
              Available on iOS &amp; Android — search <span className="text-amber-400 font-medium">&ldquo;Treasure Hunt&rdquo;</span> in your app store to get started.
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">App Store</p>
              <p className="text-white text-sm font-medium">iOS →</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Google Play</p>
              <p className="text-white text-sm font-medium">Android →</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// Small label + value cell for the info grid
function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-widest text-white/25 font-medium mb-1">{label}</p>
      <p className="text-white text-sm font-semibold">{value}</p>
    </div>
  );
}

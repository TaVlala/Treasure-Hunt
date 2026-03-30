// Hunt detail public page - server component.
// Fetches a single active hunt by slug and renders SEO-friendly details + app download CTA.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Hunt } from '@treasure-hunt/shared';

const PUBLIC_API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const APP_STORE_URL =
  process.env['NEXT_PUBLIC_APP_STORE_URL'] ??
  'https://apps.apple.com/us/search?term=Treasure%20Hunt';
const PLAY_STORE_URL =
  process.env['NEXT_PUBLIC_PLAY_STORE_URL'] ??
  'https://play.google.com/store/search?q=Treasure%20Hunt&c=apps';

type HuntWithCount = Hunt & { clueCount: number };

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'text-green-400 bg-green-400/10 border-green-400/20',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  hard: 'text-red-400 bg-red-400/10 border-red-400/20',
};

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

function formatPrice(cents: number | null, currency: string): string {
  if (cents === null || cents === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hunt = await fetchHunt(slug);
  if (!hunt) {
    return { title: 'Hunt Not Found - Treasure Hunt' };
  }
  return {
    title: hunt.metaTitle ?? `${hunt.title} - Treasure Hunt`,
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
    <div className="mx-auto max-w-4xl px-6 py-14">
      <Link
        href="/discover"
        className="mb-10 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white"
      >
        ← All Hunts
      </Link>

      <div className="mb-10 flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400/10 via-white/5 to-transparent">
        {hunt.coverImageUrl || hunt.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hunt.coverImageUrl ?? hunt.thumbnailUrl ?? ''}
            alt={hunt.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-7xl">🗺️</span>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-widest text-white/30">
          {hunt.city}
          {hunt.region ? `, ${hunt.region}` : ''}
        </span>
        <span className="text-white/10">·</span>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest ${difficultyClass}`}>
          {hunt.difficulty}
        </span>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest ${
            hunt.huntType === 'paid'
              ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
              : 'text-green-400 bg-green-400/10 border-green-400/20'
          }`}
        >
          {hunt.huntType === 'paid' ? 'Paid' : 'Free'}
        </span>
        {hunt.teamMode !== 'solo' && (
          <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-blue-400">
            Team Play
          </span>
        )}
      </div>

      <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{hunt.title}</h1>

      {hunt.description && (
        <p className="mb-10 max-w-2xl text-base leading-relaxed text-white/50">{hunt.description}</p>
      )}

      <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <InfoCell label="Clues" value={`${hunt.clueCount} clue${hunt.clueCount !== 1 ? 's' : ''}`} />
        <InfoCell label="Price" value={price} />
        <InfoCell label="Time Limit" value={hunt.timeLimitMinutes ? `${hunt.timeLimitMinutes} min` : 'No limit'} />
        <InfoCell label="Team Mode" value={hunt.teamMode === 'solo' ? 'Solo' : `Team (max ${hunt.maxTeamSize})`} />
        <InfoCell label="Starts" value={formatDate(hunt.startsAt)} />
        <InfoCell label="Ends" value={formatDate(hunt.endsAt)} />
      </div>

      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-8 sm:p-10">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="text-4xl">📱</div>
          <div className="flex-1">
            <h2 className="mb-1 text-xl font-bold text-white">Download the App to Play</h2>
            <p className="text-sm text-white/50">
              Available on iOS &amp; Android - search <span className="font-medium text-amber-400">"Treasure Hunt"</span> in your app store to get started.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3">
            <Link
              href={APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Download on the App Store"
              className="flex min-w-[190px] items-center gap-3 rounded-2xl border border-white/20 bg-black px-5 py-3 text-left transition-colors hover:border-white/40 hover:bg-neutral-950"
            >
              <AppleBadgeIcon />
              <div>
                <p className="text-[10px] leading-none text-white/70">Download on the</p>
                <p className="mt-1 text-lg font-semibold leading-none text-white">App Store</p>
              </div>
            </Link>
            <Link
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Get it on Google Play"
              className="flex min-w-[190px] items-center gap-3 rounded-2xl border border-white/20 bg-black px-5 py-3 text-left transition-colors hover:border-white/40 hover:bg-neutral-950"
            >
              <GooglePlayBadgeIcon />
              <div>
                <p className="text-[10px] leading-none text-white/70">GET IT ON</p>
                <p className="mt-1 text-lg font-semibold leading-none text-white">Google Play</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-white/25">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function AppleBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 shrink-0 fill-white">
      <path d="M16.365 12.846c.014 1.567 1.378 2.087 1.393 2.093-.012.037-.218.748-.72 1.484-.434.637-.884 1.272-1.594 1.285-.698.013-.923-.414-1.722-.414-.798 0-1.048.401-1.71.427-.684.026-1.206-.688-1.643-1.323-.893-1.29-1.575-3.644-.66-5.234.455-.79 1.268-1.29 2.15-1.303.671-.012 1.304.452 1.72.452.414 0 1.193-.558 2.01-.476.342.014 1.304.138 1.921 1.042-.05.032-1.146.668-1.145 1.967Zm-1.123-4.62c.364-.442.61-1.056.542-1.668-.524.02-1.158.35-1.534.79-.338.393-.634 1.019-.554 1.62.584.045 1.182-.298 1.546-.742Z" />
    </svg>
  );
}

function GooglePlayBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 shrink-0">
      <path fill="#00d26a" d="M3.5 3.8 13.9 14.2 3.5 20.2c-.3-.3-.5-.8-.5-1.3V5.1c0-.5.2-1 .5-1.3Z" />
      <path fill="#00a3ff" d="m13.9 14.2 3.3-1.9 4 2.3c-.2.2-.4.4-.7.5l-6.6 3.7-4.4 2.5Z" />
      <path fill="#ff3b30" d="m13.9 9.8 6.6 3.7c.3.2.5.3.7.5l-4 2.3-3.3-1.9L9.5 12Z" />
      <path fill="#ffcc00" d="M3.5 3.8 9.5 12l4.4-2.2 6.6-3.7c-.3-.4-.8-.6-1.3-.3L13.9 8.3 3.5 3.8Z" />
    </svg>
  );
}

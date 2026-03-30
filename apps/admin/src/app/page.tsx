import Link from 'next/link';
import type { Hunt, PaginatedData } from '@treasure-hunt/shared';

const APP_STORE_URL =
  process.env['NEXT_PUBLIC_APP_STORE_URL'] ??
  'https://apps.apple.com/us/search?term=Treasure%20Hunt';

const PLAY_STORE_URL =
  process.env['NEXT_PUBLIC_PLAY_STORE_URL'] ??
  'https://play.google.com/store/search?q=Treasure%20Hunt&c=apps';

const PUBLIC_API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type HuntWithCount = Hunt & { clueCount: number };

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'text-green-400 bg-green-400/10',
  medium: 'text-amber-400 bg-amber-400/10',
  hard: 'text-red-400 bg-red-400/10',
};

async function fetchFeaturedHunts(): Promise<HuntWithCount[]> {
  try {
    const res = await fetch(`${PUBLIC_API}/api/v1/public/hunts?pageSize=3`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];

    const json = (await res.json()) as { data: PaginatedData<HuntWithCount> };
    return json.data.items.slice(0, 3);
  } catch {
    return [];
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

export default async function RootPage() {
  const featuredHunts = await fetchFeaturedHunts();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Sticky Nav */}
      <nav
        className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(10,10,10,0.85)' }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Treasure Hunt
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/player/login"
              className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/player/register"
              className="rounded-full bg-amber-400 px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-amber-300"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-start overflow-hidden px-6 pb-8 pt-10 text-center md:pt-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 60%, rgba(245,158,11,0.07) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 flex w-full max-w-5xl flex-col items-center">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-amber-400/70">
            Location-Based Scavenger Hunts
          </p>
          <h1
            className="mb-3 font-bold leading-[0.92] tracking-tight text-white"
            style={{ fontSize: 'clamp(3.2rem, 7vw, 4.8rem)' }}
          >
            Explore the City
            <br />
            Find Clues
            <br />
            <span className="text-amber-400">Win Prizes</span>
          </h1>
          <p className="mx-auto mb-4 max-w-2xl text-base leading-relaxed text-white/50">
            Location-based scavenger hunts that turn tourists into locals - and locals into explorers.
          </p>
          {featuredHunts.length > 0 && (
            <div className="mb-4 grid w-full max-w-4xl grid-cols-1 gap-2.5 text-left md:grid-cols-3">
              {featuredHunts.map((hunt) => (
                <Link
                  key={hunt.id}
                  href={`/discover/${hunt.slug}`}
                  className="group rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-amber-400/30 hover:bg-white/[0.05]"
                >
                  <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-amber-400/70">
                    {hunt.city}
                    {hunt.region ? `, ${hunt.region}` : ''}
                  </p>
                  <h3 className="mb-2 text-[1rem] font-semibold leading-snug text-white transition-colors group-hover:text-amber-400">
                    {hunt.title}
                  </h3>
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest ${
                        DIFFICULTY_STYLES[hunt.difficulty] ?? 'text-white/40 bg-white/5'
                      }`}
                    >
                      {hunt.difficulty}
                    </span>
                    {hunt.teamMode !== 'solo' && (
                      <span className="rounded-full bg-blue-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-blue-400">
                        Team
                      </span>
                    )}
                    {hunt.huntType === 'paid' && (
                      <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-amber-400">
                        Paid
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-white/40">
                    <span>
                      {hunt.clueCount} clue{hunt.clueCount !== 1 ? 's' : ''}
                    </span>
                    <span className="font-medium text-white/60">
                      {formatPrice(hunt.ticketPriceCents, hunt.currency)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/discover"
              className="rounded-full bg-amber-400 px-8 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-amber-300"
            >
              Browse All Hunts →
            </Link>
          </div>
          <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
      </section>

      {/* Features strip */}
      <section className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <p className="mb-14 text-center text-xs uppercase tracking-widest text-white/30">Why players love it</p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 transition-colors hover:border-amber-400/20">
              <div className="mb-4 text-3xl">🗺️</div>
              <h3 className="mb-2 text-lg font-semibold text-white">GPS-Guided Clues</h3>
              <p className="text-sm leading-relaxed text-white/40">
                Follow location-based riddles to hidden spots across the city
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 transition-colors hover:border-amber-400/20">
              <div className="mb-4 text-3xl">🏆</div>
              <h3 className="mb-2 text-lg font-semibold text-white">Win Real Prizes</h3>
              <p className="text-sm leading-relaxed text-white/40">
                Earn prizes from local businesses when you complete the hunt
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 transition-colors hover:border-amber-400/20">
              <div className="mb-4 text-3xl">🤝</div>
              <h3 className="mb-2 text-lg font-semibold text-white">Play Solo or Team</h3>
              <p className="text-sm leading-relaxed text-white/40">
                Go it alone or join forces with friends using team invite codes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Strip */}
      <section className="border-t border-amber-400/20 bg-amber-400/10 px-6 py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <h2 className="mb-1 text-2xl font-bold text-white">Ready to hunt?</h2>
            <p className="text-sm text-white/40">Active hunts available now in cities near you.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/about"
              className="rounded-full border border-white/20 px-8 py-3.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white"
            >
              How it Works
            </Link>
            <Link
              href="/discover"
              className="rounded-full bg-amber-400 px-8 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-amber-300"
            >
              Browse Active Hunts →
            </Link>
          </div>
        </div>
      </section>
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

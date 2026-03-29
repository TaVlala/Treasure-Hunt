// Public landing page — server component.
// Bold, editorial, premium tourism aesthetic for the Treasure Hunt platform.

import Link from 'next/link';

export default function RootPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>

      {/* ── Sticky Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-sm" style={{ backgroundColor: 'rgba(10,10,10,0.85)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-xs uppercase tracking-widest font-semibold text-amber-400">
            Treasure Hunt
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/player/login"
              className="text-xs font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 px-4 py-1.5 rounded-full transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/player/register"
              className="text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-black px-4 py-1.5 rounded-full transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-start text-center px-6 pt-28 pb-24 relative">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 40% at 50% 60%, rgba(245,158,11,0.07) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-amber-400/70 mb-6 font-medium">
            Location-Based Scavenger Hunts
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight mb-6">
            Explore the City.<br />
            Find Clues.<br />
            <span className="text-amber-400">Win Prizes.</span>
          </h1>
          <p className="text-white/50 text-lg max-w-md mx-auto mb-10 leading-relaxed">
            Location-based scavenger hunts that turn tourists into locals — and locals into explorers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/discover"
              className="bg-amber-400 hover:bg-amber-300 text-black font-semibold px-8 py-3.5 rounded-full transition-colors text-sm"
            >
              Browse Hunts →
            </Link>
          </div>
        </div>

      </section>

      {/* ── Features strip ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs uppercase tracking-widest text-white/30 mb-14">
            Why players love it
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Card 1 */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 hover:border-amber-400/20 transition-colors">
              <div className="text-3xl mb-4">🗺️</div>
              <h3 className="text-white font-semibold text-lg mb-2">GPS-Guided Clues</h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Follow location-based riddles to hidden spots across the city
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 hover:border-amber-400/20 transition-colors">
              <div className="text-3xl mb-4">🏆</div>
              <h3 className="text-white font-semibold text-lg mb-2">Win Real Prizes</h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Earn prizes from local businesses when you complete the hunt
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 hover:border-amber-400/20 transition-colors">
              <div className="text-3xl mb-4">🤝</div>
              <h3 className="text-white font-semibold text-lg mb-2">Play Solo or Team</h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Go it alone or join forces with friends using team invite codes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Footer Strip ── */}
      <section className="py-16 px-6 bg-amber-400/10 border-t border-amber-400/20">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-white font-bold text-2xl mb-1">Ready to hunt?</h2>
            <p className="text-white/40 text-sm">Active hunts available now in cities near you.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/about"
              className="text-sm font-semibold border border-white/20 hover:border-white/40 text-white/80 hover:text-white px-8 py-3.5 rounded-full transition-colors"
            >
              How it Works
            </Link>
            <Link
              href="/discover"
              className="bg-amber-400 hover:bg-amber-300 text-black font-semibold px-8 py-3.5 rounded-full transition-colors text-sm"
            >
              Browse Active Hunts →
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

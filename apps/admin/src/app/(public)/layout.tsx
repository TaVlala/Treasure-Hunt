// Shared layout for public-facing pages: discover, hunt detail, about.
// Provides a minimal nav bar and footer. Dark premium tourism aesthetic.

import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0a' }}>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-sm" style={{ backgroundColor: 'rgba(10,10,10,0.85)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-xs uppercase tracking-widest font-semibold text-amber-400">
            Treasure Hunt
          </Link>
          <Link
            href="/login"
            className="text-xs font-medium text-white/70 hover:text-white border border-white/20 hover:border-white/40 px-4 py-1.5 rounded-full transition-colors"
          >
            Admin Login
          </Link>
        </div>
      </nav>

      {/* ── Page content ── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/25 text-xs">
            © 2026 Treasure Hunt. A tourism discovery platform.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/discover" className="text-white/25 hover:text-white/50 text-xs transition-colors">
              Browse Hunts
            </Link>
            <Link href="/about" className="text-white/25 hover:text-white/50 text-xs transition-colors">
              How it Works
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

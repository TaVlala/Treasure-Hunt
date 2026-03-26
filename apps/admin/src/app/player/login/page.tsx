// Player login page — public-facing sign in at /player/login.
// Uses player_token cookie (separate from admin auth).

'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { playerLogin } from '@/lib/player-auth';

export default function PlayerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await playerLogin(email.trim().toLowerCase(), password);
      router.push('/discover');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ backgroundColor: '#0a0a0a' }}>

      {/* Brand */}
      <div className="mb-10 text-center">
        <Link href="/" className="text-xs tracking-[0.3em] text-amber-400 uppercase font-semibold">
          Treasure Hunt
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-3">
          Welcome back
        </h1>
        <p className="text-white/40 text-sm mt-1">Sign in to track your hunts and prizes</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-sm rounded-full px-4 py-3.5 mt-2 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-white/30 text-sm mt-8">
        Don&apos;t have an account?{' '}
        <Link href="/player/register" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
          Create one free
        </Link>
      </p>

      <Link href="/discover" className="text-white/20 hover:text-white/40 text-xs mt-4 transition-colors">
        Browse hunts without signing in →
      </Link>
    </div>
  );
}

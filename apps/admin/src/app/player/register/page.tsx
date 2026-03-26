// Player register page — public-facing account creation at /player/register.
// On success logs the player in and redirects to /discover.

'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { playerRegister } from '@/lib/player-auth';

export default function PlayerRegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!displayName.trim()) { setError('Display name is required'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await playerRegister(email.trim().toLowerCase(), password, displayName.trim());
      router.push('/discover');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
          Create your account
        </h1>
        <p className="text-white/40 text-sm mt-1">Free to join — start exploring today</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          <div>
            <label htmlFor="displayName" className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
              Display Name <span className="text-amber-400">*</span>
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="nickname"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name in the game"
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
              Email <span className="text-amber-400">*</span>
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
              Password <span className="text-amber-400">*</span>
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
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
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-white/30 text-sm mt-8">
        Already have an account?{' '}
        <Link href="/player/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

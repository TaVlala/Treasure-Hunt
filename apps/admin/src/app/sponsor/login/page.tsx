// Sponsor login page — email + password form, calls sponsor auth API.
// Stores session token in localStorage under 'sponsor_session' key.

'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// Shape of the successful login response
interface LoginResponse {
  accessToken: string;
  sponsorId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export default function SponsorLoginPage() {
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
      const res = await fetch(`${API_URL}/api/v1/auth/sponsor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        cache: 'no-store',
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        const msg =
          data !== null &&
          typeof data === 'object' &&
          'message' in data &&
          typeof (data as { message: unknown }).message === 'string'
            ? (data as { message: string }).message
            : 'Login failed';
        throw new Error(msg);
      }

      // Store session in localStorage
      localStorage.setItem('sponsor_session', JSON.stringify(data as LoginResponse));
      router.push('/sponsor/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">

        {/* Brand */}
        <div className="mb-10 text-center">
          <p className="text-xs tracking-[0.3em] text-[#f59e0b] uppercase font-medium mb-2">
            🗺️ Treasure Hunt
          </p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Sponsor Portal
          </h1>
          <p className="text-sm text-[#888] mt-2">
            Sign in to manage your clues and view analytics.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-[#141414] border border-[#242424] rounded-xl p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[#888] uppercase tracking-wider mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                className="
                  w-full bg-[#1c1c1c] border border-[#242424] rounded-lg px-4 py-3
                  text-sm text-white placeholder-[#555]
                  focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]
                  transition-colors
                "
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#888] uppercase tracking-wider mb-2"
              >
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
                className="
                  w-full bg-[#1c1c1c] border border-[#242424] rounded-lg px-4 py-3
                  text-sm text-white placeholder-[#555]
                  focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]
                  transition-colors
                "
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="
                w-full bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 disabled:cursor-not-allowed
                text-black font-semibold text-sm tracking-wide
                rounded-lg px-4 py-3 mt-2
                transition-colors
              "
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#888] mt-6">
          <Link
            href="/sponsor/register"
            className="text-[#f59e0b] hover:text-[#d97706] transition-colors"
          >
            New sponsor? Register your business →
          </Link>
        </p>
      </div>
    </div>
  );
}

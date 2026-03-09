// Admin login page — email + password form, calls backend auth API.
// Client component because of form state and cookie writing on submit.

'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';

export default function LoginPage() {
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
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <p className="text-xs tracking-[0.3em] text-accent uppercase font-medium mb-2">
            Treasure Hunt
          </p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Admin Portal
          </h1>
        </div>

        {/* Form card */}
        <div className="bg-surface border border-border rounded-xl p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2"
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
                placeholder="admin@example.com"
                className="
                  w-full bg-surface-2 border border-border rounded-lg px-4 py-3
                  text-sm text-white placeholder-text-faint
                  focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
                  transition-colors
                "
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-2"
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
                  w-full bg-surface-2 border border-border rounded-lg px-4 py-3
                  text-sm text-white placeholder-text-faint
                  focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent
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
                w-full bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed
                text-black font-semibold text-sm tracking-wide
                rounded-lg px-4 py-3 mt-2
                transition-colors
              "
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-text-faint mt-6">
          Admin accounts only
        </p>
      </div>
    </div>
  );
}

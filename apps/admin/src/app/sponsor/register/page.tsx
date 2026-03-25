// Sponsor registration page — collects business details + tier selection.
// Calls POST /api/v1/auth/sponsor/register, then stores session and redirects to dashboard.

'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// Tier options with pricing and description
interface TierOption {
  value: string;
  label: string;
  price: string;
  description: string;
}

const TIER_OPTIONS: TierOption[] = [
  { value: 'basic', label: 'Basic', price: '£49/mo', description: '1 clue placement' },
  { value: 'featured', label: 'Featured', price: '£149/mo', description: '3 clue placements + branded card' },
  { value: 'prize', label: 'Prize', price: '£299/mo', description: 'Unlimited clues + prize redemptions' },
];

// Shape of the successful register response
interface RegisterResponse {
  accessToken: string;
  sponsorId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export default function SponsorRegisterPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [tier, setTier] = useState('basic');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/sponsor/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          contactName: contactName || undefined,
          email,
          password,
          address,
          tier,
        }),
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
            : 'Registration failed';
        throw new Error(msg);
      }

      // Store session in localStorage
      localStorage.setItem('sponsor_session', JSON.stringify(data as RegisterResponse));
      router.push('/sponsor/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">

        {/* Brand */}
        <div className="mb-10 text-center">
          <p className="text-xs tracking-[0.3em] text-[#f59e0b] uppercase font-medium mb-2">
            🗺️ Treasure Hunt
          </p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Register Your Business
          </h1>
          <p className="text-sm text-[#888] mt-2">
            Join as a sponsor and get found by players exploring your city.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-[#141414] border border-[#242424] rounded-xl p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Business Name */}
            <div>
              <label
                htmlFor="businessName"
                className="block text-xs font-medium text-[#888] uppercase tracking-wider mb-2"
              >
                Business Name <span className="text-[#f59e0b]">*</span>
              </label>
              <input
                id="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="The Old Barrel Pub"
                className="
                  w-full bg-[#1c1c1c] border border-[#242424] rounded-lg px-4 py-3
                  text-sm text-white placeholder-[#555]
                  focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]
                  transition-colors
                "
              />
            </div>

            {/* Contact Name */}
            <div>
              <label
                htmlFor="contactName"
                className="block text-xs font-medium text-[#888] uppercase tracking-wider mb-2"
              >
                Your Name <span className="text-[#555]">(optional)</span>
              </label>
              <input
                id="contactName"
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Jane Smith"
                className="
                  w-full bg-[#1c1c1c] border border-[#242424] rounded-lg px-4 py-3
                  text-sm text-white placeholder-[#555]
                  focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]
                  transition-colors
                "
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[#888] uppercase tracking-wider mb-2"
              >
                Email <span className="text-[#f59e0b]">*</span>
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

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#888] uppercase tracking-wider mb-2"
              >
                Password <span className="text-[#f59e0b]">*</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="
                  w-full bg-[#1c1c1c] border border-[#242424] rounded-lg px-4 py-3
                  text-sm text-white placeholder-[#555]
                  focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]
                  transition-colors
                "
              />
            </div>

            {/* Address */}
            <div>
              <label
                htmlFor="address"
                className="block text-xs font-medium text-[#888] uppercase tracking-wider mb-2"
              >
                Business Address <span className="text-[#f59e0b]">*</span>
              </label>
              <input
                id="address"
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="12 High Street, Edinburgh EH1 1YL"
                className="
                  w-full bg-[#1c1c1c] border border-[#242424] rounded-lg px-4 py-3
                  text-sm text-white placeholder-[#555]
                  focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]
                  transition-colors
                "
              />
            </div>

            {/* Tier selector */}
            <div>
              <label className="block text-xs font-medium text-[#888] uppercase tracking-wider mb-3">
                Sponsorship Tier <span className="text-[#f59e0b]">*</span>
              </label>
              <div className="space-y-2">
                {TIER_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${tier === option.value
                        ? 'border-[#f59e0b] bg-[#f59e0b]/5'
                        : 'border-[#242424] bg-[#1c1c1c] hover:border-[#333]'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value={option.value}
                      checked={tier === option.value}
                      onChange={() => setTier(option.value)}
                      className="accent-[#f59e0b]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-white">{option.label}</span>
                        <span className="text-sm font-semibold text-[#f59e0b] shrink-0">
                          {option.price}
                        </span>
                      </div>
                      <p className="text-xs text-[#888] mt-0.5">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
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
              {loading ? 'Registering…' : 'Register'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#888] mt-6">
          Already have an account?{' '}
          <Link
            href="/sponsor/login"
            className="text-[#f59e0b] hover:text-[#d97706] transition-colors"
          >
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}

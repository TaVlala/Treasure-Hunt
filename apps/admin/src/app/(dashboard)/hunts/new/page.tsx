// Hunt creation form — client component.
// Validates required fields client-side, then POSTs to /api/v1/admin/hunts.
// Redirects to /hunts on success.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clientFetch } from '@/lib/api';
import type { Hunt } from '@treasure-hunt/shared';

// All number fields are stored as strings so they bind cleanly to <input>
interface FormValues {
  title: string;
  slug: string;
  description: string;
  city: string;
  region: string;
  difficulty: string;
  theme: string;
  huntType: string;
  teamMode: string;
  maxTeamSize: string;
  timeLimitMinutes: string;
  maxPlayers: string;
  startsAt: string;
  endsAt: string;
  centerLat: string;
  centerLng: string;
  zoomLevel: string;
  ticketPrice: string; // user enters dollars; converted to cents on submit
  currency: string;
  thumbnailUrl: string;
  coverImageUrl: string;
  whitelabelName: string;
  whitelabelLogoUrl: string;
  whitelabelColor: string;
  metaTitle: string;
  metaDescription: string;
}

const DEFAULTS: FormValues = {
  title: '',
  slug: '',
  description: '',
  city: '',
  region: '',
  difficulty: '',
  theme: 'general',
  huntType: 'free',
  teamMode: 'both',
  maxTeamSize: '4',
  timeLimitMinutes: '',
  maxPlayers: '',
  startsAt: '',
  endsAt: '',
  centerLat: '',
  centerLng: '',
  zoomLevel: '14',
  ticketPrice: '',
  currency: 'USD',
  thumbnailUrl: '',
  coverImageUrl: '',
  whitelabelName: '',
  whitelabelLogoUrl: '',
  whitelabelColor: '',
  metaTitle: '',
  metaDescription: '',
};

// ---- Reusable UI primitives ----

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] uppercase tracking-wider text-text-muted font-medium mb-1.5">
      {children}
      {required && <span className="text-accent ml-1">*</span>}
    </label>
  );
}

const inputCls =
  'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-white ' +
  'placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent ' +
  'transition-colors';

const selectCls =
  'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-white ' +
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors cursor-pointer';

// Horizontal divider with a section title — used between form sections
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 mt-10 mb-6">
      <p className="text-[10px] uppercase tracking-widest text-text-faint font-medium whitespace-nowrap">
        {title}
      </p>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// Collapsible section toggle button (for white-label and SEO)
function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-4 w-full text-left"
      >
        <p className="text-[10px] uppercase tracking-widest text-text-faint font-medium whitespace-nowrap">
          {title}
        </p>
        <div className="flex-1 h-px bg-border" />
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`text-text-faint shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && <div className="mt-6 space-y-4">{children}</div>}
    </div>
  );
}

// ---- Main page component ----

export default function NewHuntPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormValues>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWhitelabel, setShowWhitelabel] = useState(false);
  const [showSeo, setShowSeo] = useState(false);

  // Updates a single field in form state
  function update(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Required field check
    const requiredFields: { key: keyof FormValues; label: string }[] = [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'city', label: 'City' },
      { key: 'difficulty', label: 'Difficulty' },
      { key: 'centerLat', label: 'Map latitude' },
      { key: 'centerLng', label: 'Map longitude' },
    ];
    for (const { key, label } of requiredFields) {
      if (!form[key].trim()) {
        setError(`${label} is required`);
        return;
      }
    }

    const lat = parseFloat(form.centerLat);
    const lng = parseFloat(form.centerLng);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be between −90 and 90');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitude must be between −180 and 180');
      return;
    }

    // Build payload — always include required + select fields; conditionally add optionals
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      city: form.city.trim(),
      difficulty: form.difficulty,
      theme: form.theme,
      huntType: form.huntType,
      teamMode: form.teamMode,
      centerLat: lat,
      centerLng: lng,
      zoomLevel: parseInt(form.zoomLevel, 10) || 14,
    };

    if (form.slug.trim()) payload.slug = form.slug.trim();
    if (form.region.trim()) payload.region = form.region.trim();
    if (form.maxTeamSize.trim()) payload.maxTeamSize = parseInt(form.maxTeamSize, 10);
    if (form.timeLimitMinutes.trim()) payload.timeLimitMinutes = parseInt(form.timeLimitMinutes, 10);
    if (form.maxPlayers.trim()) payload.maxPlayers = parseInt(form.maxPlayers, 10);
    if (form.startsAt) payload.startsAt = new Date(form.startsAt).toISOString();
    if (form.endsAt) payload.endsAt = new Date(form.endsAt).toISOString();
    if (form.thumbnailUrl.trim()) payload.thumbnailUrl = form.thumbnailUrl.trim();
    if (form.coverImageUrl.trim()) payload.coverImageUrl = form.coverImageUrl.trim();

    if (form.huntType === 'paid' && form.ticketPrice.trim()) {
      payload.ticketPriceCents = Math.round(parseFloat(form.ticketPrice) * 100);
      payload.currency = form.currency.trim() || 'USD';
    }

    if (form.whitelabelName.trim()) payload.whitelabelName = form.whitelabelName.trim();
    if (form.whitelabelLogoUrl.trim()) payload.whitelabelLogoUrl = form.whitelabelLogoUrl.trim();
    if (form.whitelabelColor) payload.whitelabelColor = form.whitelabelColor;
    if (form.metaTitle.trim()) payload.metaTitle = form.metaTitle.trim();
    if (form.metaDescription.trim()) payload.metaDescription = form.metaDescription.trim();

    try {
      setLoading(true);
      await clientFetch<Hunt>('/api/v1/admin/hunts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push('/hunts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create hunt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">

      {/* Breadcrumb + header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
          <Link href="/hunts" className="hover:text-white transition-colors">
            Hunts
          </Link>
          <span>/</span>
          <span className="text-white">New Hunt</span>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Create Hunt</h1>
        <p className="text-sm text-text-muted mt-1">
          New hunts start as drafts — publish when ready
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* ---- BASICS ---- */}
        <SectionHeader title="Basics" />
        <div className="space-y-5">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Title</Label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className={inputCls}
                placeholder="e.g. Tbilisi Old Town Hunt"
                maxLength={200}
              />
            </div>
            <div>
              <Label>Slug (optional)</Label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => update('slug', e.target.value)}
                className={inputCls}
                placeholder="auto-generated from title"
              />
            </div>
          </div>

          <div>
            <Label required>Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className={`${inputCls} resize-none`}
              rows={4}
              placeholder="Describe the hunt experience — what players will explore and discover…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>City</Label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className={inputCls}
                placeholder="Tbilisi"
                maxLength={100}
              />
            </div>
            <div>
              <Label>Region / Country</Label>
              <input
                type="text"
                value={form.region}
                onChange={(e) => update('region', e.target.value)}
                className={inputCls}
                placeholder="Georgia"
                maxLength={100}
              />
            </div>
          </div>
        </div>

        {/* ---- SETTINGS ---- */}
        <SectionHeader title="Settings" />
        <div className="space-y-5">

          {/* Row 1: core selects */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label required>Difficulty</Label>
              <select
                value={form.difficulty}
                onChange={(e) => update('difficulty', e.target.value)}
                className={selectCls}
              >
                <option value="" disabled>Select…</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <Label>Theme</Label>
              <select
                value={form.theme}
                onChange={(e) => update('theme', e.target.value)}
                className={selectCls}
              >
                <option value="general">General</option>
                <option value="christmas">Christmas</option>
                <option value="halloween">Halloween</option>
                <option value="summer">Summer</option>
                <option value="festival">Festival</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <Label>Hunt Type</Label>
              <select
                value={form.huntType}
                onChange={(e) => update('huntType', e.target.value)}
                className={selectCls}
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <Label>Team Mode</Label>
              <select
                value={form.teamMode}
                onChange={(e) => update('teamMode', e.target.value)}
                className={selectCls}
              >
                <option value="solo">Solo</option>
                <option value="team">Team</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          {/* Ticket pricing — shown only when huntType = paid */}
          {form.huntType === 'paid' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ticket Price ($)</Label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.ticketPrice}
                  onChange={(e) => update('ticketPrice', e.target.value)}
                  className={inputCls}
                  placeholder="9.99"
                />
              </div>
              <div>
                <Label>Currency</Label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => update('currency', e.target.value.toUpperCase())}
                  className={inputCls}
                  placeholder="USD"
                  maxLength={3}
                />
              </div>
            </div>
          )}

          {/* Row 2: limits */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>
                Max Team Size
                {form.teamMode === 'solo' && (
                  <span className="ml-1 normal-case tracking-normal opacity-50">(solo)</span>
                )}
              </Label>
              <input
                type="number"
                min="2"
                max="10"
                value={form.maxTeamSize}
                onChange={(e) => update('maxTeamSize', e.target.value)}
                className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                disabled={form.teamMode === 'solo'}
                placeholder="4"
              />
            </div>
            <div>
              <Label>Time Limit (min)</Label>
              <input
                type="number"
                min="1"
                value={form.timeLimitMinutes}
                onChange={(e) => update('timeLimitMinutes', e.target.value)}
                className={inputCls}
                placeholder="No limit"
              />
            </div>
            <div>
              <Label>Max Players</Label>
              <input
                type="number"
                min="1"
                value={form.maxPlayers}
                onChange={(e) => update('maxPlayers', e.target.value)}
                className={inputCls}
                placeholder="Unlimited"
              />
            </div>
          </div>
        </div>

        {/* ---- SCHEDULE ---- */}
        <SectionHeader title="Schedule" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Start Date &amp; Time</Label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => update('startsAt', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <Label>End Date &amp; Time</Label>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => update('endsAt', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* ---- MAP CENTER ---- */}
        <SectionHeader title="Map Center" />
        <p className="text-xs text-text-muted mb-4">
          The initial map position players see when they open this hunt.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label required>Latitude</Label>
            <input
              type="number"
              step="any"
              value={form.centerLat}
              onChange={(e) => update('centerLat', e.target.value)}
              className={inputCls}
              placeholder="41.6938"
            />
          </div>
          <div>
            <Label required>Longitude</Label>
            <input
              type="number"
              step="any"
              value={form.centerLng}
              onChange={(e) => update('centerLng', e.target.value)}
              className={inputCls}
              placeholder="44.8015"
            />
          </div>
          <div>
            <Label>Zoom Level</Label>
            <input
              type="number"
              min="1"
              max="22"
              value={form.zoomLevel}
              onChange={(e) => update('zoomLevel', e.target.value)}
              className={inputCls}
              placeholder="14"
            />
          </div>
        </div>

        {/* ---- IMAGES ---- */}
        <SectionHeader title="Images" />
        <div className="space-y-4">
          <div>
            <Label>Thumbnail URL</Label>
            <input
              type="url"
              value={form.thumbnailUrl}
              onChange={(e) => update('thumbnailUrl', e.target.value)}
              className={inputCls}
              placeholder="https://…"
            />
          </div>
          <div>
            <Label>Cover Image URL</Label>
            <input
              type="url"
              value={form.coverImageUrl}
              onChange={(e) => update('coverImageUrl', e.target.value)}
              className={inputCls}
              placeholder="https://…"
            />
          </div>
        </div>

        {/* ---- WHITE-LABEL (collapsible) ---- */}
        <CollapsibleSection
          title="White-label"
          open={showWhitelabel}
          onToggle={() => setShowWhitelabel(!showWhitelabel)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Brand Name</Label>
              <input
                type="text"
                value={form.whitelabelName}
                onChange={(e) => update('whitelabelName', e.target.value)}
                className={inputCls}
                placeholder="City Explorer Co."
                maxLength={200}
              />
            </div>
            <div>
              <Label>Brand Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.whitelabelColor || '#f59e0b'}
                  onChange={(e) => update('whitelabelColor', e.target.value)}
                  className="w-11 h-10 rounded-lg border border-border bg-surface-2 cursor-pointer shrink-0 p-0.5"
                />
                <input
                  type="text"
                  value={form.whitelabelColor}
                  onChange={(e) => update('whitelabelColor', e.target.value)}
                  className={inputCls}
                  placeholder="#FF5500"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
          <div>
            <Label>Logo URL</Label>
            <input
              type="url"
              value={form.whitelabelLogoUrl}
              onChange={(e) => update('whitelabelLogoUrl', e.target.value)}
              className={inputCls}
              placeholder="https://…"
            />
          </div>
        </CollapsibleSection>

        {/* ---- SEO (collapsible) ---- */}
        <CollapsibleSection
          title="SEO"
          open={showSeo}
          onToggle={() => setShowSeo(!showSeo)}
        >
          <div>
            <Label>Meta Title</Label>
            <input
              type="text"
              value={form.metaTitle}
              onChange={(e) => update('metaTitle', e.target.value)}
              className={inputCls}
              placeholder="Hunt title for search engines"
              maxLength={200}
            />
          </div>
          <div>
            <Label>Meta Description</Label>
            <textarea
              value={form.metaDescription}
              onChange={(e) => update('metaDescription', e.target.value)}
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Short description for search results…"
              maxLength={500}
            />
          </div>
        </CollapsibleSection>

        {/* Submit bar */}
        <div className="flex items-center gap-4 mt-10 pt-8 border-t border-border">
          <button
            type="submit"
            disabled={loading}
            className="
              bg-accent hover:bg-accent-hover text-black font-semibold text-sm
              px-8 py-3 rounded-lg transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {loading ? 'Creating…' : 'Create Hunt'}
          </button>
          <Link
            href="/hunts"
            className="text-sm text-text-muted hover:text-white transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

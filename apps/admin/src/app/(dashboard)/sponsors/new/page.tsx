// Sponsor creation form — client component.
// Validates required fields client-side, then POSTs to /api/v1/admin/sponsors.
// Redirects to /sponsors on success.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clientFetch } from '@/lib/api';
import type { SponsorDetail } from '@treasure-hunt/shared';

// All number fields are stored as strings so they bind cleanly to <input>
interface FormValues {
  businessName: string;
  address: string;
  latitude: string;
  longitude: string;
  description: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  logoUrl: string;
  tier: string;
  contractStart: string; // YYYY-MM-DD
  contractEnd: string;
  monthlyFee: string; // user enters dollars; converted to cents on submit
  notes: string;
}

const DEFAULTS: FormValues = {
  businessName: '',
  address: '',
  latitude: '',
  longitude: '',
  description: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  websiteUrl: '',
  logoUrl: '',
  tier: 'basic',
  contractStart: '',
  contractEnd: '',
  monthlyFee: '',
  notes: '',
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

// Horizontal divider with a section title
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

// Collapsible section for optional fields
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

export default function NewSponsorPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormValues>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBranding, setShowBranding] = useState(false);

  // Updates a single field in form state
  function update(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side required field validation
    if (!form.businessName.trim()) { setError('Business name is required'); return; }
    if (!form.address.trim()) { setError('Address is required'); return; }

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (!form.latitude.trim() || isNaN(lat) || lat < -90 || lat > 90) {
      setError('Valid latitude (−90 to 90) is required');
      return;
    }
    if (!form.longitude.trim() || isNaN(lng) || lng < -180 || lng > 180) {
      setError('Valid longitude (−180 to 180) is required');
      return;
    }

    // Build payload — required fields always included, optionals only when non-empty
    const payload: Record<string, unknown> = {
      businessName: form.businessName.trim(),
      address: form.address.trim(),
      latitude: lat,
      longitude: lng,
      tier: form.tier,
    };

    if (form.description.trim()) payload.description = form.description.trim();
    if (form.contactName.trim()) payload.contactName = form.contactName.trim();
    if (form.contactEmail.trim()) payload.contactEmail = form.contactEmail.trim();
    if (form.contactPhone.trim()) payload.contactPhone = form.contactPhone.trim();
    if (form.websiteUrl.trim()) payload.websiteUrl = form.websiteUrl.trim();
    if (form.logoUrl.trim()) payload.logoUrl = form.logoUrl.trim();
    if (form.contractStart) payload.contractStart = form.contractStart;
    if (form.contractEnd) payload.contractEnd = form.contractEnd;
    if (form.monthlyFee.trim()) {
      payload.monthlyFeeCents = Math.round(parseFloat(form.monthlyFee) * 100);
    }
    if (form.notes.trim()) payload.notes = form.notes.trim();

    try {
      setLoading(true);
      await clientFetch<SponsorDetail>('/api/v1/admin/sponsors', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push('/sponsors');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sponsor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">

      {/* Breadcrumb + header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
          <Link href="/sponsors" className="hover:text-white transition-colors">
            Sponsors
          </Link>
          <span>/</span>
          <span className="text-white">New Sponsor</span>
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Add Sponsor</h1>
        <p className="text-sm text-text-muted mt-1">
          New sponsors are immediately active — pause or expire later as needed
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* ---- BUSINESS ---- */}
        <SectionHeader title="Business" />
        <div className="space-y-5">

          <div>
            <Label required>Business Name</Label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => update('businessName', e.target.value)}
              className={inputCls}
              placeholder="e.g. The Old Town Café"
              maxLength={200}
            />
          </div>

          <div>
            <Label required>Address</Label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              className={inputCls}
              placeholder="12 Shota Rustaveli Ave, Tbilisi"
              maxLength={500}
            />
          </div>

          <div>
            <Label>Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Brief description of the business shown to players…"
            />
          </div>
        </div>

        {/* ---- CONTACT ---- */}
        <SectionHeader title="Contact" />
        <div className="space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Contact Name</Label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => update('contactName', e.target.value)}
                className={inputCls}
                placeholder="Jane Smith"
                maxLength={200}
              />
            </div>
            <div>
              <Label>Contact Email</Label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => update('contactEmail', e.target.value)}
                className={inputCls}
                placeholder="jane@business.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => update('contactPhone', e.target.value)}
                className={inputCls}
                placeholder="+1 555 000 0000"
                maxLength={50}
              />
            </div>
            <div>
              <Label>Website</Label>
              <input
                type="url"
                value={form.websiteUrl}
                onChange={(e) => update('websiteUrl', e.target.value)}
                className={inputCls}
                placeholder="https://business.com"
              />
            </div>
          </div>
        </div>

        {/* ---- LOCATION ---- */}
        <SectionHeader title="Location" />
        <p className="text-xs text-text-muted mb-4">
          Used to show the business pin on player maps and in proximity calculations.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>Latitude</Label>
            <input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => update('latitude', e.target.value)}
              className={inputCls}
              placeholder="41.6938"
            />
          </div>
          <div>
            <Label required>Longitude</Label>
            <input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => update('longitude', e.target.value)}
              className={inputCls}
              placeholder="44.8015"
            />
          </div>
        </div>

        {/* ---- CONTRACT ---- */}
        <SectionHeader title="Contract" />
        <div className="space-y-4">

          <div>
            <Label>Tier</Label>
            <select
              value={form.tier}
              onChange={(e) => update('tier', e.target.value)}
              className={selectCls}
            >
              <option value="basic">Basic</option>
              <option value="featured">Featured — highlighted in-app</option>
              <option value="prize">Prize — sponsor provides clue prizes</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Contract Start</Label>
              <input
                type="date"
                value={form.contractStart}
                onChange={(e) => update('contractStart', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <Label>Contract End</Label>
              <input
                type="date"
                value={form.contractEnd}
                onChange={(e) => update('contractEnd', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="w-48">
            <Label>Monthly Fee ($)</Label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.monthlyFee}
              onChange={(e) => update('monthlyFee', e.target.value)}
              className={inputCls}
              placeholder="150.00"
            />
          </div>
        </div>

        {/* ---- BRANDING + NOTES (collapsible) ---- */}
        <CollapsibleSection
          title="Branding &amp; Notes"
          open={showBranding}
          onToggle={() => setShowBranding(!showBranding)}
        >
          <div>
            <Label>Logo URL</Label>
            <input
              type="url"
              value={form.logoUrl}
              onChange={(e) => update('logoUrl', e.target.value)}
              className={inputCls}
              placeholder="https://cdn.example.com/logo.png"
            />
          </div>
          <div>
            <Label>Internal Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Internal notes about this sponsor — not shown to players…"
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
            {loading ? 'Saving…' : 'Add Sponsor'}
          </button>
          <Link
            href="/sponsors"
            className="text-sm text-text-muted hover:text-white transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

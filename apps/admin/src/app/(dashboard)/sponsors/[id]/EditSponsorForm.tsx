// Sponsor edit form — client component.
// Pre-filled from the server-fetched SponsorDetail.
// PATCHes on save; soft-deletes (sets status = expired) on "Archive" click.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clientFetch } from '@/lib/api';
import ImageUpload from '@/components/ui/ImageUpload';
import type { SponsorDetail } from '@treasure-hunt/shared';

interface Props {
  sponsor: SponsorDetail;
}

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
  status: string;
  contractStart: string;
  contractEnd: string;
  monthlyFee: string;
  notes: string;
}

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

// Converts cents to a dollar string for the input
function centsToDollars(cents: number | null): string {
  if (cents === null) return '';
  return (cents / 100).toFixed(2);
}

export function EditSponsorForm({ sponsor }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormValues>({
    businessName: sponsor.businessName,
    address: sponsor.address,
    latitude: String(sponsor.latitude),
    longitude: String(sponsor.longitude),
    description: sponsor.description ?? '',
    contactName: sponsor.contactName ?? '',
    contactEmail: sponsor.contactEmail ?? '',
    contactPhone: sponsor.contactPhone ?? '',
    websiteUrl: sponsor.websiteUrl ?? '',
    logoUrl: sponsor.logoUrl ?? '',
    tier: sponsor.tier,
    status: sponsor.status,
    contractStart: sponsor.contractStart ?? '',
    contractEnd: sponsor.contractEnd ?? '',
    monthlyFee: centsToDollars(sponsor.monthlyFeeCents),
    notes: sponsor.notes ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBranding, setShowBranding] = useState(
    !!(sponsor.logoUrl || sponsor.notes),
  );

  // Updates a single field in form state
  function update(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.businessName.trim()) { setError('Business name is required'); return; }
    if (!form.address.trim()) { setError('Address is required'); return; }

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Valid latitude (−90 to 90) is required');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Valid longitude (−180 to 180) is required');
      return;
    }

    const payload: Record<string, unknown> = {
      businessName: form.businessName.trim(),
      address: form.address.trim(),
      latitude: lat,
      longitude: lng,
      tier: form.tier,
      status: form.status,
      description: form.description.trim() || null,
      contactName: form.contactName.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      websiteUrl: form.websiteUrl.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
      contractStart: form.contractStart || null,
      contractEnd: form.contractEnd || null,
      monthlyFeeCents: form.monthlyFee.trim()
        ? Math.round(parseFloat(form.monthlyFee) * 100)
        : null,
      notes: form.notes.trim() || null,
    };

    try {
      setLoading(true);
      await clientFetch<SponsorDetail>(`/api/v1/admin/sponsors/${sponsor.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      router.push('/sponsors');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sponsor');
    } finally {
      setLoading(false);
    }
  }

  // Soft-delete: sets status to expired via PATCH
  async function handleArchive() {
    setError(null);
    try {
      setArchiving(true);
      await clientFetch<SponsorDetail>(`/api/v1/admin/sponsors/${sponsor.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'expired' }),
      });
      router.push('/sponsors');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive sponsor');
    } finally {
      setArchiving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>

      {/* Error banner */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

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
            />
          </div>
        </div>
      </div>

      {/* ---- LOCATION ---- */}
      <SectionHeader title="Location" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label required>Latitude</Label>
          <input
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) => update('latitude', e.target.value)}
            className={inputCls}
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
          />
        </div>
      </div>

      {/* ---- CONTRACT ---- */}
      <SectionHeader title="Contract" />
      <div className="space-y-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div>
            <Label>Status</Label>
            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
              className={selectCls}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="expired">Expired</option>
            </select>
          </div>
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
          <Label>Logo</Label>
          <ImageUpload
            folder="sponsors"
            value={form.logoUrl}
            onChange={(url) => update('logoUrl', url)}
          />
          <div className="mt-2">
            <input
              type="url"
              value={form.logoUrl}
              onChange={(e) => update('logoUrl', e.target.value)}
              className={inputCls}
              placeholder="Or paste a URL directly"
            />
          </div>
        </div>
        <div>
          <Label>Internal Notes</Label>
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            className={`${inputCls} resize-none`}
            rows={3}
          />
        </div>
      </CollapsibleSection>

      {/* Submit bar */}
      <div className="flex items-center justify-between mt-10 pt-8 border-t border-border">
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="
              bg-accent hover:bg-accent-hover text-black font-semibold text-sm
              px-8 py-3 rounded-lg transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
          <Link
            href="/sponsors"
            className="text-sm text-text-muted hover:text-white transition-colors"
          >
            Cancel
          </Link>
        </div>

        {/* Archive — only show if not already expired */}
        {sponsor.status !== 'expired' && (
          <button
            type="button"
            onClick={handleArchive}
            disabled={archiving}
            className="
              text-sm text-red-400 hover:text-red-300 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {archiving ? 'Archiving…' : 'Archive Sponsor'}
          </button>
        )}
      </div>
    </form>
  );
}

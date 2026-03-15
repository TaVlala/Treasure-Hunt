// CreatePrizeForm — client component for adding a new SponsorPrize to a hunt.
// POSTs to /api/v1/admin/prizes, then redirects to the hunt's prizes list on success.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clientFetch } from '@/lib/api';

interface Props {
  huntId: string;
}

interface FormValues {
  sponsorId: string;
  title: string;
  prizeType: string;
  description: string;
  valueDescription: string;
  isGrandPrize: boolean;
  minCluesFound: string;
  redemptionLimit: string;
  expiryDate: string;
  termsConditions: string;
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

export function CreatePrizeForm({ huntId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormValues>({
    sponsorId: '',
    title: '',
    prizeType: 'DISCOUNT',
    description: '',
    valueDescription: '',
    isGrandPrize: false,
    minCluesFound: '0',
    redemptionLimit: '',
    expiryDate: '',
    termsConditions: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Updates a single string field in form state
  function update(field: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.sponsorId.trim()) { setError('Sponsor ID is required'); return; }
    if (!form.title.trim()) { setError('Title is required'); return; }

    const minClues = parseInt(form.minCluesFound, 10);
    if (isNaN(minClues) || minClues < 0) {
      setError('Min clues found must be 0 or greater');
      return;
    }

    const payload: Record<string, unknown> = {
      huntId,
      sponsorId: form.sponsorId.trim(),
      title: form.title.trim(),
      prizeType: form.prizeType,
      description: form.description.trim() || undefined,
      valueDescription: form.valueDescription.trim() || undefined,
      isGrandPrize: form.isGrandPrize,
      minCluesFound: minClues,
      redemptionLimit: form.redemptionLimit ? parseInt(form.redemptionLimit, 10) : undefined,
      expiryDate: form.expiryDate || undefined,
      termsConditions: form.termsConditions.trim() || undefined,
    };

    try {
      setLoading(true);
      await clientFetch('/api/v1/admin/prizes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push(`/hunts/${huntId}/prizes`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create prize');
    } finally {
      setLoading(false);
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

      {/* ---- PRIZE DETAILS ---- */}
      <SectionHeader title="Prize Details" />
      <div className="space-y-5">

        <div>
          <Label required>Sponsor ID</Label>
          <input
            type="text"
            value={form.sponsorId}
            onChange={(e) => update('sponsorId', e.target.value)}
            className={inputCls}
            placeholder="UUID of the sponsor"
          />
        </div>

        <div>
          <Label required>Title</Label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className={inputCls}
            maxLength={200}
            placeholder="e.g. 20% off your next visit"
          />
        </div>

        <div>
          <Label required>Prize Type</Label>
          <select
            value={form.prizeType}
            onChange={(e) => update('prizeType', e.target.value)}
            className={selectCls}
          >
            <option value="DISCOUNT">Discount</option>
            <option value="FREE_ITEM">Free Item</option>
            <option value="EXPERIENCE">Experience</option>
            <option value="GIFT_CARD">Gift Card</option>
            <option value="MERCH">Merch</option>
          </select>
        </div>

        <div>
          <Label>Description</Label>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className={`${inputCls} resize-none`}
            rows={3}
            placeholder="Full prize description shown to players"
          />
        </div>

        <div>
          <Label>Value Description</Label>
          <input
            type="text"
            value={form.valueDescription}
            onChange={(e) => update('valueDescription', e.target.value)}
            className={inputCls}
            maxLength={200}
            placeholder="e.g. 20% off your next purchase"
          />
        </div>
      </div>

      {/* ---- SETTINGS ---- */}
      <SectionHeader title="Settings" />
      <div className="space-y-5">

        {/* Grand prize checkbox */}
        <div className="flex items-center gap-3">
          <input
            id="isGrandPrize"
            type="checkbox"
            checked={form.isGrandPrize}
            onChange={(e) => setForm((prev) => ({ ...prev, isGrandPrize: e.target.checked }))}
            className="w-4 h-4 rounded border-border bg-surface-2 accent-accent cursor-pointer"
          />
          <label htmlFor="isGrandPrize" className="text-sm text-white cursor-pointer">
            Grand Prize
            <span className="ml-2 text-xs text-text-muted">Featured at the top of the prizes list</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Min Clues Found</Label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.minCluesFound}
              onChange={(e) => update('minCluesFound', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <Label>Redemption Limit</Label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.redemptionLimit}
              onChange={(e) => update('redemptionLimit', e.target.value)}
              className={inputCls}
              placeholder="Leave empty for unlimited"
            />
          </div>
        </div>

        <div>
          <Label>Expiry Date</Label>
          <input
            type="date"
            value={form.expiryDate}
            onChange={(e) => update('expiryDate', e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <Label>Terms &amp; Conditions</Label>
          <textarea
            value={form.termsConditions}
            onChange={(e) => update('termsConditions', e.target.value)}
            className={`${inputCls} resize-none`}
            rows={3}
            placeholder="Any redemption restrictions or legal terms"
          />
        </div>
      </div>

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
          {loading ? 'Creating…' : 'Create Prize'}
        </button>
        <Link
          href={`/hunts/${huntId}/prizes`}
          className="text-sm text-text-muted hover:text-white transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

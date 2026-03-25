// WhitelabelForm — client component for editing hunt white-label branding.
// PATCHes /api/v1/admin/hunts/:id with name, logoUrl, and brandColor on save.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clientFetch } from '@/lib/api';

interface Props {
  huntId: string;
  initialName: string;
  initialLogoUrl: string;
  initialColor: string;
}

// ---- Reusable UI primitives (matching existing admin style) ----

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] uppercase tracking-wider text-text-muted font-medium mb-1.5">
      {children}
    </label>
  );
}

const inputCls =
  'w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-white ' +
  'placeholder:text-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent ' +
  'transition-colors';

// Section divider with title
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 mt-8 mb-6">
      <p className="text-[10px] uppercase tracking-widest text-text-faint font-medium whitespace-nowrap">
        {title}
      </p>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function WhitelabelForm({ huntId, initialName, initialLogoUrl, initialColor }: Props) {
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [color, setColor] = useState(initialColor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validates the hex colour is a 6-digit format
  function isValidHex(value: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (color && !isValidHex(color)) {
      setError('Brand colour must be a 6-digit hex code e.g. #FF0000');
      return;
    }

    const payload: Record<string, unknown> = {
      whitelabelName: name.trim() || undefined,
      whitelabelLogoUrl: logoUrl.trim() || undefined,
      whitelabelColor: color && isValidHex(color) ? color : undefined,
    };

    try {
      setLoading(true);
      await clientFetch(`/api/v1/admin/hunts/${huntId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save white-label settings');
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

      {/* Success banner */}
      {success && (
        <div className="mb-6 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
          White-label settings saved.
        </div>
      )}

      {/* ---- BRANDING ---- */}
      <SectionHeader title="Branding" />
      <div className="space-y-5">

        {/* Hunt / brand name */}
        <div>
          <Label>Brand Name</Label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSuccess(false); }}
            className={inputCls}
            maxLength={200}
            placeholder="Leave blank to use the hunt title"
          />
          <p className="mt-1.5 text-xs text-text-faint">
            Displayed instead of the hunt title in the player app when white-labelling is active.
          </p>
        </div>

        {/* Logo URL + preview */}
        <div>
          <Label>Logo URL</Label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => { setLogoUrl(e.target.value); setSuccess(false); }}
            className={inputCls}
            placeholder="https://example.com/logo.png"
          />
          <p className="mt-1.5 text-xs text-text-faint">
            Direct URL to the brand logo (PNG or SVG recommended). Displayed in the player app header.
          </p>

          {/* Live logo preview — only shown when URL is non-empty */}
          {logoUrl.trim() && (
            <div className="mt-3 p-4 bg-surface-2 border border-border rounded-lg flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Logo preview"
                className="h-10 w-auto max-w-[160px] object-contain rounded"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  (e.currentTarget.nextSibling as HTMLElement | null)?.removeAttribute('hidden');
                }}
              />
              <p hidden className="text-xs text-text-faint">
                Could not load image — check the URL.
              </p>
              <span className="text-xs text-text-faint">Logo preview</span>
            </div>
          )}
        </div>

        {/* Brand colour */}
        <div>
          <Label>Brand Colour</Label>
          <div className="flex items-center gap-3">
            {/* Native colour picker */}
            <input
              type="color"
              value={isValidHex(color) ? color : '#3B82F6'}
              onChange={(e) => { setColor(e.target.value); setSuccess(false); }}
              className="
                w-10 h-10 rounded-lg border border-border bg-surface-2
                cursor-pointer p-0.5 shrink-0
              "
            />
            {/* Hex text input — stays in sync */}
            <input
              type="text"
              value={color}
              onChange={(e) => { setColor(e.target.value); setSuccess(false); }}
              className={`${inputCls} font-mono`}
              maxLength={7}
              placeholder="#3B82F6"
            />
          </div>
          <p className="mt-1.5 text-xs text-text-faint">
            Primary accent colour used in the player app for this hunt. Must be a 6-digit hex code.
          </p>
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
          {loading ? 'Saving…' : 'Save Settings'}
        </button>
        <Link
          href={`/hunts/${huntId}`}
          className="text-sm text-text-muted hover:text-white transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

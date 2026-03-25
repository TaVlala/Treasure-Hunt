// Embed widget generator — dashboard page, client component.
// Lets admins preview and copy the iframe snippet for hotel/partner embedding.
// Route: /embed-code

'use client';

import { useState, useEffect } from 'react';

// ── Component ──────────────────────────────────────────────────────────────────

export default function EmbedCodePage() {
  const [city, setCity] = useState('');
  const [origin, setOrigin] = useState('https://admin.treasurehunt.app');
  const [copied, setCopied] = useState(false);

  // Pick up the actual origin at runtime (window is only available client-side)
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Build the live embed src (relative path for the preview iframe)
  const previewSrc = `/embed/hunts${city ? `?city=${encodeURIComponent(city)}` : ''}`;

  // Build the shareable snippet with the full origin
  const iframeTag =
    `<iframe\n` +
    `  src="${origin}/embed/hunts${city ? `?city=${encodeURIComponent(city)}` : ''}"\n` +
    `  width="100%"\n` +
    `  height="480"\n` +
    `  style="border:none;border-radius:12px;"\n` +
    `  title="Treasure Hunt Widget"\n` +
    `></iframe>`;

  // Copy to clipboard and show brief "Copied!" feedback
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(iframeTag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors (e.g. in non-secure context)
    }
  }

  return (
    <div className="p-8 max-w-4xl">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Embed Widget</h1>
        <p className="text-sm text-text-muted mt-1">
          Drop this snippet into any hotel or partner website to show active hunts.
        </p>
      </div>

      {/* City filter input */}
      <div className="mb-6">
        <label className="block text-xs uppercase tracking-widest text-text-faint mb-2">
          Pre-filter by city (optional)
        </label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Tbilisi"
          className="
            bg-surface border border-border rounded-lg
            text-sm text-white placeholder:text-text-muted
            px-4 py-2.5 w-64 outline-none
            focus:border-accent transition-colors
          "
        />
      </div>

      {/* Live preview */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-text-faint mb-2">Live Preview</p>
        <div className="rounded-xl overflow-hidden border border-border">
          <iframe
            src={previewSrc}
            width="100%"
            height={480}
            style={{ border: 'none', display: 'block' }}
            title="Treasure Hunt Widget Preview"
          />
        </div>
      </div>

      {/* Code block */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-widest text-text-faint">Embed Code</p>
          <button
            onClick={() => void handleCopy()}
            className="
              text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors
              bg-accent hover:bg-accent-hover text-black
            "
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        <pre
          className="bg-surface border border-border rounded-xl p-4 text-xs text-text-muted overflow-x-auto"
          style={{ fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace' }}
        >
          {iframeTag}
        </pre>
      </div>

      {/* Note */}
      <p className="text-xs text-text-muted">
        The widget updates automatically. No maintenance needed.
      </p>

    </div>
  );
}

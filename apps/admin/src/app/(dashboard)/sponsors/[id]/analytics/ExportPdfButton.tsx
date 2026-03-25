// Client component — "Export PDF" button for the sponsor analytics page.
// Fetches the PDF blob from the server and triggers a browser download.
// Uses clientFetch conventions: reads admin_token cookie + auto-refresh on 401.

'use client';

import { useState } from 'react';
import { getClientToken, setClientToken, clearClientToken } from '@/lib/api';

// Re-implement the raw fetch with blob handling (clientFetch only handles JSON).
const API_BASE =
  (typeof process !== 'undefined' && process.env['NEXT_PUBLIC_API_URL']) ||
  'http://localhost:3001';

// Attempts silent token refresh using the httpOnly refresh cookie.
async function refreshToken(): Promise<string | null> {
  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data: { accessToken: string } };
  return json.data.accessToken;
}

// Fetches the PDF as a Blob, handling 401 → token refresh → retry.
async function fetchPdfBlob(sponsorId: string): Promise<Blob> {
  const path = `/api/v1/admin/analytics/sponsors/${sponsorId}/report.pdf`;

  const makeRequest = (token: string | null) =>
    fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  let res = await makeRequest(getClientToken());

  if (res.status === 401) {
    const newToken = await refreshToken();
    if (!newToken) {
      clearClientToken();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Session expired — please log in again');
    }
    setClientToken(newToken);
    res = await makeRequest(newToken);
  }

  if (!res.ok) {
    throw new Error(`Failed to generate report (${res.status})`);
  }

  return res.blob();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ExportPdfButtonProps {
  sponsorId: string;
  sponsorName: string;
}

export default function ExportPdfButton({ sponsorId, sponsorName }: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const blob = await fetchPdfBlob(sponsorId);
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${sponsorName.replace(/\s+/g, '-').toLowerCase()}-report.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="
        inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
        bg-accent text-white
        hover:bg-accent/90 active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all
      "
    >
      {loading ? (
        <>
          {/* Spinner */}
          <svg
            className="w-4 h-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Generating…
        </>
      ) : (
        <>
          {/* Download icon */}
          <svg
            className="w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16v-8m0 8l-3-3m3 3l3-3M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2"
            />
          </svg>
          Export PDF
        </>
      )}
    </button>
  );
}

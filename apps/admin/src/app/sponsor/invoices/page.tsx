// Sponsor portal invoices page — lists billing history and provides PDF download links.
// Auth-guarded: reads 'sponsor_session' from localStorage on mount; redirects to login if missing.

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SponsorSession {
  accessToken: string;
  user: { id: string; email: string; name: string | null };
}

interface InvoiceRecord {
  id: string;
  amountCents: number;
  currency: string;
  description: string | null;
  stripeInvoiceId: string | null;
  status: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€' };

function formatMoney(cents: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency + ' ';
  return `${sym}${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'text-green-400 bg-green-400/10',
  PENDING:   'text-yellow-400 bg-yellow-400/10',
  FAILED:    'text-red-400 bg-red-400/10',
  REFUNDED:  'text-[#888] bg-[#1c1c1c]',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SponsorInvoicesPage() {
  const router = useRouter();
  const [session, setSession] = useState<SponsorSession | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('sponsor_session');
    if (!raw) { router.replace('/sponsor/login'); return; }

    let parsed: SponsorSession;
    try { parsed = JSON.parse(raw) as SponsorSession; }
    catch { router.replace('/sponsor/login'); return; }

    setSession(parsed);

    fetch(`${API_URL}/api/v1/stripe/sponsor/invoices`, {
      headers: { Authorization: `Bearer ${parsed.accessToken}` },
      cache: 'no-store',
    })
      .then(async (res) => {
        if (res.status === 401) {
          localStorage.removeItem('sponsor_session');
          router.replace('/sponsor/login');
          return;
        }
        const json = await res.json() as { data?: InvoiceRecord[] };
        setInvoices(json.data ?? []);
      })
      .catch(() => setError('Failed to load invoices.'))
      .finally(() => setLoading(false));
  }, [router]);

  function signOut() {
    localStorage.removeItem('sponsor_session');
    router.push('/sponsor/login');
  }

  // Download PDF for a specific invoice
  async function downloadPdf(invoiceId: string, stripeInvoiceId: string | null) {
    if (!session) return;
    setDownloadingId(invoiceId);
    try {
      const res = await fetch(`${API_URL}/api/v1/stripe/sponsor/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = stripeInvoiceId
        ? `INV-${stripeInvoiceId.slice(-8).toUpperCase()}.pdf`
        : `invoice-${invoiceId.slice(-8)}.pdf`;
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingId(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-[#888] text-sm animate-pulse">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button onClick={signOut} className="text-xs text-[#888] hover:text-white underline transition-colors">
            Sign out and try again
          </button>
        </div>
      </div>
    );
  }

  const totalPaid = invoices
    .filter((i) => i.status === 'COMPLETED')
    .reduce((s, i) => s + i.amountCents, 0);
  const currency = invoices[0]?.currency ?? 'GBP';

  return (
    <div className="min-h-screen bg-[#0a0a0a]">

      {/* Top nav */}
      <header className="border-b border-[#242424] bg-[#0a0a0a] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <p className="text-xs tracking-[0.3em] text-[#f59e0b] uppercase font-medium">
              🗺️ Treasure Hunt
            </p>
            <nav className="flex items-center gap-1">
              <Link href="/sponsor/dashboard" className="text-xs text-[#555] hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                Dashboard
              </Link>
              <Link href="/sponsor/prizes" className="text-xs text-[#555] hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                Prizes
              </Link>
              <Link href="/sponsor/invoices" className="text-xs text-white bg-[#1c1c1c] px-3 py-1.5 rounded-lg">
                Invoices
              </Link>
            </nav>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-[#888] hover:text-white border border-[#242424] hover:border-[#333] px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Invoices</h1>
          <p className="text-sm text-[#888] mt-1">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            {invoices.length > 0 && ` · ${formatMoney(totalPaid, currency)} total paid`}
          </p>
        </div>

        {/* Empty state */}
        {invoices.length === 0 && (
          <div className="bg-[#141414] border border-[#242424] rounded-xl p-12 text-center">
            <p className="text-2xl mb-3">🧾</p>
            <p className="text-sm text-white font-medium mb-1">No invoices yet</p>
            <p className="text-xs text-[#555]">Invoices will appear here after each billing cycle.</p>
          </div>
        )}

        {/* Invoice table */}
        {invoices.length > 0 && (
          <div className="bg-[#141414] border border-[#242424] rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-[#242424] bg-[#111]">
              <p className="text-[10px] uppercase tracking-widest text-[#555] font-medium">Date</p>
              <p className="text-[10px] uppercase tracking-widest text-[#555] font-medium text-right">Status</p>
              <p className="text-[10px] uppercase tracking-widest text-[#555] font-medium text-right">Amount</p>
              <p className="text-[10px] uppercase tracking-widest text-[#555] font-medium text-right">PDF</p>
            </div>

            {/* Rows */}
            <div className="divide-y divide-[#1c1c1c]">
              {invoices.map((inv) => {
                const statusStyle = STATUS_STYLES[inv.status] ?? 'text-[#888] bg-[#1c1c1c]';
                const isDownloading = downloadingId === inv.id;
                return (
                  <div key={inv.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-[#111] transition-colors">
                    {/* Date + description */}
                    <div>
                      <p className="text-sm text-white">{formatDate(inv.createdAt)}</p>
                      {inv.description && (
                        <p className="text-xs text-[#555] mt-0.5">{inv.description}</p>
                      )}
                    </div>

                    {/* Status badge */}
                    <span className={`text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 rounded-full ${statusStyle}`}>
                      {inv.status.toLowerCase()}
                    </span>

                    {/* Amount */}
                    <p className="text-sm font-medium text-white text-right tabular-nums">
                      {formatMoney(inv.amountCents, inv.currency)}
                    </p>

                    {/* Download button */}
                    <button
                      onClick={() => downloadPdf(inv.id, inv.stripeInvoiceId)}
                      disabled={isDownloading}
                      className="text-xs text-[#f59e0b] hover:text-[#d97706] disabled:text-[#555] transition-colors text-right"
                      title="Download PDF"
                    >
                      {isDownloading ? '…' : '↓ PDF'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

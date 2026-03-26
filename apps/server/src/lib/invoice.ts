// Invoice PDF generator — produces branded sponsor invoices using pdfkit.
// Called from the email worker (attachment) and the on-demand download endpoint.

import PDFDocument from 'pdfkit';

export interface InvoiceData {
  invoiceNumber: string;   // e.g. "INV-2024-001" derived from payment ID
  issuedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  amountCents: number;
  currency: string;        // e.g. "GBP"
  description: string;
  // Sponsor (bill-to)
  businessName: string;
  contactName: string | null;
  address: string | null;
  contactEmail: string;
  // Payment reference
  stripeInvoiceId: string | null;
}

// Formats cents to a currency string e.g. "£12.50"
function formatMoney(cents: number, currency: string): string {
  const symbols: Record<string, string> = { GBP: '£', USD: '$', EUR: '€' };
  const symbol = symbols[currency.toUpperCase()] ?? currency + ' ';
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

// Formats a Date to "26 Mar 2026"
function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Derives a short invoice number from the last 8 chars of the stripe invoice ID
export function invoiceNumber(stripeInvoiceId: string | null, paymentId: string): string {
  const ref = (stripeInvoiceId ?? paymentId).slice(-8).toUpperCase();
  return `INV-${ref}`;
}

// Generates a PDF invoice and returns it as a Buffer.
// Resolves when the PDF stream has been fully collected.
export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const GOLD = '#f59e0b';
    const DARK = '#111111';
    const MUTED = '#888888';
    const LINE = '#e5e5e5';
    const PAGE_W = 595 - 100; // A4 width minus margins

    // ---- Header band ----
    doc.rect(0, 0, 595, 80).fill(DARK);
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#ffffff').text('TREASURE HUNT', 50, 28);
    doc.fontSize(9).font('Helvetica').fillColor(GOLD).text('LOCATION-BASED EXPERIENCES', 50, 52);
    doc.fontSize(9).fillColor('#aaaaaa').text('treasurehunt.app', 595 - 160, 38, { width: 110, align: 'right' });

    // ---- Invoice title + number ----
    doc.moveDown(4);
    doc.fontSize(26).font('Helvetica-Bold').fillColor(DARK).text('INVOICE', 50, 100);
    doc.fontSize(10).font('Helvetica').fillColor(MUTED).text(data.invoiceNumber, 50, 130);

    // ---- Meta: issued / period ----
    const metaX = 370;
    doc.fontSize(8).font('Helvetica').fillColor(MUTED);
    doc.text('ISSUED', metaX, 100, { width: 175, align: 'right' });
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text(fmtDate(data.issuedAt), metaX, 113, { width: 175, align: 'right' });

    doc.fontSize(8).font('Helvetica').fillColor(MUTED).text('BILLING PERIOD', metaX, 135, { width: 175, align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor(DARK).text(
      `${fmtDate(data.periodStart)} – ${fmtDate(data.periodEnd)}`,
      metaX, 148, { width: 175, align: 'right' },
    );

    // ---- Divider ----
    doc.moveTo(50, 175).lineTo(545, 175).strokeColor(LINE).lineWidth(1).stroke();

    // ---- Bill To ----
    doc.fontSize(8).font('Helvetica').fillColor(MUTED).text('BILL TO', 50, 190);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK).text(data.businessName, 50, 205);
    let billY = 220;
    if (data.contactName) {
      doc.fontSize(10).font('Helvetica').fillColor(DARK).text(data.contactName, 50, billY);
      billY += 14;
    }
    doc.fontSize(10).font('Helvetica').fillColor(DARK).text(data.contactEmail, 50, billY);
    if (data.address) {
      billY += 14;
      doc.fontSize(9).fillColor(MUTED).text(data.address, 50, billY, { width: 200 });
    }

    // ---- Line items table header ----
    const tableTop = 310;
    doc.rect(50, tableTop, PAGE_W, 24).fill('#f5f5f5');
    doc.fontSize(8).font('Helvetica-Bold').fillColor(MUTED);
    doc.text('DESCRIPTION', 58, tableTop + 8);
    doc.text('PERIOD', 280, tableTop + 8, { width: 140, align: 'center' });
    doc.text('AMOUNT', 420, tableTop + 8, { width: 125, align: 'right' });

    // ---- Line item row ----
    const rowTop = tableTop + 36;
    doc.fontSize(10).font('Helvetica').fillColor(DARK);
    doc.text(data.description, 58, rowTop, { width: 220 });
    doc.text(
      `${fmtDate(data.periodStart)} – ${fmtDate(data.periodEnd)}`,
      280, rowTop, { width: 140, align: 'center' },
    );
    doc.font('Helvetica-Bold').text(
      formatMoney(data.amountCents, data.currency),
      420, rowTop, { width: 125, align: 'right' },
    );

    // ---- Divider ----
    doc.moveTo(50, rowTop + 30).lineTo(545, rowTop + 30).strokeColor(LINE).lineWidth(0.5).stroke();

    // ---- Total ----
    const totalY = rowTop + 46;
    doc.fontSize(9).font('Helvetica').fillColor(MUTED).text('SUBTOTAL', 280, totalY, { width: 140, align: 'center' });
    doc.text(formatMoney(data.amountCents, data.currency), 420, totalY, { width: 125, align: 'right' });

    doc.rect(50, totalY + 20, PAGE_W, 32).fill(DARK);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff')
      .text('TOTAL DUE', 58, totalY + 28);
    doc.fillColor(GOLD).text(
      formatMoney(data.amountCents, data.currency),
      420, totalY + 28, { width: 125, align: 'right' },
    );

    // ---- Reference ----
    if (data.stripeInvoiceId) {
      doc.fontSize(8).font('Helvetica').fillColor(MUTED)
        .text(`Stripe reference: ${data.stripeInvoiceId}`, 50, totalY + 72);
    }

    // ---- Footer ----
    doc.fontSize(8).fillColor(MUTED)
      .text('Thank you for partnering with Treasure Hunt.', 50, 750, { width: PAGE_W, align: 'center' })
      .text('Questions? contact@treasurehunt.app', 50, 762, { width: PAGE_W, align: 'center' });

    doc.end();
  });
}

// Root layout — loads Inter font, sets dark background, and global metadata.

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Treasure Hunt Admin',
  description: 'Manage hunts, clues, and sponsors',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`bg-bg text-white ${inter.variable}`}>
      <body className="bg-bg font-sans antialiased">{children}</body>
    </html>
  );
}

// Root layout — sets dark background, system font, and global metadata.

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Treasure Hunt Admin',
  description: 'Manage hunts, clues, and sponsors',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-bg text-white">
      <body className="bg-bg font-sans antialiased">{children}</body>
    </html>
  );
}

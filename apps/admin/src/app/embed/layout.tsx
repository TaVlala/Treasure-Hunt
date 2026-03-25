// Server layout for /embed/* routes.
// Applies noindex metadata and strips the dashboard chrome — these pages are iframeable.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Treasure Hunt Widget',
  robots: 'noindex',
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

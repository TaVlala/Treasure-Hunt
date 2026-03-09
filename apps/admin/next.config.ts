// Next.js 15 config for the Treasure Hunt admin panel.
// Transpiles the shared package (TypeScript source, no separate build step).

import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@treasure-hunt/shared'],
};

export default config;

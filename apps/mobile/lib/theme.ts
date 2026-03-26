// theme.ts — single source of truth for design tokens across the mobile app.
// Import Colors, Fonts, Spacing, and Radius from here instead of hardcoding in every file.

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
export const Colors = {
  bg:           '#0a0a0a',
  surface:      '#141414',
  surface2:     '#1c1c1c',
  border:       '#242424',
  borderStrong: 'rgba(255,255,255,0.16)',
  accent:       '#f59e0b',
  accentDim:    '#78450a',
  accentBg:     'rgba(245,158,11,0.12)',
  text:         '#ffffff',
  textMuted:    '#888888',
  textFaint:    '#555555',
  green:        '#22c55e',
  greenBg:      'rgba(34,197,94,0.12)',
  red:          '#ef4444',
  redBg:        'rgba(239,68,68,0.12)',
  blue:         '#60a5fa',
  blueBg:       'rgba(96,165,250,0.12)',
  yellow:       '#facc15',
  yellowBg:     'rgba(250,204,21,0.12)',
} as const;

// ---------------------------------------------------------------------------
// Typography — font family names matching @expo-google-fonts exports
// ---------------------------------------------------------------------------
export const Fonts = {
  display:     'SpaceGrotesk_700Bold',
  displaySemi: 'SpaceGrotesk_600SemiBold',
  displayMed:  'SpaceGrotesk_500Medium',
  body:        'Inter_400Regular',
  bodyMed:     'Inter_500Medium',
  bodySemi:    'Inter_600SemiBold',
  bodyBold:    'Inter_700Bold',
} as const;

// Font size scale
export const FontSize = {
  xs:   10,
  sm:   12,
  base: 14,
  md:   16,
  lg:   18,
  xl:   22,
  xxl:  28,
  xxxl: 36,
} as const;

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------
export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
} as const;

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------
export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 100,
} as const;

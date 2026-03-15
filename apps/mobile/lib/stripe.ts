// Stripe client-side configuration for the mobile app.
// STRIPE_PUBLISHABLE_KEY is a public key — safe to ship in the app bundle.
// Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in your .env / EAS secrets before building.

// Publishable key from environment — empty string disables native Stripe UI gracefully
export const STRIPE_PUBLISHABLE_KEY: string =
  process.env['EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'] ?? '';

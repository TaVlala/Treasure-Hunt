// Root layout — wraps the entire app in StripeProvider + AuthProvider and configures the Stack.
// StripeProvider must be outermost so useStripe() is available in any screen.
// The Stack has two route groups: (auth) for unauthenticated screens, (tabs) for the main app.

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider } from '@/context/AuthContext';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe';

export default function RootLayout() {
  return (
    // merchantIdentifier is required for Apple Pay — set to your Apple Pay merchant ID in production
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.treasurehunt"
    >
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </StripeProvider>
  );
}

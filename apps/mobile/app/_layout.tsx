// Root layout — wraps the entire app in StripeProvider + AuthProvider and configures the Stack.
// Loads custom fonts (Space Grotesk + Inter) before rendering; hides splash until ready.

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider } from '@/context/AuthContext';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Hold rendering until fonts are ready to avoid flash of unstyled text
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#0a0a0a' }} />;
  }

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

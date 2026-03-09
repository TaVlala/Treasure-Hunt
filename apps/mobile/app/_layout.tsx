// Root layout — wraps the entire app in AuthProvider and configures the Expo Router Stack.
// The Stack has two route groups: (auth) for unauthenticated screens, (tabs) for the main app.

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}

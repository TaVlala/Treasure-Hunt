// Auth group layout — stack navigator for Login and Register screens.
// Redirects to the main app if the user is already authenticated.

import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

// Accent amber used for the loading spinner
const ACCENT = '#f59e0b';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  // Show a spinner while restoring auth from SecureStore
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={ACCENT} />
      </View>
    );
  }

  // Already logged in — go straight to the main app
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}

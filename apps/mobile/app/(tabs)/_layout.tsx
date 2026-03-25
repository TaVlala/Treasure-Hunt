// Tabs layout — bottom tab navigator for authenticated screens.
// Redirects to the login screen if the user is not authenticated.
// Tabs: Discover (hunt list) · History (past sessions).

import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

const BG = '#0a0a0a';
const SURFACE = '#141414';
const BORDER = '#242424';
const ACCENT = '#f59e0b';
const MUTED = '#555555';

export default function TabsLayout() {
  const { user, isLoading } = useAuth();

  // Show spinner while auth state is being restored
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={ACCENT} />
      </View>
    );
  }

  // Not logged in — send to login screen
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: SURFACE,
          borderTopColor: BORDER,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: MUTED,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => (
            <CompassIcon color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => (
            <HistoryIcon color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// Simple compass SVG icon rendered as a React Native view using borders
function CompassIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
      </View>
    </View>
  );
}

// History icon — a simple clock/list shape rendered via nested views
function HistoryIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer rectangle — represents a list/document */}
      <View style={{
        width: 16,
        height: 18,
        borderRadius: 3,
        borderWidth: 1.5,
        borderColor: color,
        paddingTop: 4,
        paddingHorizontal: 3,
        gap: 3,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
      }}>
        <View style={{ width: '100%', height: 1.5, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: '75%', height: 1.5, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: '90%', height: 1.5, backgroundColor: color, borderRadius: 1 }} />
      </View>
    </View>
  );
}

// Login screen — email + password form that calls AuthContext.login.
// On success Expo Router automatically navigates to /(tabs) via the auth layout redirect.

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }

    try {
      setLoading(true);
      await login(email.trim().toLowerCase(), password);
      // AuthContext sets user → auth layout redirects to /(tabs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.brandLabel}>TREASURE HUNT</Text>
          <Text style={styles.brandTagline}>Explore the city. Find the prizes.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Sign In</Text>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#555"
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#555"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Create one</Text>
            </TouchableOpacity>
          </Link>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BG = '#0a0a0a';
const SURFACE = '#141414';
const BORDER = '#242424';
const ACCENT = '#f59e0b';
const TEXT = '#ffffff';
const MUTED = '#888888';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandLabel: {
    color: ACCENT,
    fontSize: 11,
    letterSpacing: 5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  brandTagline: {
    color: MUTED,
    fontSize: 13,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 28,
  },
  title: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    color: MUTED,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: TEXT,
    fontSize: 15,
  },
  button: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    color: MUTED,
    fontSize: 14,
  },
  footerLink: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '600',
  },
});

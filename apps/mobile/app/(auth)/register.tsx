// Register screen — collects email, password, display name, and optional home city.
// On success Expo Router navigates to /(tabs) via the auth layout redirect.

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

export default function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setError(null);
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password || password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!displayName.trim()) { setError('Display name is required'); return; }

    try {
      setLoading(true);
      await register(email.trim().toLowerCase(), password, displayName.trim(), homeCity);
      // AuthContext sets user → auth layout redirects to /(tabs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start exploring in minutes</Text>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Display name */}
          <View style={styles.field}>
            <Text style={styles.label}>DISPLAY NAME <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              placeholder="Your name in the game"
              placeholderTextColor="#555"
              returnKeyType="next"
            />
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>EMAIL <Text style={styles.required}>*</Text></Text>
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
            <Text style={styles.label}>PASSWORD <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 8 characters"
              placeholderTextColor="#555"
              returnKeyType="next"
            />
          </View>

          {/* Home city (optional) */}
          <View style={styles.field}>
            <Text style={styles.label}>HOME CITY <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              value={homeCity}
              onChangeText={setHomeCity}
              autoCapitalize="words"
              placeholder="Tbilisi, Paris, New York…"
              placeholderTextColor="#555"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign in</Text>
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
    letterSpacing: -0.5,
  },
  subtitle: {
    color: MUTED,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
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
  required: {
    color: ACCENT,
  },
  optional: {
    color: '#555',
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 10,
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

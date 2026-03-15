// Team join screen — lets a player enter an invite code to join an existing team.
// Route: /team/join?sessionId=xxx&huntId=xxx
// On success shows team name + member count and a "Start Hunt" button.

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { playerFetch } from '@/lib/api';

// ---------------------------------------------------------------------------
// Design tokens (match hunt detail screen)
// ---------------------------------------------------------------------------
const BG = '#0a0a0a';
const SURFACE = '#141414';
const SURFACE2 = '#1c1c1c';
const BORDER = '#242424';
const ACCENT = '#f59e0b';
const TEXT = '#ffffff';
const MUTED = '#888888';
const GREEN = '#22c55e';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JoinTeamResult = {
  team: {
    id: string;
    name: string;
    huntId: string;
    inviteCode: string;
    creatorId: string;
    memberCount: number;
  };
  session: {
    id: string;
    teamId: string | null;
  };
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function JoinTeamScreen() {
  const { sessionId, huntId } = useLocalSearchParams<{ sessionId: string; huntId: string }>();
  const router = useRouter();

  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [result, setResult] = useState<JoinTeamResult | null>(null);

  // POST /api/v1/teams/join — look up the team and join it
  const onJoin = useCallback(async () => {
    const trimmed = inviteCode.trim().toUpperCase();
    if (trimmed.length < 6) {
      Alert.alert('Invalid code', 'Please enter the full invite code (at least 6 characters).', [{ text: 'OK' }]);
      return;
    }
    setIsJoining(true);
    try {
      const data = await playerFetch<JoinTeamResult>('/api/v1/teams/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: trimmed }),
      });
      setResult(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not join team';
      Alert.alert('Could not join', msg, [{ text: 'OK' }]);
    } finally {
      setIsJoining(false);
    }
  }, [inviteCode]);

  // Navigate to the active hunt screen once successfully joined
  const onStartHunt = useCallback(() => {
    if (!result) return;
    router.replace(
      `/hunt/${huntId}/active?sessionId=${sessionId}&huntId=${huntId}&teamId=${result.team.id}`,
    );
  }, [result, huntId, sessionId, router]);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Team</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        {result ? (
          /* Success state — show team info */
          <>
            <View style={styles.successCard}>
              <View style={styles.successIconRow}>
                <Text style={styles.successIcon}>✓</Text>
              </View>
              <Text style={styles.successLabel}>You joined</Text>
              <Text style={styles.teamNameDisplay}>{result.team.name}</Text>
              <View style={styles.memberCountRow}>
                <Text style={styles.memberCountText}>
                  {result.team.memberCount} member{result.team.memberCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={onStartHunt} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>Start Hunt →</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Input state — enter invite code */
          <>
            <Text style={styles.sectionLabel}>Invite code</Text>
            <TextInput
              style={styles.input}
              value={inviteCode}
              onChangeText={(v) => setInviteCode(v.toUpperCase())}
              placeholder="XXXXXXXX"
              placeholderTextColor={MUTED}
              maxLength={20}
              autoCapitalize="characters"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void onJoin()}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, isJoining && styles.primaryBtnDisabled]}
              onPress={() => void onJoin()}
              disabled={isJoining}
              activeOpacity={0.8}
            >
              {isJoining ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Join Team</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.helpText}>
              Ask your team captain for the 8-character invite code.
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header row with back button + title
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  backText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    color: TEXT,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 68, // mirrors back button width to keep title centered
  },

  // Main body
  body: {
    flex: 1,
    padding: 20,
    gap: 16,
  },

  // Text input
  sectionLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    color: ACCENT,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: 'monospace',
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlign: 'center',
  },
  helpText: {
    color: MUTED,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Primary action button (amber)
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // Success state
  successCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GREEN + '55',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  successIconRow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GREEN + '22',
    borderWidth: 1,
    borderColor: GREEN + '55',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successIcon: {
    color: GREEN,
    fontSize: 22,
    fontWeight: '800',
  },
  successLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  teamNameDisplay: {
    color: TEXT,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  memberCountRow: {
    backgroundColor: SURFACE2,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 4,
  },
  memberCountText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
});

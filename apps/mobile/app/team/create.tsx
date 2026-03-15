// Team creation screen — lets a player name a new team and receive an invite code.
// Route: /team/create?sessionId=xxx&huntId=xxx
// On success shows the invite code and a "Continue Hunt" button.

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CreateTeamResult = {
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

export default function CreateTeamScreen() {
  const { sessionId, huntId } = useLocalSearchParams<{ sessionId: string; huntId: string }>();
  const router = useRouter();

  const [teamName, setTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<CreateTeamResult | null>(null);

  // POST /api/v1/teams — create the team and capture the invite code
  const onCreate = useCallback(async () => {
    const trimmed = teamName.trim();
    if (!trimmed) {
      Alert.alert('Team name required', 'Please enter a name for your team.', [{ text: 'OK' }]);
      return;
    }
    setIsCreating(true);
    try {
      const data = await playerFetch<CreateTeamResult>('/api/v1/teams', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed, huntId }),
      });
      setResult(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not create team';
      Alert.alert('Error', msg, [{ text: 'OK' }]);
    } finally {
      setIsCreating(false);
    }
  }, [teamName, huntId]);

  // Navigate to the active hunt screen once the team is created
  const onContinue = useCallback(() => {
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
        <Text style={styles.headerTitle}>Create Team</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        {result ? (
          /* Success state — show invite code */
          <>
            <View style={styles.successCard}>
              <Text style={styles.successLabel}>Team created!</Text>
              <Text style={styles.teamNameDisplay}>{result.team.name}</Text>
            </View>

            <View style={styles.inviteBox}>
              <Text style={styles.inviteLabel}>Share this code with teammates</Text>
              <Text style={styles.inviteCode}>{result.team.inviteCode}</Text>
              <Text style={styles.inviteHint}>Your teammates enter this code on the "Join Team" screen</Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={onContinue} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>Continue Hunt →</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Input state — enter team name */
          <>
            <Text style={styles.sectionLabel}>Team name</Text>
            <TextInput
              style={styles.input}
              value={teamName}
              onChangeText={setTeamName}
              placeholder="e.g. The Explorers"
              placeholderTextColor={MUTED}
              maxLength={80}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void onCreate()}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, isCreating && styles.primaryBtnDisabled]}
              onPress={() => void onCreate()}
              disabled={isCreating}
              activeOpacity={0.8}
            >
              {isCreating ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Create Team</Text>
              )}
            </TouchableOpacity>
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
    color: TEXT,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
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

  // Success state cards
  successCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    alignItems: 'center',
    gap: 6,
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
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  // Invite code display
  inviteBox: {
    backgroundColor: SURFACE2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: ACCENT + '55',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  inviteLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inviteCode: {
    color: ACCENT,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 6,
    fontFamily: 'monospace',
  },
  inviteHint: {
    color: MUTED,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
});

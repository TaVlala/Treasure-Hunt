// Active hunt screen — live GPS tracking toward current clue.
// Supports GPS proximity unlock, QR code scanning, text riddle, photo challenge, image clue, hint reveal, and hunt completion.
// Receives sessionId + huntId as search params from the detail screen on join/resume.

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Image,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { playerFetch } from '@/lib/api';
import { loadBundle, saveBundle } from '@/lib/huntCache';
import type {
  ClueWithSponsor,
  Hunt,
  HuntBundle,
  SessionWithProgress,
  SubmitClueResult,
} from '@treasure-hunt/shared';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const BG = '#0a0a0a';
const SURFACE = '#141414';
const SURFACE2 = '#1c1c1c';
const BORDER = '#242424';
const ACCENT = '#f59e0b';
const TEXT = '#ffffff';
const MUTED = '#888888';
const GREEN = '#22c55e';
const HINT_COST = 5;

// ---------------------------------------------------------------------------
// Pure math helpers
// ---------------------------------------------------------------------------

// Haversine great-circle distance in metres (mirrors server fallback)
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Formats distance to value + unit string (switches to km above 1 000 m)
function fmtDistance(meters: number): { value: string; unit: string } {
  if (meters >= 1000) return { value: (meters / 1000).toFixed(1), unit: 'km' };
  return { value: Math.round(meters).toString(), unit: 'm' };
}

// Color-codes distance: green = in range, accent = close, grey = far
function proximityColor(distMeters: number, radiusMeters: number, accent: string): string {
  if (distMeters <= radiusMeters) return GREEN;
  if (distMeters <= radiusMeters * 3) return accent;
  return MUTED;
}

// ---------------------------------------------------------------------------
// Animated proximity ring
// ---------------------------------------------------------------------------
function ProximityRing({
  distanceMeters,
  radiusMeters,
  accent,
}: {
  distanceMeters: number | null;
  radiusMeters: number;
  accent: string;
}) {
  // Inner breathing pulse (always running)
  const pulse = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.85, duration: 900, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  // Outer expanding ring — only animates when within 2x radius
  const outerPulse = useRef(new Animated.Value(1)).current;
  const isNearby = distanceMeters !== null && distanceMeters < radiusMeters * 2;

  useEffect(() => {
    if (isNearby) {
      const expandAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(outerPulse, { toValue: 1.4, duration: 800, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
          Animated.timing(outerPulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        ]),
      );
      expandAnim.start();
      return () => expandAnim.stop();
    } else {
      outerPulse.setValue(1);
    }
  }, [isNearby, outerPulse]);

  const within = distanceMeters !== null && distanceMeters <= radiusMeters;
  const ringColor = distanceMeters !== null ? proximityColor(distanceMeters, radiusMeters, accent) : BORDER;
  const ringSize = distanceMeters === null
    ? 180
    : Math.max(80, Math.min(200, 80 + (distanceMeters / radiusMeters) * 120));

  // Outer ring size tracks inner ring size so it always sits just outside it
  const outerSize = ringSize + 24;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer expanding proximity ring — fades as it expands */}
      {isNearby && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            borderWidth: 2,
            borderColor: '#FF6B35',
            transform: [{ scale: outerPulse }],
            opacity: outerPulse.interpolate({ inputRange: [1, 1.4], outputRange: [0.7, 0] }),
          }}
        />
      )}

      {/* Inner proximity ring with breathing animation */}
      <Animated.View style={[
        styles.ring,
        {
          width: ringSize, height: ringSize, borderRadius: ringSize / 2,
          borderColor: ringColor, transform: [{ scale: pulse }],
          opacity: within ? 1 : 0.7,
        },
      ]}>
        <View style={[styles.ringDot, { backgroundColor: ringColor }]} />
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ActiveHuntScreen() {
  const { sessionId, huntId } = useLocalSearchParams<{ sessionId: string; huntId: string }>();
  const router = useRouter();

  // Session + clue state
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [session, setSession] = useState<SessionWithProgress | null>(null);
  const [currentClue, setCurrentClue] = useState<ClueWithSponsor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hint state
  const [hintRevealed, setHintRevealed] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [isRevealingHint, setIsRevealingHint] = useState(false);

  // QR scanner state
  const [showQR, setShowQR] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // GPS state
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);

  // Text riddle answer state
  const [answerInput, setAnswerInput] = useState('');
  // Photo challenge state
  const [photoTaken, setPhotoTaken] = useState(false);

  // Offline bundle cache — populated on mount from AsyncStorage or network
  const bundleClues = useRef<ClueWithSponsor[]>([]);

  // ---------------------------------------------------------------------------
  // Bundle helper — finds a clue from the in-memory bundle ref by id
  // ---------------------------------------------------------------------------
  const getClueFromBundle = useCallback(
    (clueId: string): ClueWithSponsor | undefined =>
      bundleClues.current.find((c) => c.id === clueId),
    [],
  );

  // ---------------------------------------------------------------------------
  // Load session + current clue on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    void (async () => {
      try {
        // Fetch session and hunt branding in parallel for fast startup
        const [data, huntData] = await Promise.all([
          playerFetch<SessionWithProgress>(`/api/v1/game/sessions/${sessionId}`),
          playerFetch<Hunt>(`/api/v1/player/hunts/${huntId}`).catch(() => null),
        ]);
        setSession(data);
        setHunt(huntData);

        // Hydrate offline bundle cache — try AsyncStorage first, then network
        const cached = await loadBundle(huntId);
        if (cached) {
          bundleClues.current = cached;
        } else {
          const bundle = await playerFetch<HuntBundle>(
            `/api/v1/player/hunts/${huntId}/bundle`,
          ).catch(() => null);
          if (bundle) {
            bundleClues.current = bundle.clues;
            await saveBundle(huntId, bundle.clues);
          }
        }

        const unlockedProgress = data.progress.find((p) => p.status === 'unlocked');
        if (unlockedProgress) {
          // Use bundle clue when available; fall back to individual network fetch
          const bundledClue = getClueFromBundle(unlockedProgress.clueId);
          const clue = bundledClue
            ?? await playerFetch<ClueWithSponsor>(
                `/api/v1/player/hunts/${huntId}/clues/${unlockedProgress.clueId}`,
              ).catch(() => null);
          setCurrentClue(clue);
          // Restore hint if already used before (e.g. app reopen mid-hunt)
          if (unlockedProgress.hintUsed && clue?.hintText) {
            setHintRevealed(true);
            setHintText(clue.hintText);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load session');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [sessionId, huntId, getClueFromBundle]);

  // ---------------------------------------------------------------------------
  // GPS permission + tracking
  // ---------------------------------------------------------------------------
  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (!locationGranted || !currentClue) return;

    void (async () => {
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 3, timeInterval: 2000 },
        (loc) => {
          setDistanceMeters(haversineMeters(
            loc.coords.latitude, loc.coords.longitude,
            currentClue.latitude, currentClue.longitude,
          ));
        },
      );
    })();

    return () => { locationSub.current?.remove(); };
  }, [locationGranted, currentClue]);

  // Reset transient state when the clue changes
  useEffect(() => {
    setHintRevealed(false);
    setHintText(null);
    setDistanceMeters(null);
    setQrScanned(false);
    setShowQR(false);
    setAnswerInput('');
    setPhotoTaken(false);
  }, [currentClue?.id]);

  // ---------------------------------------------------------------------------
  // Submit clue as found
  // ---------------------------------------------------------------------------
  const onSubmit = useCallback(async (method: 'gps' | 'qr_code' | 'answer' | 'photo' = 'gps') => {
    if (!currentClue || !session) return;
    setIsSubmitting(true);
    setShowQR(false);
    try {
      const result = await playerFetch<SubmitClueResult>(
        `/api/v1/game/sessions/${sessionId}/submit`,
        { method: 'POST', body: JSON.stringify({ clueId: currentClue.id, method, ...(method === 'answer' && { answer: answerInput }), ...(method === 'photo' && { photoTaken: true }) }) },
      );

      // Haptic success feedback when a clue is found
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (result.huntComplete) {
        router.replace(`/hunt/${huntId}/complete?sessionId=${sessionId}`);
        return;
      }

      // Load full clue data (with sponsor) for the next clue — bundle-first
      const nextClue = result.nextClue
        ? (getClueFromBundle(result.nextClue.id) ??
            await playerFetch<ClueWithSponsor>(
              `/api/v1/player/hunts/${huntId}/clues/${result.nextClue.id}`,
            ).catch(() => ({ ...result.nextClue!, sponsor: null }) as ClueWithSponsor))
        : null;

      setSession(result.session);
      setCurrentClue(nextClue);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Submit failed', [{ text: 'OK' }]);
      setQrScanned(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentClue, session, sessionId, huntId, router, getClueFromBundle, answerInput]);

  // ---------------------------------------------------------------------------
  // Hint reveal
  // ---------------------------------------------------------------------------
  const onRevealHint = useCallback(async () => {
    if (!currentClue || hintRevealed) return;
    setIsRevealingHint(true);
    try {
      const result = await playerFetch<{ hintText: string; newScore: number; costPoints: number }>(
        `/api/v1/game/sessions/${sessionId}/hint`,
        { method: 'POST', body: JSON.stringify({ clueId: currentClue.id }) },
      );
      setHintText(result.hintText);
      setHintRevealed(true);
      setSession((prev) => prev ? { ...prev, score: result.newScore } : prev);
    } catch (e) {
      // HINT_ALREADY_USED — show the text locally without another deduction
      if (currentClue.hintText) {
        setHintText(currentClue.hintText);
        setHintRevealed(true);
      } else {
        Alert.alert('Hint', e instanceof Error ? e.message : 'Could not get hint', [{ text: 'OK' }]);
      }
    } finally {
      setIsRevealingHint(false);
    }
  }, [currentClue, hintRevealed, sessionId]);

  // ---------------------------------------------------------------------------
  // QR scanner
  // ---------------------------------------------------------------------------
  const onOpenQR = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Camera required', 'Enable camera access in Settings to scan QR clues.', [{ text: 'OK' }]);
        return;
      }
    }
    setQrScanned(false);
    setShowQR(true);
  }, [cameraPermission, requestCameraPermission]);

  const onBarcodeScanned = useCallback((_event: { data: string }) => {
    if (qrScanned || isSubmitting) return;
    setQrScanned(true);
    void onSubmit('qr_code');
  }, [qrScanned, isSubmitting, onSubmit]);

  // ---------------------------------------------------------------------------
  // Photo challenge handler
  // ---------------------------------------------------------------------------
  const onTakePhoto = useCallback(async () => {
    // Request camera permission if needed
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera required', 'Enable camera access in Settings for photo challenges.', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoTaken(true);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Terminal states
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
          <Text style={styles.loadingText}>Loading hunt...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Something went wrong</Text>
          <Text style={styles.stateBody}>{error}</Text>
          <TouchableOpacity style={styles.accentBtn} onPress={() => router.back()}>
            <Text style={styles.accentBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (locationGranted === false) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.stateIcon}>📍</Text>
          <Text style={styles.stateTitle}>Location required</Text>
          <Text style={styles.stateBody}>Enable location access in Settings to track your position during the hunt.</Text>
          <TouchableOpacity style={styles.accentBtn} onPress={() => router.back()}>
            <Text style={styles.accentBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentClue || !session) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.stateIcon}>🎉</Text>
          <Text style={styles.stateTitle}>Hunt Complete!</Text>
          <Text style={styles.stateBody}>All clues have been found.</Text>
          <TouchableOpacity style={styles.accentBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.accentBtnText}>Back to Discover</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived state for main UI
  // ---------------------------------------------------------------------------
  // Use hunt's whitelabel color when set, otherwise fall back to the default amber accent
  const accent = hunt?.whitelabelColor ?? ACCENT;

  const isQRClue = currentClue.clueType === 'qr_code';
  const withinRange = !isQRClue && distanceMeters !== null && distanceMeters <= currentClue.proximityRadiusMeters;
  const dist = distanceMeters !== null ? fmtDistance(distanceMeters) : null;
  const distColor = distanceMeters !== null ? proximityColor(distanceMeters, currentClue.proximityRadiusMeters, accent) : MUTED;
  const clueIndex = session.progress.filter((p) => p.status === 'found').length;
  const currentProgress = session.progress.find((p) => p.clueId === currentClue.id);
  const hintAlreadyUsed = currentProgress?.hintUsed ?? false;
  const canSubmitGPS = withinRange && !isSubmitting;

  const isImageClue = currentClue.clueType === 'image';
  const isPhotoChallenge = currentClue.clueType === 'photo_challenge';
  const isTextRiddle = currentClue.clueType === 'text_riddle';
  const canSubmitAnswer = isTextRiddle && answerInput.trim().length > 0 && !isSubmitting;
  const canSubmitPhoto = isPhotoChallenge && photoTaken && withinRange && !isSubmitting;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.progressPill}>
          <Text style={styles.progressText}>Clue {clueIndex + 1} of {session.totalClues}</Text>
        </View>
        <TouchableOpacity
          style={[styles.scorePill, { backgroundColor: accent + '22', borderColor: accent + '55' }]}
          onPress={() => router.push(`/hunt/${huntId}/leaderboard?sessionId=${sessionId}&playerId=${session.playerId}`)}
          activeOpacity={0.7}
        >
          <Text style={[styles.scoreText, { color: accent }]}>🏆 {session.score} pts</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${(clueIndex / session.totalClues) * 100}%`, backgroundColor: accent }]} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* GPS proximity ring (hidden for QR clues) */}
        {!isQRClue && (
          <>
            <View style={styles.ringContainer}>
              <ProximityRing distanceMeters={distanceMeters} radiusMeters={currentClue.proximityRadiusMeters} accent={accent} />
              {dist ? (
                <View style={styles.distanceBlock}>
                  <Text style={[styles.distanceValue, { color: distColor }]}>{dist.value}</Text>
                  <Text style={[styles.distanceUnit, { color: distColor }]}>{dist.unit}</Text>
                </View>
              ) : (
                <View style={styles.distanceBlock}>
                  <ActivityIndicator color={MUTED} size="small" />
                  <Text style={styles.gpsLabel}>Getting GPS...</Text>
                </View>
              )}
              <Text style={styles.radiusLabel}>Within {currentClue.proximityRadiusMeters}m to unlock</Text>
            </View>
            {withinRange && (
              <View style={styles.inRangeBanner}>
                <Text style={styles.inRangeText}>✓ You're in range!</Text>
              </View>
            )}
          </>
        )}

        {/* QR prompt (shown for QR clues) */}
        {isQRClue && (
          <View style={styles.qrPromptBlock}>
            <Text style={styles.qrPromptIcon}>📷</Text>
            <Text style={styles.qrPromptTitle}>Scan the QR code</Text>
            <Text style={styles.qrPromptBody}>Find the QR code at this location and scan it to unlock the clue.</Text>
          </View>
        )}

        {/* Clue card */}
        <View style={styles.clueCard}>
          <View style={styles.clueCardHeader}>
            <View style={styles.clueTypeTag}>
              <Text style={styles.clueTypeText}>{currentClue.clueType.replace(/_/g, ' ')}</Text>
            </View>
            {currentClue.isBonus && (
              <View style={[styles.bonusTag, { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
                <Text style={[styles.bonusText, { color: accent }]}>BONUS +{currentClue.points}</Text>
              </View>
            )}
          </View>
          <Text style={styles.clueTitle}>{currentClue.title}</Text>
          <Text style={styles.clueDesc}>{currentClue.description}</Text>

          {/* IMAGE clue — show image above description */}
          {isImageClue && currentClue.imageUrl ? (
            <Image
              source={{ uri: currentClue.imageUrl }}
              style={styles.clueImage}
              resizeMode="contain"
            />
          ) : null}

          {/* PHOTO CHALLENGE — show challenge prompt chip */}
          {isPhotoChallenge ? (
            <View style={styles.photoChallengePrompt}>
              <Text style={styles.photoChallengeText}>📸 Take a photo at this location to complete the challenge</Text>
            </View>
          ) : null}

          {currentClue.unlockMessage && (withinRange || isQRClue) && (
            <View style={[styles.unlockMsg, { backgroundColor: accent + '18', borderColor: accent + '44' }]}>
              <Text style={[styles.unlockMsgText, { color: accent }]}>💡 {currentClue.unlockMessage}</Text>
            </View>
          )}
        </View>

        {/* Sponsor strip — shown when this clue is sponsored */}
        {currentClue.sponsor && (
          <View style={[
            styles.sponsorStrip,
            currentClue.sponsor.brandingColor
              ? { borderColor: currentClue.sponsor.brandingColor + '66' }
              : { borderColor: accent + '44' },
          ]}>
            <View style={styles.sponsorRow}>
              <Text style={[styles.sponsorBadge, { backgroundColor: accent + '22', color: accent }]}>SPONSOR</Text>
              <Text style={styles.sponsorName}>{currentClue.sponsor.businessName}</Text>
            </View>
            {currentClue.sponsor.brandedMessage ? (
              <Text style={styles.sponsorMessage}>{currentClue.sponsor.brandedMessage}</Text>
            ) : null}
            {currentClue.sponsor.offerText ? (
              <View style={[styles.sponsorOfferRow, { backgroundColor: accent + '18' }]}>
                <Text style={[styles.sponsorOfferText, { color: accent }]}>{currentClue.sponsor.offerText}</Text>
              </View>
            ) : null}
            {currentClue.sponsor.callToAction ? (
              <Text style={styles.sponsorCTA}>{currentClue.sponsor.callToAction}</Text>
            ) : null}
          </View>
        )}

        {/* Hint card */}
        {currentClue.hintText && (
          hintRevealed ? (
            <View style={[styles.hintRevealed, { borderColor: accent + '44' }]}>
              <Text style={[styles.hintRevealedLabel, { color: accent }]}>Hint</Text>
              <Text style={styles.hintRevealedText}>{hintText}</Text>
              {hintAlreadyUsed && <Text style={styles.hintUsedNote}>−{HINT_COST} pts deducted</Text>}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.hintCard}
              onPress={() => void onRevealHint()}
              disabled={isRevealingHint}
            >
              {isRevealingHint
                ? <ActivityIndicator color={MUTED} size="small" />
                : <Text style={styles.hintLabel}>
                    {hintAlreadyUsed ? 'Show hint (already used)' : `Reveal hint (−${HINT_COST} pts)`}
                  </Text>
              }
            </TouchableOpacity>
          )
        )}

        {/* Text riddle answer input */}
        {isTextRiddle && (
          <View style={styles.answerBlock}>
            <Text style={styles.answerLabel}>Your answer</Text>
            <TextInput
              style={styles.answerInput}
              value={answerInput}
              onChangeText={setAnswerInput}
              placeholder="Type your answer..."
              placeholderTextColor={MUTED}
              autoCapitalize="none"
              returnKeyType="done"
            />
          </View>
        )}
      </ScrollView>

      {/* Submit CTA */}
      <View style={styles.footer}>
        {isQRClue ? (
          /* existing QR button — unchanged */
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled, !isSubmitting && { backgroundColor: accent }]}
            onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void onOpenQR(); }}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? <ActivityIndicator color="#000" /> : <Text style={styles.submitText}>Scan QR Code 📷</Text>}
          </TouchableOpacity>
        ) : isTextRiddle ? (
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmitAnswer && styles.submitBtnDisabled, canSubmitAnswer && { backgroundColor: accent }]}
            onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void onSubmit('answer'); }}
            disabled={!canSubmitAnswer}
            activeOpacity={0.8}
          >
            {isSubmitting ? <ActivityIndicator color={canSubmitAnswer ? '#000' : MUTED} /> : <Text style={[styles.submitText, !canSubmitAnswer && styles.submitTextDisabled]}>Submit Answer</Text>}
          </TouchableOpacity>
        ) : isPhotoChallenge ? (
          photoTaken ? (
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmitPhoto && styles.submitBtnDisabled, canSubmitPhoto && { backgroundColor: accent }]}
              onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void onSubmit('photo'); }}
              disabled={!canSubmitPhoto}
              activeOpacity={0.8}
            >
              {isSubmitting ? <ActivityIndicator color={canSubmitPhoto ? '#000' : MUTED} /> : <Text style={[styles.submitText, !canSubmitPhoto && styles.submitTextDisabled]}>{withinRange ? 'Submit Photo ✓' : `Get closer — ${dist ? `${dist.value} ${dist.unit}` : '...'}`}</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: accent }]}
              onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void onTakePhoto(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>Take Photo 📸</Text>
            </TouchableOpacity>
          )
        ) : (
          /* existing GPS button — unchanged */
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmitGPS && styles.submitBtnDisabled, canSubmitGPS && { backgroundColor: accent }]}
            onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void onSubmit('gps'); }}
            disabled={!canSubmitGPS}
            activeOpacity={0.8}
          >
            {isSubmitting ? <ActivityIndicator color={canSubmitGPS ? '#000' : MUTED} /> : <Text style={[styles.submitText, !canSubmitGPS && styles.submitTextDisabled]}>{withinRange ? "I'm Here! 📍" : dist ? `${dist.value} ${dist.unit} away` : 'Locating...'}</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* QR scanner modal */}
      <Modal visible={showQR} animationType="slide" onRequestClose={() => setShowQR(false)}>
        <SafeAreaView style={styles.qrModal}>
          <View style={styles.qrHeader}>
            <Text style={styles.qrHeaderTitle}>Scan QR Code</Text>
            <TouchableOpacity style={styles.qrCloseBtn} onPress={() => setShowQR(false)}>
              <Text style={styles.qrCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <CameraView
            style={styles.qrCamera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={qrScanned ? undefined : onBarcodeScanned}
          />
          <View style={styles.qrFooter}>
            <Text style={styles.qrFooterText}>Point the camera at a QR code to unlock the clue.</Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120, padding: 20 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 8 },
  backBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE },
  backText: { color: MUTED, fontSize: 12, fontWeight: '600' },
  progressPill: { flex: 1, alignItems: 'center' },
  progressText: { color: TEXT, fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
  scorePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: ACCENT + '22', borderWidth: 1, borderColor: ACCENT + '55' },
  scoreText: { color: ACCENT, fontSize: 12, fontWeight: '700' },

  progressBarTrack: { height: 3, backgroundColor: SURFACE2 },
  progressBarFill: { height: 3, backgroundColor: ACCENT },

  ringContainer: { alignItems: 'center', paddingVertical: 32, gap: 16 },
  ring: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ringDot: { width: 10, height: 10, borderRadius: 5 },
  distanceBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  distanceValue: { fontSize: 52, fontWeight: '800', letterSpacing: -2, lineHeight: 56 },
  distanceUnit: { fontSize: 20, fontWeight: '600', marginBottom: 4 },
  gpsLabel: { color: MUTED, fontSize: 14, fontWeight: '500', marginTop: 4 },
  radiusLabel: { color: MUTED, fontSize: 12, fontWeight: '500' },

  inRangeBanner: { backgroundColor: GREEN + '22', borderWidth: 1, borderColor: GREEN + '55', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 16 },
  inRangeText: { color: GREEN, fontSize: 15, fontWeight: '700' },

  qrPromptBlock: { alignItems: 'center', paddingVertical: 40, gap: 12, marginBottom: 8 },
  qrPromptIcon: { fontSize: 56, opacity: 0.8 },
  qrPromptTitle: { color: TEXT, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  qrPromptBody: { color: MUTED, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },

  clueCard: { backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 12 },
  clueCardHeader: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  clueTypeTag: { backgroundColor: SURFACE2, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: BORDER },
  clueTypeText: { color: MUTED, fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  bonusTag: { backgroundColor: ACCENT + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: ACCENT + '55' },
  bonusText: { color: ACCENT, fontSize: 10, fontWeight: '700' },
  clueTitle: { color: TEXT, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginBottom: 8 },
  clueDesc: { color: MUTED, fontSize: 15, lineHeight: 22 },
  clueImage: { width: '100%', height: 200, borderRadius: 10, marginTop: 12, marginBottom: 4, backgroundColor: SURFACE2 },
  photoChallengePrompt: { marginTop: 12, backgroundColor: SURFACE2, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: BORDER },
  photoChallengeText: { color: MUTED, fontSize: 13, lineHeight: 18 },
  unlockMsg: { marginTop: 12, backgroundColor: ACCENT + '18', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: ACCENT + '44' },
  unlockMsgText: { color: ACCENT, fontSize: 13, fontWeight: '500', lineHeight: 18 },

  sponsorStrip: { backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: ACCENT + '44', padding: 14, marginBottom: 12, gap: 6 },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sponsorBadge: { backgroundColor: ACCENT + '22', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, color: ACCENT, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  sponsorName: { color: TEXT, fontSize: 14, fontWeight: '700' },
  sponsorMessage: { color: MUTED, fontSize: 13, lineHeight: 18 },
  sponsorOfferRow: { backgroundColor: ACCENT + '18', borderRadius: 6, padding: 8 },
  sponsorOfferText: { color: ACCENT, fontSize: 13, fontWeight: '600' },
  sponsorCTA: { color: MUTED, fontSize: 12, fontStyle: 'italic' },

  hintCard: { backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', padding: 14, alignItems: 'center', marginBottom: 12 },
  hintLabel: { color: MUTED, fontSize: 13, fontWeight: '600' },
  hintRevealed: { backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: ACCENT + '44', padding: 14, marginBottom: 12 },
  hintRevealedLabel: { color: ACCENT, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  hintRevealedText: { color: TEXT, fontSize: 14, lineHeight: 20 },
  hintUsedNote: { color: MUTED, fontSize: 11, marginTop: 6 },

  answerBlock: { backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 12 },
  answerLabel: { color: MUTED, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  answerInput: { backgroundColor: SURFACE2, borderRadius: 8, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 10, color: TEXT, fontSize: 15 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 28, backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER },
  submitBtn: { backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { backgroundColor: SURFACE2, borderWidth: 1, borderColor: BORDER },
  submitText: { color: '#000', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  submitTextDisabled: { color: MUTED },

  qrModal: { flex: 1, backgroundColor: BG },
  qrHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  qrHeaderTitle: { color: TEXT, fontSize: 17, fontWeight: '700' },
  qrCloseBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE },
  qrCloseText: { color: MUTED, fontSize: 13, fontWeight: '600' },
  qrCamera: { flex: 1 },
  qrFooter: { padding: 24, alignItems: 'center' },
  qrFooterText: { color: MUTED, fontSize: 13, textAlign: 'center', lineHeight: 19 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { color: MUTED, fontSize: 14, marginTop: 12 },
  stateIcon: { fontSize: 40, marginBottom: 14 },
  stateTitle: { color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 8, letterSpacing: -0.3 },
  stateBody: { color: MUTED, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  accentBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  accentBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
});

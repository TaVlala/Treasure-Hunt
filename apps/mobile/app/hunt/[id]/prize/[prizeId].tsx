// Prize detail screen — shows full prize info + sponsor location and a tap-to-generate QR code.
// Navigated to from complete.tsx with huntId, prizeId, and sessionId params.
// Calls POST /api/v1/player/prizes/:prizeId/redeem (idempotent) to generate the redemption.

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { playerFetch } from '@/lib/api';
import type { SponsorPrize, PrizeType, Redemption } from '@treasure-hunt/shared';

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

// ---------------------------------------------------------------------------
// Prize type metadata
// ---------------------------------------------------------------------------
const PRIZE_TYPE_META: Record<PrizeType, { label: string; color: string; icon: string }> = {
  discount: { label: 'Discount', color: GREEN, icon: '🏷️' },
  free_item: { label: 'Free Item', color: '#3b82f6', icon: '🆓' },
  experience: { label: 'Experience', color: ACCENT, icon: '✨' },
  gift_card: { label: 'Gift Card', color: '#a855f7', icon: '💳' },
  merch: { label: 'Merchandise', color: '#64748b', icon: '👕' },
};

// ---------------------------------------------------------------------------
// QR section — renders either the code, a generate button, or an error
// ---------------------------------------------------------------------------
function QRSection({
  redemption,
  isGenerating,
  generateError,
  onGenerate,
}: {
  redemption: Redemption | null;
  isGenerating: boolean;
  generateError: string | null;
  onGenerate: () => void;
}) {
  if (redemption) {
    // Format expiry as readable date
    const expiryDate = new Date(redemption.expiresAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const isRedeemed = redemption.status === 'redeemed';
    const isExpired = redemption.status === 'expired';

    return (
      <View style={styles.qrSection}>
        <Text style={styles.sectionLabel}>Redemption QR Code</Text>

        {/* Status badge when not in GENERATED state */}
        {(isRedeemed || isExpired) && (
          <View style={[styles.statusBadge, isRedeemed ? styles.statusRedeemed : styles.statusExpired]}>
            <Text style={styles.statusBadgeText}>
              {isRedeemed ? '✓ Already Redeemed' : '✕ Expired'}
            </Text>
          </View>
        )}

        {/* QR code on a white background card */}
        <View style={styles.qrCard}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={redemption.qrCode}
              size={200}
              backgroundColor="#ffffff"
              color="#000000"
            />
          </View>
          <Text style={styles.qrCode}>{redemption.qrCode}</Text>
          <Text style={styles.qrExpiry}>Valid until {expiryDate}</Text>
        </View>

        <Text style={styles.qrInstruction}>
          Show this QR code to the sponsor at their location to redeem your prize.
        </Text>
      </View>
    );
  }

  // Not yet generated
  return (
    <View style={styles.qrSection}>
      <Text style={styles.sectionLabel}>Redemption QR Code</Text>

      <View style={styles.qrGenerateCard}>
        <Text style={styles.qrGenerateIcon}>📲</Text>
        <Text style={styles.qrGenerateTitle}>Ready to claim your prize?</Text>
        <Text style={styles.qrGenerateBody}>
          Generate a unique QR code to show the sponsor when you visit their location.
        </Text>

        {generateError ? (
          <Text style={styles.qrGenerateError}>{generateError}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
          onPress={onGenerate}
          activeOpacity={0.8}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.generateBtnText}>Generate QR Code</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PrizeScreen() {
  const { huntId, prizeId, sessionId } = useLocalSearchParams<{
    huntId: string;
    prizeId: string;
    sessionId: string;
  }>();
  const router = useRouter();

  const [prize, setPrize] = useState<SponsorPrize | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [redemption, setRedemption] = useState<Redemption | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Fetch prize details on mount
  useEffect(() => {
    void (async () => {
      try {
        const prizes = await playerFetch<SponsorPrize[]>(
          `/api/v1/player/hunts/${huntId}/prizes?sessionId=${sessionId}`,
        );
        const found = prizes.find((p) => p.id === prizeId);
        if (!found) throw new Error('Prize not found or not yet earned');
        setPrize(found);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load prize');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [huntId, prizeId, sessionId]);

  // Call POST /redeem — idempotent, safe to call multiple times
  async function handleGenerate() {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const result = await playerFetch<Redemption>(`/api/v1/player/prizes/${prizeId}/redeem`, {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      setRedemption(result);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Could not generate QR code');
    } finally {
      setIsGenerating(false);
    }
  }

  // Opens sponsor website in the device browser
  function handleVisitSponsor() {
    if (prize?.sponsor.websiteUrl) {
      void Linking.openURL(prize.sponsor.websiteUrl);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
          <Text style={styles.loadingText}>Loading prize...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------
  if (error || !prize) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.stateIcon}>⚠️</Text>
          <Text style={styles.stateTitle}>Prize unavailable</Text>
          <Text style={styles.stateBody}>{error ?? 'Unknown error'}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Back to Results</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Main prize UI
  // ---------------------------------------------------------------------------
  const meta = PRIZE_TYPE_META[prize.prizeType];

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>← Back to Results</Text>
        </TouchableOpacity>

        {/* Grand prize crown */}
        {prize.isGrandPrize && (
          <View style={styles.grandBanner}>
            <Text style={styles.grandBannerText}>👑 Grand Prize</Text>
          </View>
        )}

        {/* Prize image or placeholder */}
        {prize.imageUrl ? (
          <Image source={{ uri: prize.imageUrl }} style={styles.prizeImage} resizeMode="cover" />
        ) : (
          <View style={styles.prizeImagePlaceholder}>
            <Text style={styles.prizeImagePlaceholderIcon}>{meta.icon}</Text>
          </View>
        )}

        {/* Type badge + value */}
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: meta.color + '22' }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {prize.valueDescription ? (
            <Text style={styles.valueText}>{prize.valueDescription}</Text>
          ) : null}
        </View>

        {/* Title */}
        <Text style={styles.title}>{prize.title}</Text>

        {/* Description */}
        {prize.description ? (
          <Text style={styles.description}>{prize.description}</Text>
        ) : null}

        {/* Expiry */}
        {prize.expiryDate ? (
          <View style={styles.expiryRow}>
            <Text style={styles.expiryText}>⏰ Expires {prize.expiryDate}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        {/* Sponsor info */}
        <View style={styles.sponsorCard}>
          <Text style={styles.sectionLabel}>Redeem at</Text>
          <View style={styles.sponsorRow}>
            {prize.sponsor.logoUrl ? (
              <Image
                source={{ uri: prize.sponsor.logoUrl }}
                style={styles.sponsorLogo}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.sponsorLogoPlaceholder}>
                <Text style={styles.sponsorLogoPlaceholderText}>
                  {prize.sponsor.businessName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.sponsorInfo}>
              <Text style={styles.sponsorName}>{prize.sponsor.businessName}</Text>
              <Text style={styles.sponsorAddress}>{prize.sponsor.address}</Text>
            </View>
          </View>

          {prize.sponsor.websiteUrl ? (
            <TouchableOpacity style={styles.websiteBtn} onPress={handleVisitSponsor} activeOpacity={0.8}>
              <Text style={styles.websiteBtnText}>Visit Website ↗</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* QR code section */}
        <QRSection
          redemption={redemption}
          isGenerating={isGenerating}
          generateError={generateError}
          onGenerate={handleGenerate}
        />

        {/* Terms */}
        {prize.termsConditions ? (
          <>
            <View style={styles.divider} />
            <View style={styles.termsSection}>
              <Text style={styles.sectionLabel}>Terms & Conditions</Text>
              <Text style={styles.termsText}>{prize.termsConditions}</Text>
            </View>
          </>
        ) : null}

        {/* Back CTA */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>Back to Results</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48, gap: 16 },

  backBtn: { alignSelf: 'flex-start', marginBottom: 4 },
  backBtnText: { color: ACCENT, fontSize: 14, fontWeight: '700' },

  grandBanner: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  grandBannerText: { color: '#000', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },

  prizeImage: { width: '100%', height: 200, borderRadius: 16, backgroundColor: SURFACE2 },
  prizeImagePlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeImagePlaceholderIcon: { fontSize: 64 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  valueText: { color: GREEN, fontSize: 16, fontWeight: '800' },

  title: { color: TEXT, fontSize: 26, fontWeight: '800', letterSpacing: -0.8, lineHeight: 32 },
  description: { color: MUTED, fontSize: 15, lineHeight: 22 },

  expiryRow: {
    backgroundColor: '#ef444418',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  expiryText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },

  divider: { height: 1, backgroundColor: BORDER },

  sectionLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },

  sponsorCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  sponsorRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  sponsorLogo: { width: 48, height: 48, borderRadius: 10, backgroundColor: SURFACE2 },
  sponsorLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: SURFACE2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  sponsorLogoPlaceholderText: { color: TEXT, fontSize: 20, fontWeight: '800' },
  sponsorInfo: { flex: 1, gap: 3 },
  sponsorName: { color: TEXT, fontSize: 16, fontWeight: '700' },
  sponsorAddress: { color: MUTED, fontSize: 13, lineHeight: 18 },

  websiteBtn: {
    backgroundColor: SURFACE2,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  websiteBtnText: { color: ACCENT, fontSize: 14, fontWeight: '700' },

  // QR section
  qrSection: { gap: 12 },

  statusBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  statusRedeemed: { backgroundColor: GREEN + '22' },
  statusExpired: { backgroundColor: '#ef444422' },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: TEXT },

  qrCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  qrWrapper: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
  },
  qrCode: { color: MUTED, fontSize: 11, fontFamily: 'monospace', letterSpacing: 1 },
  qrExpiry: { color: MUTED, fontSize: 12 },
  qrInstruction: { color: MUTED, fontSize: 13, textAlign: 'center', lineHeight: 19 },

  qrGenerateCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  qrGenerateIcon: { fontSize: 40 },
  qrGenerateTitle: { color: TEXT, fontSize: 16, fontWeight: '700' },
  qrGenerateBody: { color: MUTED, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  qrGenerateError: { color: '#ef4444', fontSize: 13, textAlign: 'center' },

  generateBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginTop: 4,
    minWidth: 180,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },

  termsSection: { gap: 4 },
  termsText: { color: MUTED, fontSize: 12, lineHeight: 18 },

  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { color: MUTED, fontSize: 14, marginTop: 12 },
  stateIcon: { fontSize: 40, marginBottom: 14 },
  stateTitle: { color: TEXT, fontSize: 18, fontWeight: '700', marginBottom: 8, letterSpacing: -0.3 },
  stateBody: { color: MUTED, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
});

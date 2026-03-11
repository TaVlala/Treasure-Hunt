// Expo Push Notification service.
// Sends push notifications via the Expo Push API (no SDK required — plain HTTP).
// Fire-and-forget: errors are logged but never propagate to the caller.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Shape of a single Expo push message
interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default' | null;
  badge?: number;
}

// Sends a push notification to one Expo push token.
// Silently ignores errors so game flow is never blocked by notification failures.
export async function sendPushNotification(
  token: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  // No token — player hasn't granted notification permission; skip silently
  if (!token) return;

  // Only send to valid Expo push tokens (ExponentPushToken[...] or ExpoPushToken[...])
  if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
    return;
  }

  const message: ExpoPushMessage = {
    to: token,
    title,
    body,
    sound: 'default',
    ...(data && { data }),
  };

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[push] Expo API error ${res.status}: ${text}`);
    }
  } catch (err) {
    // Network error — log and swallow so the caller is unaffected
    console.error('[push] Failed to send push notification:', err);
  }
}

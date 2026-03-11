// Expo Push Notification registration utility.
// Requests permission, obtains an Expo push token, and returns it.
// Call this after login and on app start. Returns null if permission is denied.

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications are displayed while the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Android requires a notification channel to be created before showing notifications
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Treasure Hunt',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#f59e0b',
  });
}

// Requests notification permission and returns the Expo push token string.
// Returns null if the device is a simulator or permission is denied.
export async function registerForPushNotifications(): Promise<string | null> {
  // Expo push tokens are only available on physical devices
  if (!Constants.isDevice) return null;

  await ensureAndroidChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Ask for permission if not yet determined
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Fetch the Expo push token (projectId from EAS config if available)
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  return tokenData.data;
}

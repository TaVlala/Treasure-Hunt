// touristPrefs.ts — persists the tourist city preference and onboarding state to AsyncStorage.
// city = null means "explore all cities" (no filter applied).

import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDED_KEY = 'tourist_onboarded';
const CITY_KEY      = 'tourist_city';

export interface TouristPrefs {
  onboarded: boolean;
  city: string | null; // null = explore all
}

// Reads both keys in parallel
export async function getTouristPrefs(): Promise<TouristPrefs> {
  const [onboarded, city] = await Promise.all([
    AsyncStorage.getItem(ONBOARDED_KEY),
    AsyncStorage.getItem(CITY_KEY),
  ]);
  return {
    onboarded: onboarded === 'true',
    city: city && city.length > 0 ? city : null,
  };
}

// Saves the chosen city (or null for "all") and marks onboarding complete
export async function setTouristCity(city: string | null): Promise<void> {
  await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
  if (city) {
    await AsyncStorage.setItem(CITY_KEY, city);
  } else {
    await AsyncStorage.removeItem(CITY_KEY);
  }
}

// Resets to "explore all" without clearing onboarded flag
export async function clearTouristCity(): Promise<void> {
  await AsyncStorage.removeItem(CITY_KEY);
}

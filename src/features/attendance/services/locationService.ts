import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';
import type { Coordinates } from '../types';

export async function getForegroundPermissionStatus() {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status;
}

export async function requestForegroundPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status;
}

// "Always" permission — needed only for geofence auto-checkout (Phase 2),
// not for the foreground check-in/out flow. Unavailable on web.
export async function getBackgroundPermissionStatus() {
  if (Platform.OS === 'web') return 'unavailable' as const;
  const { status } = await Location.getBackgroundPermissionsAsync();
  return status;
}

export async function requestBackgroundPermission() {
  if (Platform.OS === 'web') return 'unavailable' as const;
  const { status } = await Location.requestBackgroundPermissionsAsync();
  return status;
}

export async function getCurrentCoordinates(): Promise<Coordinates | null> {
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
}

// Best-effort — reverse geocoding is unsupported on web and can fail even
// on-device, so a null return just means "no address," never an error the
// caller needs to handle. Never blocks a check-in/out.
export async function reverseGeocode(coords: Coordinates): Promise<string | null> {
  try {
    const [place] = await Location.reverseGeocodeAsync(coords);
    if (!place) return null;
    return [place.street, place.city ?? place.subregion, place.region].filter(Boolean).join(', ') || null;
  } catch {
    return null;
  }
}

export function mapsUrlFor(coords: Coordinates): string {
  const query = `${coords.latitude},${coords.longitude}`;
  return Platform.select({
    ios: `maps:0,0?q=${query}`,
    android: `geo:0,0?q=${query}`,
    default: `https://www.google.com/maps?q=${query}`,
  })!;
}

export function openInMaps(coords: Coordinates) {
  Linking.openURL(mapsUrlFor(coords)).catch(() => {
    // Fall back to the universal web URL if the native scheme can't be opened.
    Linking.openURL(`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`);
  });
}

import { Inter_400Regular, Inter_500Medium, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { darkTheme, lightTheme } from '@/constants/theme';
import { AuthProvider } from '@/features/auth/hooks/useAuth';
// Side-effect import: registers the geofence background task (TaskManager.defineTask)
// unconditionally at load, per Expo's documented pattern — needed even before
// any screen mounts, since the OS can relaunch the app straight into this handler.
import '@/features/attendance/services/geofenceTask';

SplashScreen.preventAutoHideAsync();

// React Navigation's own theme (screen container background, header, tab
// bar chrome) is a *separate* system from Paper's MD3 theme — Paper's
// ThemeProvider only colors Paper components via context, it never paints
// the navigator's own background. Without this, screens stay permanently
// light while Paper components correctly follow dark mode, which reads as
// broken (light-on-light or dark-on-light) rather than just "not dark".
// Keep these two theme objects' background/surface/primary in sync.
const navigationLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: lightTheme.colors.primary,
    background: lightTheme.colors.background,
    card: lightTheme.colors.surface,
    text: lightTheme.colors.onBackground,
    border: lightTheme.colors.outlineVariant,
  },
};

const navigationDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: darkTheme.colors.primary,
    background: darkTheme.colors.background,
    card: darkTheme.colors.surface,
    text: darkTheme.colors.onBackground,
    border: darkTheme.colors.outlineVariant,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  // Keep the splash screen up until Inter is actually loaded — without
  // this, text renders in the OS fallback font for one visible frame, then
  // snaps to Inter once it loads (a flash of unstyled text).
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <ThemeProvider value={isDark ? navigationDarkTheme : navigationLightTheme}>
            <AuthProvider>
              <StatusBar style={isDark ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerShown: false }} />
            </AuthProvider>
          </ThemeProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

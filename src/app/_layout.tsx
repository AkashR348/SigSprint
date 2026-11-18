import { Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts } from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { loadProgress } from '@/lib/progressStore';
import { colors } from '@/theme/tokens';

// Rejects harmlessly on a hot reload, when the splash is already gone.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  // A font that fails to load must not strand the user on the splash screen.
  const ready = loaded || error !== null;

  // Read the save at launch, whichever screen opens first.
  useEffect(() => {
    void loadProgress();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      {/* A test runs above the tabs, so the tab bar is not there to leave it by accident. */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />
    </>
  );
}

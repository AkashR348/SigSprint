import { Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts } from '@expo-google-fonts/nunito';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme/tokens';
import React from 'react';

SplashScreen.preventAutoHideAsync();

type IconName = ComponentProps<typeof Ionicons>['name'];

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'study', title: 'Study', icon: 'book' },
  { name: 'games', title: 'Games', icon: 'game-controller' },
  { name: 'progress', title: 'Progress', icon: 'stats-chart' },
];

export default function RootLayout() {
  const [loaded, error] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  // A font that fails to load must not strand the user on the splash screen.
  const ready = loaded || error !== null;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.green,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: { fontFamily: fonts.extraBold, fontSize: 12, lineHeight: 16 },
          tabBarStyle: {
            borderTopColor: colors.border,
            borderTopWidth: 2,
            height: 76 + insets.bottom,
            paddingTop: 8,
            paddingBottom: 12 + insets.bottom,
          },
        }}>
        {tabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} size={size} color={typeof color === 'string' ? color : colors.muted} />,
            }}
          />
        ))}
      </Tabs>
    </>
  );
}

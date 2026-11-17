import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme/tokens';

const MAX_LABEL_SCALE = 1.5;
const LABEL_LINE = 16;

type IconName = ComponentProps<typeof Ionicons>['name'];

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'study', title: 'Study', icon: 'book' },
  { name: 'games', title: 'Games', icon: 'game-controller' },
  { name: 'progress', title: 'Progress', icon: 'stats-chart' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Labels grow with the system text size up to the cap, and the bar grows with them.
  const labelScale = Math.min(useWindowDimensions().fontScale, MAX_LABEL_SCALE);

  return (
    <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.green,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            borderTopColor: colors.border,
            borderTopWidth: 2,
            height: 60 + LABEL_LINE * labelScale + insets.bottom,
            paddingTop: 8,
            paddingBottom: 12 + insets.bottom,
          },
        }}>
        {tabs.map((tab, i) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              // A function label drops the bar's own iOS announcement of the tab's position.
              tabBarAccessibilityLabel: Platform.OS === 'ios' ? `${tab.title}, tab, ${i + 1} of ${tabs.length}` : undefined,
              tabBarLabel: ({ color }) => (
                <Text maxFontSizeMultiplier={MAX_LABEL_SCALE} numberOfLines={1} style={[styles.label, { color }]}>
                  {tab.title}
                </Text>
              ),
              tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} size={size} color={typeof color === 'string' ? color : colors.muted} />,
            }}
          />
        ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.extraBold, fontSize: 12, lineHeight: LABEL_LINE },
});

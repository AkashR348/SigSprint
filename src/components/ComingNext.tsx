import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Mascot } from '@/components/Mascot';
import { colors, fonts, space } from '@/theme/tokens';
import React from 'react';

/** Placeholder for a tab whose screens are not built yet. */
export function ComingNext({ title, detail }: { title: string; detail: string }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body}>
        <Mascot size={96} />
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.md },
  title: { fontFamily: fonts.black, fontSize: 24, color: colors.ink, textAlign: 'center' },
  detail: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24, color: colors.muted, textAlign: 'center' },
});

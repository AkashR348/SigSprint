import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChunkyButton } from '@/components/ChunkyButton';
import { PracticeRunner } from '@/components/PracticeRunner';
import { starterQuestions } from '@/content/starterQuestions';
import { fromParams, pickQuestions } from '@/lib/practice';
import { setupBroken } from '@/lib/practiceText';
import { colors, fonts, space } from '@/theme/tokens';

export default function PracticeRunScreen() {
  const router = useRouter();
  const config = fromParams(useLocalSearchParams());
  // Drawn once, so a redraw never reshuffles a test in progress.
  const [questions] = useState(() => (config === null ? [] : pickQuestions(starterQuestions, config).questions));

  return (
    <SafeAreaView style={styles.screen}>
      {config === null || questions.length === 0 ? (
        <View style={styles.broken}>
          <Text accessibilityRole="header" style={styles.text}>{setupBroken}</Text>
          <ChunkyButton label="Back" onPress={() => router.back()} />
        </View>
      ) : (
        <PracticeRunner questions={questions} config={config} onLeave={() => router.dismissAll()} onNewTest={() => router.back()} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  broken: { flex: 1, justifyContent: 'center', padding: space.xxl, gap: space.lg },
  text: { fontFamily: fonts.black, fontSize: 18, lineHeight: 26, color: colors.ink, textAlign: 'center' },
});

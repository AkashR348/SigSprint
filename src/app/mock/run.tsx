import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChunkyButton } from '@/components/ChunkyButton';
import { MockExamRunner } from '@/components/MockExamRunner';
import { SaveNotice } from '@/components/SaveNotice';
import { starterQuestions } from '@/content/starterQuestions';
import { quitExam, resolveExam } from '@/lib/mockExam';
import type { SavedExam } from '@/lib/mockSave';
import { examBroken, noExam } from '@/lib/mockText';
import { getProgressState, loadProgress, subscribeProgress, updateProgress } from '@/lib/progressStore';
import { colors, fonts, space } from '@/theme/tokens';

export default function MockRunScreen() {
  const router = useRouter();
  const state = useSyncExternalStore(subscribeProgress, getProgressState, getProgressState);
  // Taken once from the save, so the results stay up after the finished exam leaves it.
  const [held, setHeld] = useState<SavedExam | null>(null);
  const stored = state.status === 'ready' ? state.progress.exam : undefined;
  if (held === null && stored) setHeld(stored);
  const questions = useMemo(() => (held === null ? null : resolveExam(held, starterQuestions)), [held]);

  useEffect(() => {
    void loadProgress();
  }, []);

  const toSetup = () => router.dismissTo('/mock/setup');
  const discard = () => {
    void updateProgress((p) => (p.exam ? quitExam(p) : null)).then(toSetup);
  };

  let body = null;
  if (held !== null && questions !== null) {
    body = <MockExamRunner saved={held} questions={questions} onLeave={toSetup} onNewExam={toSetup} />;
  } else if (held !== null) {
    body = (
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.text}>{examBroken}</Text>
        <ChunkyButton label="Discard this exam" onPress={discard} />
      </View>
    );
  } else if (state.status === 'unavailable') {
    body = (
      <View style={styles.center}>
        <SaveNotice reason={state.reason} />
        <ChunkyButton tone="plain" label="Back" onPress={toSetup} />
      </View>
    );
  } else if (state.status === 'ready') {
    body = (
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.text}>{noExam}</Text>
        <ChunkyButton label="Back" onPress={toSetup} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* No swipe back: leaving an exam goes through the question the close button asks. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: 'center', padding: space.xxl, gap: space.lg },
  text: { fontFamily: fonts.black, fontSize: 18, lineHeight: 26, color: colors.ink, textAlign: 'center' },
});

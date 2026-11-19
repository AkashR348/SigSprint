import { useRouter } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChunkyButton } from '@/components/ChunkyButton';
import { IconButton } from '@/components/IconButton';
import { MockHistory } from '@/components/MockHistory';
import { SaveNotice } from '@/components/SaveNotice';
import { Segmented } from '@/components/Segmented';
import { starterQuestions } from '@/content/starterQuestions';
import { focusOn } from '@/lib/focusOn';
import { drawExam, examCounts, quitExam, startExam } from '@/lib/mockExam';
import type { ExamLength, ExamMode } from '@/lib/mockSave';
import { examRules, inProgressClock, inProgressLine, needsProgress, startFailed } from '@/lib/mockText';
import { getProgressState, loadProgress, subscribeProgress, updateProgress } from '@/lib/progressStore';
import { useAnnounce } from '@/lib/useAnnounce';
import { colors, fonts, radius, space } from '@/theme/tokens';

export default function MockSetupScreen() {
  const router = useRouter();
  const state = useSyncExternalStore(subscribeProgress, getProgressState, getProgressState);
  const [mode, setMode] = useState<ExamMode>('exam');
  const [length, setLength] = useState<ExamLength>('full');
  const [failed, setFailed] = useState(false);
  const [starting, setStarting] = useState(false);
  // Quitting takes two taps: ask, then agree.
  const [quitting, setQuitting] = useState(false);
  const quitText = useRef<ComponentRef<typeof Text>>(null);

  useEffect(() => {
    void loadProgress();
  }, []);

  useEffect(() => {
    if (!quitting) return;
    AccessibilityInfo.announceForAccessibility('Quit this exam? Nothing from it will count.');
    focusOn(quitText.current);
  }, [quitting]);
  useAnnounce(failed ? startFailed : null);

  const ready = state.status === 'ready';
  const current = ready ? state.progress.exam : undefined;
  const records = ready ? (state.progress.exams ?? []) : null;

  const start = () => {
    const exam = drawExam(starterQuestions, mode, length, Date.now());
    if (exam === null) return setFailed(true);
    setStarting(true);
    setFailed(false);
    void updateProgress((p) => startExam(p, exam)).then((ok) => {
      setStarting(false);
      if (ok) router.push('/mock/run');
      else setFailed(true);
    });
  };
  const quit = () => {
    void updateProgress((p) => (p.exam ? quitExam(p) : null)).then(() => setQuitting(false));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          <Text accessibilityRole="header" style={styles.title}>Mock exam</Text>
        </View>

        {state.status === 'unavailable' && <SaveNotice reason={state.reason} />}

        {current ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.cardTitle}>Exam in progress</Text>
            <Text style={styles.body}>{inProgressLine(current.mode, current.length, examCounts(current).answered, current.ids.length)}</Text>
            <Text style={styles.body}>{inProgressClock(current.mode, current.clock)}</Text>
            {quitting ? (
              <>
                <Text ref={quitText} accessible style={styles.body}>
                  Quit this exam? Nothing from it will count.
                </Text>
                <ChunkyButton label="Yes, quit exam" onPress={quit} />
                <ChunkyButton tone="plain" label="Cancel" onPress={() => setQuitting(false)} />
              </>
            ) : (
              <>
                <ChunkyButton label="Continue exam" onPress={() => router.push('/mock/run')} />
                <ChunkyButton tone="plain" label="Quit exam" onPress={() => setQuitting(true)} />
              </>
            )}
          </View>
        ) : (
          <>
            <Segmented
              label="Mode"
              value={mode}
              options={[{ value: 'exam', label: 'Exam-like' }, { value: 'relaxed', label: 'Relaxed' }]}
              onChange={setMode}
            />
            <Segmented
              label="Length"
              value={length}
              options={[{ value: 'full', label: 'Full · 90' }, { value: 'half', label: 'Half · 45' }]}
              onChange={setLength}
            />
            <View style={styles.group}>
              <Text accessibilityRole="header" style={styles.label}>RULES</Text>
              {examRules(mode, length).map((rule) => (
                <View key={rule} style={styles.rule}>
                  <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.dot}>•</Text>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {records !== null && <MockHistory records={records} />}
      </ScrollView>

      {!current && (
        <View style={styles.footer}>
          {failed && (
            <Text accessibilityLiveRegion="polite" style={styles.notice}>
              {startFailed}
            </Text>
          )}
          {state.status === 'unavailable' && <Text style={styles.notice}>{needsProgress}</Text>}
          <ChunkyButton label="Start exam" disabled={!ready || starting} onPress={start} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.xl, gap: space.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { fontFamily: fonts.black, fontSize: 24, color: colors.ink, flexShrink: 1 },
  card: { gap: space.md, backgroundColor: colors.greenTint, borderRadius: radius.xl, padding: space.xl },
  cardTitle: { fontFamily: fonts.black, fontSize: 20, color: colors.ink },
  body: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.ink },
  group: { gap: space.sm },
  label: { fontFamily: fonts.black, fontSize: 13, color: colors.muted },
  rule: { flexDirection: 'row', gap: space.sm },
  dot: { fontFamily: fonts.black, fontSize: 15, lineHeight: 22, color: colors.green },
  ruleText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.ink },
  footer: { padding: space.xl, paddingTop: space.md, gap: space.sm },
  notice: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.ink, textAlign: 'center' },
});

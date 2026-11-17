import { type ComponentRef, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/ChunkyButton';
import type { Progress } from '@/lib/progress';
import { findRecovery, getProgressState, handleRecovery, subscribeProgress, type Recovery } from '@/lib/progressStore';
import { recoveryFailed, recoveryResult, recoverySummary, recoveryTitle } from '@/lib/recoveryText';
import { colors, fonts, radius, space } from '@/theme/tokens';

// `done` holds the buttons locked until the next look for backups replaces the card.
type Step = { key: string; at: 'working' | 'failed' | 'done' };
// What happened to a backup, and the save it left. It stays up until the save next changes.
type Result = { key: string; text: string; progress: Progress };

/** Offers the sound parts of a damaged save's backup. Draws nothing when there is nothing to say. */
export function RecoverCard() {
  const state = useSyncExternalStore(subscribeProgress, getProgressState, getProgressState);
  const ready = state.status === 'ready';
  const handled = state.status === 'ready' ? state.progress.handledBackups : undefined;
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [told, setTold] = useState<Result | null>(null);
  const resultLine = useRef<ComponentRef<typeof Text>>(null);

  // Look when the save becomes ready and when a backup is handled; an answer changes neither.
  useEffect(() => {
    let current = true;
    void findRecovery().then((next) => {
      if (current) setRecovery(next);
    });
    return () => {
      current = false;
    };
  }, [ready, handled]);

  const key = recovery?.key ?? null;
  const summary = recovery === null ? null : recoverySummary(recovery.found);
  // A step belongs to the backup it was taken on, so the next card starts unlocked and without an error.
  const at = step !== null && step.key === key ? step.at : 'idle';

  // Nothing reads a card that appears on its own, so say it once per backup.
  useEffect(() => {
    if (summary !== null) AccessibilityInfo.announceForAccessibility(summary);
  }, [key, summary]);

  useEffect(() => {
    if (at === 'failed') AccessibilityInfo.announceForAccessibility(recoveryFailed);
  }, [at]);

  const result = told !== null && state.status === 'ready' && state.progress === told.progress ? told : null;
  const resultKey = result?.key ?? null;
  const resultText = result?.text ?? null;

  // Keyed on the backup, so adding a second one is said again though the words are the same.
  useEffect(() => {
    if (resultText === null) return;
    AccessibilityInfo.announceForAccessibility(resultText);
    // The button that was focused is gone; put focus on the line that says what happened.
    if (Platform.OS !== 'web' && resultLine.current) AccessibilityInfo.sendAccessibilityEvent(resultLine.current, 'focus');
  }, [resultKey, resultText]);

  if (recovery === null && result === null) return null;

  const handle = (target: Recovery, recover: boolean) => {
    setStep({ key: target.key, at: 'working' });
    void handleRecovery(target.key, recover).then((done) => {
      setStep({ key: target.key, at: done ? 'done' : 'failed' });
      const after = getProgressState();
      if (done && after.status === 'ready') {
        setTold({ key: target.key, text: recoveryResult(recover, target.found !== null), progress: after.progress });
      }
    });
  };
  const busy = at === 'working' || at === 'done';

  return (
    <View style={styles.card}>
      {result !== null && (
        <Text key={result.key} ref={resultLine} style={styles.text}>
          {result.text}
        </Text>
      )}
      {recovery !== null && at !== 'done' && (
        <>
          <Text accessibilityRole="header" style={styles.title}>
            {recoveryTitle}
          </Text>
          <Text style={styles.text}>{summary}</Text>
          {at === 'failed' && <Text style={styles.text}>{recoveryFailed}</Text>}
          {recovery.found !== null ? (
            <>
              <Text style={styles.text}>Adding it keeps everything you have now.</Text>
              <ChunkyButton label="Add to my progress" disabled={busy} onPress={() => handle(recovery, true)} />
              <ChunkyButton tone="plain" label="Don't recover" disabled={busy} onPress={() => handle(recovery, false)} />
            </>
          ) : (
            <ChunkyButton tone="plain" label="OK" disabled={busy} onPress={() => handle(recovery, false)} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, backgroundColor: colors.greenTint, borderRadius: radius.lg, padding: space.lg },
  title: { fontFamily: fonts.black, fontSize: 17, color: colors.greenOnTint },
  text: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.greenOnTint },
});

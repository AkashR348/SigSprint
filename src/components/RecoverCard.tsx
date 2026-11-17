import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/ChunkyButton';
import { findRecovery, getProgressState, handleRecovery, subscribeProgress, type Recovery } from '@/lib/progressStore';
import { recoveryFailed, recoverySummary } from '@/lib/recoveryText';
import { colors, fonts, radius, space } from '@/theme/tokens';

/** Offers the sound parts of a damaged save's backup. Draws nothing when no backup is waiting. */
export function RecoverCard() {
  const state = useSyncExternalStore(subscribeProgress, getProgressState, getProgressState);
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [step, setStep] = useState<'idle' | 'working' | 'failed'>('idle');

  // Look again whenever the save changes: a handled backup drops out, an older one may be next.
  useEffect(() => {
    let current = true;
    void findRecovery().then((next) => {
      if (current) setRecovery(next);
    });
    return () => {
      current = false;
    };
  }, [state]);

  const summary = recovery === null ? null : recoverySummary(recovery.found);
  const said = step === 'failed' ? recoveryFailed : summary;

  // Nothing reads a card that appears on its own, so say it.
  useEffect(() => {
    if (said !== null) AccessibilityInfo.announceForAccessibility(said);
  }, [said]);

  if (recovery === null || summary === null) return null;

  const handle = (recover: boolean) => {
    setStep('working');
    void handleRecovery(recovery.key, recover).then((done) => setStep(done ? 'idle' : 'failed'));
  };
  const busy = step === 'working';

  return (
    <View style={styles.card}>
      <Text style={styles.text}>{summary}</Text>
      {step === 'failed' && <Text style={styles.text}>{recoveryFailed}</Text>}
      {recovery.found !== null ? (
        <>
          <Text style={styles.text}>Adding it keeps everything you have now.</Text>
          <ChunkyButton label="Add to my progress" disabled={busy} onPress={() => handle(true)} />
          <ChunkyButton tone="plain" label="Don't recover" disabled={busy} onPress={() => handle(false)} />
        </>
      ) : (
        <ChunkyButton tone="plain" label="OK" disabled={busy} onPress={() => handle(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, backgroundColor: colors.greenTint, borderRadius: radius.lg, padding: space.lg },
  text: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.greenOnTint },
});

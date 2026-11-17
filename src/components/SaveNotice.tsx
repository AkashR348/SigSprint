import { Ionicons } from '@expo/vector-icons';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/ChunkyButton';
import { startFreshFailed, startFreshWarning, unavailableNotice } from '@/lib/dailyGoal';
import { retryProgress, startFresh } from '@/lib/progressStore';
import { colors, fonts, radius, space } from '@/theme/tokens';

type Step = 'idle' | 'confirming' | 'working' | 'failed';

/** Shown while the save is unavailable: says answers won't be kept, and offers the way out. */
export function SaveNotice({ reason }: { reason: 'read' | 'damaged' }) {
  const notice = unavailableNotice(reason);
  // Starting fresh takes two taps: ask, then agree.
  const [step, setStep] = useState<Step>('idle');
  const detail = useRef<ComponentRef<typeof Text>>(null);
  const said = step === 'confirming' ? startFreshWarning : step === 'failed' ? startFreshFailed : null;

  // Nothing reads text that appears on its own, so say it.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(notice);
  }, [notice]);

  useEffect(() => {
    if (said === null) return;
    AccessibilityInfo.announceForAccessibility(said);
    // The button that was focused is gone; put focus on what replaced it.
    if (Platform.OS !== 'web' && detail.current) AccessibilityInfo.sendAccessibilityEvent(detail.current, 'focus');
  }, [said]);

  const agree = () => {
    setStep('working');
    // On success the save becomes ready and this notice unmounts.
    void startFresh(new Date()).then((done) => {
      if (!done) setStep('failed');
    });
  };

  return (
    <View style={styles.notice}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Ionicons name="warning" size={20} color={colors.yellowOnTint} />
      </View>
      <View style={styles.body}>
        <Text style={styles.text}>{notice}</Text>
        {reason === 'read' && <ChunkyButton label="Try again" onPress={() => void retryProgress()} />}
        {reason === 'damaged' && step === 'idle' && (
          <ChunkyButton label="Start fresh" onPress={() => setStep('confirming')} />
        )}
        {reason === 'damaged' && step !== 'idle' && (
          <>
            <Text ref={detail} accessible style={styles.text}>
              {step === 'failed' ? startFreshFailed : startFreshWarning}
            </Text>
            <ChunkyButton label="Yes, start fresh" disabled={step === 'working'} onPress={agree} />
            <ChunkyButton tone="plain" label="Cancel" disabled={step === 'working'} onPress={() => setStep('idle')} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', gap: space.md, backgroundColor: colors.yellowTint, borderRadius: radius.lg, padding: space.lg },
  body: { flex: 1, gap: space.md },
  text: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.yellowOnTint },
});

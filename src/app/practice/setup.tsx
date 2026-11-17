import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChunkyButton } from '@/components/ChunkyButton';
import { IconButton } from '@/components/IconButton';
import { Segmented } from '@/components/Segmented';
import { domains, type DomainId } from '@/content/domains';
import { starterQuestions } from '@/content/starterQuestions';
import { availableCount, defaultConfig, estimateMinutes, QUESTION_COUNTS, toParams, type TestConfig } from '@/lib/practice';
import { setupSummary, shortNotice } from '@/lib/practiceText';
import { colors, fonts, minTouch, radius, space } from '@/theme/tokens';

export default function PracticeSetupScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<TestConfig>(defaultConfig);
  const chosen = config.domains;
  const available = availableCount(starterQuestions, chosen);
  // The test can only be as long as the questions there are for these topics.
  const length = Math.min(config.count, available);

  const toggle = (id: DomainId) => {
    const next = domains.map((d) => d.id).filter((d) => (d === id ? !chosen.includes(d) : chosen.includes(d)));
    setConfig({ ...config, domains: next });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          <Text accessibilityRole="header" style={styles.title}>Practice test</Text>
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>TOPICS</Text>
          {domains.map((d) => {
            const on = chosen.includes(d.id);
            return (
              <Pressable
                key={d.id}
                accessibilityRole="checkbox"
                accessibilityLabel={`${d.name}, ${d.weight}% of the exam`}
                accessibilityState={{ checked: on }}
                onPress={() => toggle(d.id)}
                style={[styles.topic, on && styles.topicOn]}>
                <View style={[styles.box, on && styles.boxOn]}>{on && <Ionicons name="checkmark" size={18} color={colors.white} />}</View>
                <Text style={styles.topicName}>{d.name}</Text>
                <Text style={styles.topicWeight}>{d.weight}% of exam</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>QUESTIONS</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Questions" style={styles.counts}>
            {QUESTION_COUNTS.map((n) => {
              const on = n === config.count;
              return (
                <Pressable
                  key={n}
                  accessibilityRole="radio"
                  accessibilityLabel={`${n} questions`}
                  accessibilityState={{ checked: on }}
                  onPress={() => setConfig({ ...config, count: n })}
                  style={[styles.count, on && styles.countOn]}>
                  <Text style={[styles.countText, on && styles.countTextOn]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.pair}>
          <Segmented
            label="Timer"
            value={config.timed ? 'on' : 'off'}
            options={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }]}
            onChange={(v) => setConfig({ ...config, timed: v === 'on' })}
          />
          <Segmented
            label="Show answers"
            value={config.showAnswers}
            options={[{ value: 'each', label: 'Each' }, { value: 'end', label: 'At end' }]}
            onChange={(v) => setConfig({ ...config, showAnswers: v })}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {length < config.count && chosen.length > 0 && <Text style={styles.notice}>{shortNotice(available)}</Text>}
        <Text accessibilityLiveRegion="polite" style={styles.summary}>
          {setupSummary(length, chosen.length, config.timed ? estimateMinutes(length) : null)}
        </Text>
        <ChunkyButton
          label="Start test"
          disabled={length === 0}
          onPress={() => router.push({ pathname: '/practice/run', params: toParams(config) })}
        />
      </View>
    </SafeAreaView>
  );
}

const EDGE = 4;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.xl, gap: space.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { fontFamily: fonts.black, fontSize: 24, color: colors.ink, flexShrink: 1 },
  group: { gap: space.sm },
  label: { fontFamily: fonts.black, fontSize: 13, color: colors.muted },
  topic: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 2,
    borderBottomWidth: 2 + EDGE,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  topicOn: { borderColor: colors.green, backgroundColor: colors.greenTint },
  box: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { borderColor: colors.green, backgroundColor: colors.green },
  topicName: { flex: 1, fontFamily: fonts.black, fontSize: 16, color: colors.ink },
  topicWeight: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.muted },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  count: {
    flexGrow: 1,
    minWidth: minTouch,
    minHeight: minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderBottomWidth: 2 + EDGE,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  countOn: { borderColor: colors.yellowEdge, backgroundColor: colors.yellow },
  countText: { fontFamily: fonts.black, fontSize: 17, color: colors.muted },
  countTextOn: { color: colors.ink },
  pair: { flexDirection: 'row', gap: space.md },
  footer: { padding: space.xl, paddingTop: space.md, gap: space.sm },
  notice: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.ink, textAlign: 'center' },
  summary: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted, textAlign: 'center' },
});

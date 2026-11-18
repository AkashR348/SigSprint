import { useRouter } from 'expo-router';
import { useState, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChunkyButton } from '@/components/ChunkyButton';
import { IconButton } from '@/components/IconButton';
import { Segmented } from '@/components/Segmented';
import { drugCards } from '@/content/drugCards';
import { flashcardRule, flashcardsLoading, flashcardsNeedSave, readyLine, type Direction } from '@/lib/flashcardText';
import { dayKey } from '@/lib/progress';
import { getProgressState, subscribeProgress } from '@/lib/progressStore';
import { countReady, daysBetween, nextDue, sessionCards } from '@/lib/review';
import { colors, fonts, space } from '@/theme/tokens';

const ids = drugCards.map((c) => c.id);

export default function FlashcardSetupScreen() {
  const router = useRouter();
  const [direction, setDirection] = useState<Direction>('brand');
  const state = useSyncExternalStore(subscribeProgress, getProgressState, getProgressState);

  // Not loaded, can't load, and nothing due are three lines, never one.
  let line = flashcardsLoading;
  let ready = 0;
  if (state.status === 'unavailable') line = flashcardsNeedSave;
  if (state.status === 'ready') {
    const today = dayKey(new Date());
    const { review, fresh } = countReady(ids, state.progress.cards, today);
    const due = nextDue(ids, state.progress.cards, today);
    ready = sessionCards(drugCards, state.progress.cards, today).length;
    line = readyLine(review, fresh, ready, due === null ? null : daysBetween(today, due));
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          <Text accessibilityRole="header" style={styles.title}>Flashcards</Text>
        </View>
        <Text style={styles.body}>
          {drugCards.length} of the top 200 drugs so far. See one name, say the other, then check the card and rate how well you knew it.
        </Text>
        <View style={styles.row}>
          <Segmented
            label="Show me"
            options={[
              { value: 'brand', label: 'Brand name' },
              { value: 'generic', label: 'Generic name' },
            ]}
            value={direction}
            onChange={setDirection}
          />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.summary}>{flashcardRule}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.summary}>{line}</Text>
        <ChunkyButton
          label="Start"
          disabled={ready === 0}
          onPress={() => router.push({ pathname: '/flashcards/run', params: { direction } })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.xl, gap: space.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { fontFamily: fonts.black, fontSize: 24, color: colors.ink, flexShrink: 1 },
  body: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24, color: colors.ink },
  row: { flexDirection: 'row' },
  footer: { padding: space.xl, paddingTop: space.md, gap: space.sm },
  summary: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
});

import { useRouter } from 'expo-router';
import { useState, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChunkyButton } from '@/components/ChunkyButton';
import { IconButton } from '@/components/IconButton';
import { Segmented } from '@/components/Segmented';
import { boxedWarnings } from '@/content/boxedWarnings';
import { drugCards } from '@/content/drugCards';
import {
  deckIntro,
  DECKS,
  DEFAULT_SITTING,
  flashcardRule,
  flashcardsLoading,
  flashcardsNeedSave,
  nameSize,
  readyLine,
  sittingLimit,
  SITTINGS,
  type Deck,
  type Direction,
  type Sitting,
} from '@/lib/flashcardText';
import { dayKey } from '@/lib/progress';
import { getProgressState, subscribeProgress } from '@/lib/progressStore';
import { countReady, daysBetween, nextDue, sessionCards } from '@/lib/review';
import { colors, fonts, minTouch, space } from '@/theme/tokens';

const decks: Record<Deck, readonly { id: string }[]> = { drugs: drugCards, boxed: boxedWarnings };
const TITLE_SIZE = 24;
// Screen padding both sides, the back button and the gap after it.
const TITLE_INSET = space.xl * 2 + minTouch + space.md;

export default function FlashcardSetupScreen() {
  const router = useRouter();
  const [deck, setDeck] = useState<Deck>('drugs');
  const [direction, setDirection] = useState<Direction>('brand');
  const cards = decks[deck];
  const window = useWindowDimensions();
  // The title is one word; it shrinks rather than run off a narrow screen or large text.
  const titleSize = Math.min(TITLE_SIZE, nameSize('Flashcards', window.width - TITLE_INSET, window.fontScale));
  const [size, setSize] = useState<Sitting>(DEFAULT_SITTING);
  const state = useSyncExternalStore(subscribeProgress, getProgressState, getProgressState);

  // Not loaded, can't load, and nothing due are three lines, never one.
  let line = flashcardsLoading;
  let ready = 0;
  if (state.status === 'unavailable') line = flashcardsNeedSave;
  if (state.status === 'ready') {
    const today = dayKey(new Date());
    const ids = cards.map((c) => c.id);
    const { review, fresh } = countReady(ids, state.progress.cards, today);
    const due = nextDue(ids, state.progress.cards, today);
    ready = sessionCards(cards, state.progress.cards, today, sittingLimit(size) ?? 0).length;
    line = readyLine(review, fresh, ready, due === null ? null : daysBetween(today, due));
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          <Text accessibilityRole="header" style={[styles.title, { fontSize: titleSize }]}>Flashcards</Text>
        </View>
        <View style={styles.row}>
          <Segmented label="Deck" options={DECKS} value={deck} onChange={setDeck} />
        </View>
        <Text style={styles.body}>{deckIntro(deck, cards.length)}</Text>
        {deck === 'drugs' && (
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
        )}
        <View style={styles.row}>
          <Segmented label="Cards this sitting" options={SITTINGS} value={size} onChange={setSize} />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.summary}>{flashcardRule}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.summary}>{line}</Text>
        <ChunkyButton
          label="Start"
          disabled={ready === 0}
          onPress={() => router.push({ pathname: '/flashcards/run', params: { deck, direction, size } })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.xl, gap: space.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { fontFamily: fonts.black, fontSize: TITLE_SIZE, color: colors.ink, flexShrink: 1 },
  body: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24, color: colors.ink },
  row: { flexDirection: 'row' },
  footer: { padding: space.xl, paddingTop: space.md, gap: space.sm },
  summary: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
});

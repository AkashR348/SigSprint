import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChunkyButton } from '@/components/ChunkyButton';
import { FlashcardRunner } from '@/components/FlashcardRunner';
import { decks } from '@/lib/flashcardDecks';
import type { Face } from '@/lib/flashcardFace';
import { flashcardsBroken, flashcardsLoading, flashcardsNeedSave, sittingLimit, sittingTitle, toDeck, toDirection } from '@/lib/flashcardText';
import { dayKey } from '@/lib/progress';
import { getProgressState, subscribeProgress } from '@/lib/progressStore';
import { sessionCards } from '@/lib/review';
import { colors, fonts, space } from '@/theme/tokens';

export default function FlashcardRunScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const deck = toDeck(params.deck);
  const limit = sittingLimit(params.size);
  // A deck that asks one way needs no direction, so a missing or odd one is not held against it.
  const asked = toDirection(params.direction);
  const direction = deck !== null && !decks[deck].twoWay ? 'brand' : asked;
  const state = useSyncExternalStore(subscribeProgress, getProgressState, getProgressState);
  const valid = deck !== null && direction !== null && limit !== null;
  // Drawn when the save is first read, and only then, so rating a card never reshuffles the sitting.
  const [cards, setCards] = useState<Face[] | null>(null);
  if (cards === null && valid && state.status === 'ready') {
    setCards(sessionCards(decks[deck].faces(direction), state.progress.cards, dayKey(new Date()), limit));
  }

  // Back to the tab the setup screen was opened from; a screen opened by a link has nothing under it.
  const leave = () => (router.canDismiss() ? router.dismiss(2) : router.replace('/'));
  const waiting = cards === null && valid && state.status === 'loading';
  const trouble = !valid || cards?.length === 0 ? flashcardsBroken : cards === null ? flashcardsNeedSave : null;

  return (
    <SafeAreaView style={styles.screen}>
      {waiting ? (
        <View style={styles.broken}>
          <Text style={styles.text}>{flashcardsLoading}</Text>
        </View>
      ) : trouble !== null || cards === null || !valid ? (
        <View style={styles.broken}>
          <Text accessibilityRole="header" style={styles.text}>{trouble}</Text>
          <ChunkyButton label="Back" onPress={() => router.dismissTo('/flashcards/setup')} />
        </View>
      ) : (
        <FlashcardRunner cards={cards} deckIds={decks[deck].ids} title={sittingTitle(deck, direction)} onLeave={leave} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceSoft },
  broken: { flex: 1, justifyContent: 'center', padding: space.xxl, gap: space.lg },
  text: { fontFamily: fonts.black, fontSize: 18, lineHeight: 26, color: colors.ink, textAlign: 'center' },
});

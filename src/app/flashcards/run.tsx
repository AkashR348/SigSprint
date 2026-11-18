import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChunkyButton } from '@/components/ChunkyButton';
import { FlashcardRunner } from '@/components/FlashcardRunner';
import { drugCards, type DrugCard } from '@/content/drugCards';
import { flashcardsBroken, flashcardsLoading, flashcardsNeedSave, sittingLimit, toDirection } from '@/lib/flashcardText';
import { dayKey } from '@/lib/progress';
import { getProgressState, subscribeProgress } from '@/lib/progressStore';
import { sessionCards } from '@/lib/review';
import { colors, fonts, space } from '@/theme/tokens';

export default function FlashcardRunScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const direction = toDirection(params.direction);
  const limit = sittingLimit(params.size);
  const state = useSyncExternalStore(subscribeProgress, getProgressState, getProgressState);
  // Drawn when the save is first read, and only then, so rating a card never reshuffles the sitting.
  const [cards, setCards] = useState<DrugCard[] | null>(null);
  if (cards === null && limit !== null && state.status === 'ready') {
    setCards(sessionCards(drugCards, state.progress.cards, dayKey(new Date()), limit));
  }

  // Back to the tab the setup screen was opened from; a screen opened by a link has nothing under it.
  const leave = () => (router.canDismiss() ? router.dismiss(2) : router.replace('/'));
  const waiting = cards === null && limit !== null && state.status === 'loading';
  const trouble = direction === null || limit === null || cards?.length === 0 ? flashcardsBroken : cards === null ? flashcardsNeedSave : null;

  return (
    <SafeAreaView style={styles.screen}>
      {waiting ? (
        <View style={styles.broken}>
          <Text style={styles.text}>{flashcardsLoading}</Text>
        </View>
      ) : trouble !== null || cards === null || direction === null ? (
        <View style={styles.broken}>
          <Text accessibilityRole="header" style={styles.text}>{trouble}</Text>
          <ChunkyButton label="Back" onPress={() => router.dismissTo('/flashcards/setup')} />
        </View>
      ) : (
        <FlashcardRunner cards={cards} deck={drugCards} direction={direction} onLeave={leave} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceSoft },
  broken: { flex: 1, justifyContent: 'center', padding: space.xxl, gap: space.lg },
  text: { fontFamily: fonts.black, fontSize: 18, lineHeight: 26, color: colors.ink, textAlign: 'center' },
});

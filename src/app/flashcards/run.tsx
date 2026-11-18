import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChunkyButton } from '@/components/ChunkyButton';
import { FlashcardRunner } from '@/components/FlashcardRunner';
import { drugCards } from '@/content/drugCards';
import { flashcardsBroken, toDirection } from '@/lib/flashcardText';
import { dayKey } from '@/lib/progress';
import { getProgressState } from '@/lib/progressStore';
import { sessionCards } from '@/lib/review';
import { colors, fonts, space } from '@/theme/tokens';

export default function FlashcardRunScreen() {
  const router = useRouter();
  const direction = toDirection(useLocalSearchParams().direction);
  // Drawn once, so rating a card never reshuffles the sitting.
  const [cards] = useState(() => {
    const state = getProgressState();
    return state.status === 'ready' ? sessionCards(drugCards, state.progress.cards, dayKey(new Date())) : [];
  });
  const leave = () => router.dismissTo('/');

  return (
    <SafeAreaView style={styles.screen}>
      {direction === null || cards.length === 0 ? (
        <View style={styles.broken}>
          <Text accessibilityRole="header" style={styles.text}>{flashcardsBroken}</Text>
          <ChunkyButton label="Back" onPress={() => router.dismissTo('/flashcards/setup')} />
        </View>
      ) : (
        <FlashcardRunner cards={cards} direction={direction} onLeave={leave} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceSoft },
  broken: { flex: 1, justifyContent: 'center', padding: space.xxl, gap: space.lg },
  text: { fontFamily: fonts.black, fontSize: 18, lineHeight: 26, color: colors.ink, textAlign: 'center' },
});

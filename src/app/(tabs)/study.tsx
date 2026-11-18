import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModeTile } from '@/components/ModeTile';
import { drugCards } from '@/content/drugCards';
import { deckLabel } from '@/lib/flashcardText';
import { colors, fonts, space } from '@/theme/tokens';

export default function StudyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>Study</Text>
        <View style={styles.row}>
          <ModeTile
            title="Practice test"
            detail="Pick topics and length"
            icon="document-text"
            iconColor={colors.green}
            onPress={() => router.push('/practice/setup')}
          />
          <ModeTile
            title="Flashcards"
            detail={deckLabel(drugCards.length)}
            icon="albums"
            iconColor={colors.amber}
            onPress={() => router.push('/flashcards/setup')}
          />
        </View>
        <Text style={styles.detail}>The mock exam is being built next.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.xl, gap: space.lg },
  title: { fontFamily: fonts.black, fontSize: 26, color: colors.ink },
  row: { flexDirection: 'row', gap: space.md },
  detail: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24, color: colors.muted },
});

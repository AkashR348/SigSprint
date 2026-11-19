import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModeTile } from '@/components/ModeTile';
import { mockExam } from '@/content/domains';
import { flashcardsTile } from '@/lib/flashcardText';
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
            detail={flashcardsTile}
            icon="albums"
            iconColor={colors.amber}
            onPress={() => router.push('/flashcards/setup')}
          />
        </View>
        <View style={styles.row}>
          <ModeTile
            title="Mock exam"
            detail={`${mockExam.questions} questions in ${mockExam.minutes} minutes, or half`}
            icon="timer"
            iconColor={colors.blue}
            onPress={() => router.push('/mock/setup')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.xl, gap: space.lg },
  title: { fontFamily: fonts.black, fontSize: 26, color: colors.ink },
  row: { flexDirection: 'row', gap: space.md },
});

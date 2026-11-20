import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { SourceLink } from '@/components/SourceLink';
import type { Question } from '@/content/questions';
import { pointsLabel, pointsSpoken } from '@/lib/practiceText';
import { colors, fonts, radius, space } from '@/theme/tokens';

// `given` is the stored position chosen, or null when not answered. `change` of 0 draws no points.
type Props = { number: number; question: Question; given: number | null; change?: number };

/** One question on a results screen: the verdict, both answers, why, and the source. */
export function QuestionReview({ number, question: q, given, change = 0 }: Props) {
  const right = given === q.answer;
  return (
    <View style={styles.review}>
      <View style={styles.verdict}>
        <Ionicons
          name={right ? 'checkmark-circle' : given === null ? 'remove-circle' : 'close-circle'}
          size={20}
          color={right ? colors.green : given === null ? colors.muted : colors.red}
        />
        <Text style={styles.verdictText}>
          {number}. {right ? 'Correct' : given === null ? 'Not answered' : 'Incorrect'}
        </Text>
        {change !== 0 && (
          <Text accessibilityLabel={pointsSpoken(change)} style={styles.xp}>
            {pointsLabel(change)}
          </Text>
        )}
      </View>
      <Text style={styles.stem}>{q.stem}</Text>
      {given !== null && !right && <Text style={styles.body}>Your answer: {q.choices[given]}</Text>}
      <Text style={styles.body}>Correct answer: {q.choices[q.answer]}</Text>
      <Text style={styles.body}>{q.explanation}</Text>
      <SourceLink source={q.source} />
    </View>
  );
}

const styles = StyleSheet.create({
  review: { gap: space.sm, borderWidth: 2, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  verdictText: { flex: 1, fontFamily: fonts.black, fontSize: 15, color: colors.ink },
  xp: {
    fontFamily: fonts.black,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.yellow,
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
  },
  stem: { fontFamily: fonts.black, fontSize: 16, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.ink },
});

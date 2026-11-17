import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/ChunkyButton';
import { SourceLink } from '@/components/SourceLink';
import { domains } from '@/content/domains';
import type { Question } from '@/content/questions';
import { scoreTest, type Answers } from '@/lib/practice';
import { scoreLine, unsavedNotice } from '@/lib/practiceText';
import { colors, fonts, radius, space } from '@/theme/tokens';

type Props = {
  questions: readonly Question[];
  answers: Answers;
  // Answers that could not be written to progress; never folded into the score.
  unsaved: number;
  timedOut: boolean;
  onNewTest: () => void;
  onDone: () => void;
};

const nameOf = (id: string) => domains.find((d) => d.id === id)?.name ?? id;

export function PracticeResults({ questions, answers, unsaved, timedOut, onNewTest, onDone }: Props) {
  const result = scoreTest(questions, answers);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>{timedOut ? "Time's up" : 'Test complete'}</Text>

      <View accessible style={styles.score}>
        {result.percent !== null && <Text style={styles.percent}>{result.percent}%</Text>}
        <Text style={styles.scoreLine}>{scoreLine(result.correct, result.total)}</Text>
        {result.unanswered > 0 && <Text style={styles.scoreNote}>{result.unanswered} not answered</Text>}
      </View>

      {unsaved > 0 && <Text style={styles.notice}>{unsavedNotice(unsaved)}</Text>}

      <View style={styles.group}>
        <Text accessibilityRole="header" style={styles.label}>BY TOPIC</Text>
        {result.byDomain.map((row) => (
          <View key={row.id} accessible style={styles.row}>
            <Text style={styles.rowName}>{nameOf(row.id)}</Text>
            <Text style={styles.rowScore}>{row.correct} of {row.total}</Text>
          </View>
        ))}
      </View>

      <ChunkyButton label="New test" onPress={onNewTest} />
      <ChunkyButton tone="plain" label="Done" onPress={onDone} />

      <View style={styles.group}>
        <Text accessibilityRole="header" style={styles.label}>REVIEW</Text>
        {questions.map((q, i) => {
          const given = answers[i] ?? null;
          const right = given === q.answer;
          return (
            <View key={q.id} style={styles.review}>
              <View style={styles.verdict}>
                <Ionicons
                  name={right ? 'checkmark-circle' : given === null ? 'remove-circle' : 'close-circle'}
                  size={20}
                  color={right ? colors.green : given === null ? colors.muted : colors.red}
                />
                <Text style={styles.verdictText}>
                  {i + 1}. {right ? 'Correct' : given === null ? 'Not answered' : 'Incorrect'}
                </Text>
              </View>
              <Text style={styles.stem}>{q.stem}</Text>
              {given !== null && !right && <Text style={styles.body}>Your answer: {q.choices[given]}</Text>}
              <Text style={styles.body}>Correct answer: {q.choices[q.answer]}</Text>
              <Text style={styles.body}>{q.explanation}</Text>
              <SourceLink source={q.source} />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg },
  title: { fontFamily: fonts.black, fontSize: 26, color: colors.ink },
  score: { alignItems: 'center', gap: space.xs, backgroundColor: colors.greenTint, borderRadius: radius.xl, padding: space.xl },
  percent: { fontFamily: fonts.black, fontSize: 44, color: colors.greenOnTint },
  scoreLine: { fontFamily: fonts.black, fontSize: 18, color: colors.greenOnTint },
  scoreNote: { fontFamily: fonts.bold, fontSize: 15, color: colors.greenOnTint },
  notice: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.yellowOnTint,
    backgroundColor: colors.yellowTint,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  group: { gap: space.sm },
  label: { fontFamily: fonts.black, fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: space.sm, borderBottomWidth: 2, borderBottomColor: colors.border },
  rowName: { flex: 1, fontFamily: fonts.extraBold, fontSize: 15, color: colors.ink },
  rowScore: { fontFamily: fonts.black, fontSize: 15, color: colors.ink },
  review: { gap: space.sm, borderWidth: 2, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  verdictText: { fontFamily: fonts.black, fontSize: 15, color: colors.ink },
  stem: { fontFamily: fonts.black, fontSize: 16, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.ink },
});

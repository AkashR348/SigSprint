import { Ionicons } from '@expo/vector-icons';
import { type ComponentRef, useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/ChunkyButton';
import { SourceLink } from '@/components/SourceLink';
import { domainName } from '@/content/domains';
import type { Question } from '@/content/questions';
import { scoreTest, type Answers } from '@/lib/practice';
import { pointsLabel, pointsSpoken, pointsSummary, savingNotice, scoreLine, unsavedNotice } from '@/lib/practiceText';
import { useAnnounce } from '@/lib/useAnnounce';
import { colors, fonts, radius, space } from '@/theme/tokens';

type Props = {
  questions: readonly Question[];
  answers: Answers;
  // By question number: the points each saved answer really moved the total by.
  points: Readonly<Record<number, number>>;
  // Answers that could not be written to progress; never folded into the score.
  unsaved: number;
  // An answer is still being written; it is not yet known to be saved.
  saving: boolean;
  timedOut: boolean;
  onNewTest: () => void;
  onDone: () => void;
};

export function PracticeResults({ questions, answers, points, unsaved, saving, timedOut, onNewTest, onDone }: Props) {
  const result = scoreTest(questions, answers);
  const heading = timedOut ? "Time's up" : 'Test complete';
  const opening = `${heading}. ${scoreLine(result.correct, result.total)}.`;
  const title = useRef<ComponentRef<typeof Text>>(null);
  const changes = Object.values(points);
  // No line until every save has settled, and none when nothing was saved.
  const net = saving || changes.length === 0 ? null : changes.reduce((sum, n) => sum + n, 0);
  const status = saving ? savingNotice : unsaved > 0 ? unsavedNotice(unsaved) : null;

  // The results replace the question that had focus, sometimes with no tap at all.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(opening);
    if (Platform.OS !== 'web' && title.current) AccessibilityInfo.sendAccessibilityEvent(title.current, 'focus');
  }, [opening]);
  useAnnounce(status);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text ref={title} accessibilityRole="header" style={styles.title}>
        {heading}
      </Text>

      <View accessible style={styles.score}>
        {result.percent !== null && <Text style={styles.percent}>{result.percent}%</Text>}
        <Text style={styles.scoreLine}>{scoreLine(result.correct, result.total)}</Text>
        {result.unanswered > 0 && <Text style={styles.scoreNote}>{result.unanswered} not answered</Text>}
        {net !== null && <Text style={styles.scoreNote}>{pointsSummary(net)}</Text>}
      </View>

      {status !== null && (
        <Text accessibilityLiveRegion="polite" style={styles.notice}>
          {status}
        </Text>
      )}

      <View style={styles.group}>
        <Text accessibilityRole="header" style={styles.label}>BY TOPIC</Text>
        {result.byDomain.map((row) => (
          <View key={row.id} accessible style={styles.row}>
            <Text style={styles.rowName}>{domainName(row.id)}</Text>
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
          const change = points[i] ?? 0;
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

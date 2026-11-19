import { type ComponentRef, useEffect, useRef } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/ChunkyButton';
import { QuestionReview } from '@/components/QuestionReview';
import { domainName } from '@/content/domains';
import type { Question } from '@/content/questions';
import { focusOn } from '@/lib/focusOn';
import { estimateScore, type Outcome } from '@/lib/mockExam';
import { durationLabel, durationSpoken, estimateCaveat, estimateTitle, estimateVerdict, resultSaving, resultUnsaved, scoreLabel } from '@/lib/mockText';
import type { Answers } from '@/lib/practice';
import { pointsSummary, scoreLine } from '@/lib/practiceText';
import { useAnnounce } from '@/lib/useAnnounce';
import { colors, fonts, radius, space } from '@/theme/tokens';

// Once saved, the points the total really moved by: a loss stops at a total of 0.
export type ResultSave = 'saving' | 'failed' | { change: number };

type Props = {
  questions: readonly Question[];
  answers: Answers;
  outcome: Outcome;
  save: ResultSave;
  onRetry: () => void;
  onNewExam: () => void;
  onDone: () => void;
};

/** A finished mock exam: the score, the labelled estimate, each topic, and every question with its answer. */
export function MockExamResults({ questions, answers, outcome, save, onRetry, onNewExam, onDone }: Props) {
  const { result, record } = outcome;
  const heading = record.timedOut ? "Time's up" : 'Exam complete';
  const estimate = estimateScore(result.correct, result.total);
  const opening = `${heading}. ${scoreLine(result.correct, result.total)}.`;
  const title = useRef<ComponentRef<typeof Text>>(null);
  const status = save === 'saving' ? resultSaving : save === 'failed' ? resultUnsaved : null;

  // The results replace the question that had focus, sometimes with no tap at all.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(opening);
    focusOn(title.current);
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
        {result.unanswered > 0 && <Text style={styles.scoreNote}>{result.unanswered} not answered, counted as wrong</Text>}
        <Text accessibilityLabel={`Time used, ${durationSpoken(record.seconds)}`} style={styles.scoreNote}>
          Time used: {durationLabel(record.seconds)}
        </Text>
        {/* Points show only once the result is on the phone. */}
        {typeof save === 'object' && <Text style={styles.scoreNote}>{pointsSummary(save.change)}</Text>}
      </View>

      {estimate !== null && (
        <View
          accessible
          accessibilityLabel={`${estimateTitle}, ${estimate}. ${estimateVerdict(estimate)} ${estimateCaveat}`}
          style={styles.estimate}>
          <Text style={styles.estimateLabel}>{estimateTitle.toUpperCase()}</Text>
          <Text style={styles.estimateScore}>{scoreLabel(estimate)}</Text>
          <Text style={styles.estimateText}>{estimateVerdict(estimate)}</Text>
          <Text style={styles.estimateText}>{estimateCaveat}</Text>
        </View>
      )}

      {status !== null && (
        <View style={styles.notice}>
          <Text accessibilityLiveRegion="polite" style={styles.noticeText}>
            {status}
          </Text>
          {save === 'failed' && <ChunkyButton label="Try saving again" onPress={onRetry} />}
        </View>
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

      <ChunkyButton label="New exam" onPress={onNewExam} />
      <ChunkyButton tone="plain" label="Done" onPress={onDone} />

      {/* Answers show only once the result is saved: an unsaved exam can still be continued. */}
      {typeof save === 'object' && (
        <View style={styles.group}>
          <Text accessibilityRole="header" style={styles.label}>REVIEW</Text>
          {questions.map((q, i) => (
            <QuestionReview key={q.id} number={i + 1} question={q} given={answers[i] ?? null} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, gap: space.lg },
  title: { fontFamily: fonts.black, fontSize: 26, color: colors.ink },
  score: { alignItems: 'center', gap: space.xs, backgroundColor: colors.greenTint, borderRadius: radius.xl, padding: space.xl },
  percent: { fontFamily: fonts.black, fontSize: 44, color: colors.greenOnTint },
  scoreLine: { fontFamily: fonts.black, fontSize: 18, color: colors.greenOnTint },
  scoreNote: { fontFamily: fonts.bold, fontSize: 15, color: colors.greenOnTint, textAlign: 'center' },
  estimate: { gap: space.xs, backgroundColor: colors.blueTint, borderRadius: radius.xl, padding: space.xl },
  estimateLabel: { fontFamily: fonts.black, fontSize: 13, color: colors.blueOnTint },
  estimateScore: { fontFamily: fonts.black, fontSize: 32, color: colors.blueOnTint },
  estimateText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.blueOnTint },
  notice: { gap: space.md, backgroundColor: colors.yellowTint, borderRadius: radius.lg, padding: space.lg },
  noticeText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.yellowOnTint },
  group: { gap: space.sm },
  label: { fontFamily: fonts.black, fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: space.sm, borderBottomWidth: 2, borderBottomColor: colors.border },
  rowName: { flex: 1, fontFamily: fonts.extraBold, fontSize: 15, color: colors.ink },
  rowScore: { fontFamily: fonts.black, fontSize: 15, color: colors.ink },
});

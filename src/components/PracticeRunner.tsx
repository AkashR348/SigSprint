import { Ionicons } from '@expo/vector-icons';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/ChunkyButton';
import { IconButton } from '@/components/IconButton';
import { PracticeResults } from '@/components/PracticeResults';
import { SourceLink } from '@/components/SourceLink';
import { domains } from '@/content/domains';
import type { Question } from '@/content/questions';
import { timeLimitSeconds, XP_PER_CORRECT, xpFor, type TestConfig } from '@/lib/practice';
import { clock, clockSpoken, finish, next, pick, startRun, submit } from '@/lib/practiceRun';
import { dayKey, recordAnswer } from '@/lib/progress';
import { updateProgress } from '@/lib/progressStore';
import { colors, fonts, radius, space } from '@/theme/tokens';

type Props = {
  questions: readonly Question[];
  config: Pick<TestConfig, 'timed' | 'showAnswers'>;
  onLeave: () => void;
  onNewTest: () => void;
};

type Saved = 'saving' | 'saved' | 'failed';
const LETTERS = ['A', 'B', 'C', 'D'];

/** Runs one practice test from the first question to the results. */
export function PracticeRunner({ questions, config, onLeave, onNewTest }: Props) {
  const [run, setRun] = useState(() => startRun(questions, config.showAnswers));
  // Whether each locked answer reached the phone, by question number.
  const [saves, setSaves] = useState<Record<number, Saved>>({});
  const [leaving, setLeaving] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const limit = timeLimitSeconds(questions.length);
  const [left, setLeft] = useState(limit);
  const verdict = useRef<ComponentRef<typeof Text>>(null);
  const stem = useRef<ComponentRef<typeof Text>>(null);

  const timing = config.timed && !run.done;
  // Counted from a fixed end time, so time in the background still passes.
  useEffect(() => {
    if (!timing) return;
    const end = Date.now() + limit * 1000;
    const tick = () => {
      const seconds = (end - Date.now()) / 1000;
      setLeft(seconds);
      if (seconds <= 0) {
        setTimedOut(true);
        setRun(finish);
      }
    };
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [timing, limit]);

  const lastMinute = timing && left <= 60;
  useEffect(() => {
    if (lastMinute) AccessibilityInfo.announceForAccessibility('One minute left.');
  }, [lastMinute]);

  const question = run.questions[run.index];
  const given = run.answers[run.index] ?? null;
  const right = run.revealed && given === question?.answer;
  const said = !run.revealed || !question ? null : right ? 'Correct!' : `Not quite. The answer is ${question.choices[question.answer]}.`;

  // The answer appears below what was tapped, so say it and move a screen reader to it.
  useEffect(() => {
    if (said === null) return;
    AccessibilityInfo.announceForAccessibility(said);
    if (Platform.OS !== 'web' && verdict.current) AccessibilityInfo.sendAccessibilityEvent(verdict.current, 'focus');
  }, [said]);

  const index = run.index;
  // A new question replaces the one that had focus.
  useEffect(() => {
    if (index > 0 && Platform.OS !== 'web' && stem.current) AccessibilityInfo.sendAccessibilityEvent(stem.current, 'focus');
  }, [index]);

  if (run.done || !question) {
    return (
      <PracticeResults
        questions={run.questions}
        answers={run.answers}
        unsaved={Object.values(saves).filter((s) => s === 'failed').length}
        timedOut={timedOut}
        onNewTest={onNewTest}
        onDone={onLeave}
      />
    );
  }

  const lock = () => {
    const after = submit(run);
    if (after === run || run.picked === null) return;
    const at = run.index;
    const xp = xpFor(question, run.picked);
    setRun(after);
    setSaves((s) => ({ ...s, [at]: 'saving' }));
    // Every locked answer counts toward today, right or wrong.
    void updateProgress((p) => recordAnswer(p, dayKey(new Date()), xp)).then((ok) => {
      setSaves((s) => ({ ...s, [at]: ok ? 'saved' : 'failed' }));
    });
  };

  const total = run.questions.length;
  const isLast = run.index === total - 1;
  const domain = domains.find((d) => d.id === question.domain)?.name ?? '';
  const saved = saves[run.index];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="close" label="Close practice test" onPress={() => setLeaving(true)} />
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={`Question ${run.index + 1} of ${total}`}
            accessibilityValue={{ min: 0, max: total, now: run.index + 1 }}
            style={styles.track}>
            <View style={[styles.fill, { width: `${((run.index + 1) / total) * 100}%` }]} />
          </View>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.count}>
            {run.index + 1} of {total}
          </Text>
        </View>

        <View style={styles.chips}>
          <Text style={styles.chip}>{domain}</Text>
          {config.timed && (
            <Text accessibilityLabel={clockSpoken(left)} style={[styles.chip, styles.clock]}>
              {clock(left)}
            </Text>
          )}
        </View>

        <Text ref={stem} accessibilityRole="header" style={styles.stem}>
          {question.stem}
        </Text>

        <View accessibilityRole="radiogroup" style={styles.choices}>
          {question.choices.map((choice, i) => {
            const isAnswer = run.revealed && i === question.answer;
            const isWrong = run.revealed && i === given && i !== question.answer;
            const on = run.revealed ? i === given : i === run.picked;
            const mark = isAnswer ? ', correct answer' : isWrong ? ', your answer, incorrect' : '';
            return (
              <Pressable
                key={choice}
                accessibilityRole="radio"
                accessibilityLabel={`${LETTERS[i]}. ${choice}${mark}`}
                accessibilityState={{ checked: on, disabled: run.revealed }}
                disabled={run.revealed}
                onPress={() => setRun(pick(run, i))}
                style={[styles.choice, on && styles.choiceOn, isAnswer && styles.choiceRight, isWrong && styles.choiceWrong]}>
                <View style={[styles.letter, (on || isAnswer) && styles.letterOn, isWrong && styles.letterWrong]}>
                  {isAnswer || isWrong ? (
                    <Ionicons name={isAnswer ? 'checkmark' : 'close'} size={18} color={colors.white} />
                  ) : (
                    <Text style={[styles.letterText, on && styles.letterTextOn]}>{LETTERS[i]}</Text>
                  )}
                </View>
                <Text style={styles.choiceText}>{choice}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {leaving ? (
        <View style={styles.footer}>
          <Text accessibilityRole="header" style={styles.leaveTitle}>Leave this test?</Text>
          <Text style={styles.body}>The questions you have answered still count toward today.</Text>
          <ChunkyButton label="Keep going" onPress={() => setLeaving(false)} />
          <ChunkyButton tone="plain" label="Leave" onPress={onLeave} />
        </View>
      ) : run.revealed ? (
        <View style={[styles.footer, right ? styles.sheetRight : styles.sheetWrong]}>
          <View style={styles.sheetTop}>
            <Text ref={verdict} accessibilityRole="header" style={styles.verdict}>
              {right ? 'Correct!' : 'Not quite'}
            </Text>
            {/* Points show only once the answer is on the phone. */}
            {right && saved === 'saved' && <Text style={styles.xp}>+{XP_PER_CORRECT} XP</Text>}
          </View>
          {!right && <Text style={styles.body}>The answer is {question.choices[question.answer]}.</Text>}
          <Text style={styles.body}>{question.explanation}</Text>
          {saved === 'failed' && <Text style={styles.body}>{"This answer couldn't be saved on this phone."}</Text>}
          <SourceLink source={question.source} />
          <ChunkyButton label={isLast ? 'See results' : 'Continue'} onPress={() => setRun(next(run))} />
        </View>
      ) : (
        <View style={styles.footer}>
          <ChunkyButton
            label={config.showAnswers === 'each' ? 'Check' : isLast ? 'Finish' : 'Next'}
            disabled={run.picked === null}
            onPress={lock}
          />
        </View>
      )}
    </View>
  );
}

const EDGE = 4;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.xl, gap: space.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  track: { flex: 1, height: 14, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 14, borderRadius: radius.pill, backgroundColor: colors.green },
  count: { fontFamily: fonts.black, fontSize: 15, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: space.sm },
  chip: {
    fontFamily: fonts.black,
    fontSize: 13,
    color: colors.blueOnTint,
    backgroundColor: colors.blueTint,
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingVertical: 6,
    paddingHorizontal: space.md,
  },
  clock: { color: colors.yellowOnTint, backgroundColor: colors.yellowTint, fontVariant: ['tabular-nums'] },
  stem: { fontFamily: fonts.black, fontSize: 22, lineHeight: 30, color: colors.ink },
  choices: { gap: space.md },
  choice: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 2,
    borderBottomWidth: 2 + EDGE,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  choiceOn: { borderColor: colors.green, backgroundColor: colors.greenTint },
  choiceRight: { borderColor: colors.green, backgroundColor: colors.greenTint },
  choiceWrong: { borderColor: colors.red, backgroundColor: colors.redTint },
  letter: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  letterOn: { backgroundColor: colors.green },
  letterWrong: { backgroundColor: colors.red },
  letterText: { fontFamily: fonts.black, fontSize: 14, color: colors.muted },
  letterTextOn: { color: colors.white },
  choiceText: { flex: 1, fontFamily: fonts.extraBold, fontSize: 17, lineHeight: 23, color: colors.ink },
  footer: { padding: space.xl, paddingTop: space.lg, gap: space.md, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  sheetRight: { backgroundColor: colors.greenTint },
  sheetWrong: { backgroundColor: colors.redTint },
  sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  verdict: { fontFamily: fonts.black, fontSize: 20, color: colors.ink },
  xp: {
    fontFamily: fonts.black,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.yellow,
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingVertical: 4,
    paddingHorizontal: space.md,
  },
  leaveTitle: { fontFamily: fonts.black, fontSize: 20, color: colors.ink },
  body: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.ink },
});

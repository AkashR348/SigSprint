import { Ionicons } from '@expo/vector-icons';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/ChunkyButton';
import { IconButton } from '@/components/IconButton';
import { PracticeResults } from '@/components/PracticeResults';
import { SourceLink } from '@/components/SourceLink';
import { domainName } from '@/content/domains';
import type { Question } from '@/content/questions';
import { timeLimitSeconds, XP_PER_CORRECT, xpFor, type TestConfig } from '@/lib/practice';
import { answerUnsaved, leaveNotice } from '@/lib/practiceText';
import { clock, clockSpoken, finish, next, pick, startRun, submit } from '@/lib/practiceRun';
import { dayKey, recordAnswer } from '@/lib/progress';
import { updateProgress } from '@/lib/progressStore';
import { useAnnounce } from '@/lib/useAnnounce';
import { colors, edge as edges, fonts, radius, space } from '@/theme/tokens';

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
  // When the timer ends, in ms; null while there is none.
  const endsAt = useRef<number | null>(null);
  // Questions already sent to progress, so a double tap cannot count one answer twice.
  const recorded = useRef(new Set<number>());
  const verdict = useRef<ComponentRef<typeof Text>>(null);
  const stem = useRef<ComponentRef<typeof Text>>(null);
  const leaveTitle = useRef<ComponentRef<typeof Text>>(null);

  const timing = config.timed && !run.done;
  // Counted from a fixed end time, so time in the background still passes.
  useEffect(() => {
    if (!timing) return;
    const end = Date.now() + limit * 1000;
    endsAt.current = end;
    const tick = () => {
      // Whole seconds, so the screen redraws once a second and not on every tick.
      const seconds = Math.ceil((end - Date.now()) / 1000);
      setLeft(seconds);
      if (seconds <= 0) {
        setTimedOut(true);
        setRun(finish);
      }
    };
    const timer = setInterval(tick, 500);
    return () => {
      clearInterval(timer);
      endsAt.current = null;
    };
  }, [timing, limit]);

  const active = !run.done;
  // Android's back button asks before leaving, like the close button.
  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setLeaving(true);
      return true;
    });
    return () => sub.remove();
  }, [active]);

  // The question replaces the button that was tapped, so say it and move a screen reader to it.
  useEffect(() => {
    if (!leaving) return;
    AccessibilityInfo.announceForAccessibility('Leave this test?');
    if (Platform.OS !== 'web' && leaveTitle.current) AccessibilityInfo.sendAccessibilityEvent(leaveTitle.current, 'focus');
  }, [leaving]);

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

  const unsaved = Object.values(saves).filter((s) => s === 'failed').length;
  const saving = Object.values(saves).some((s) => s === 'saving');
  const thisFailed = run.revealed && saves[run.index] === 'failed';
  useAnnounce(thisFailed ? answerUnsaved : null);

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
        unsaved={unsaved}
        saving={saving}
        timedOut={timedOut}
        onNewTest={onNewTest}
        onDone={onLeave}
      />
    );
  }

  const lock = () => {
    // The clock ticks twice a second; an answer between the end and the next tick is too late.
    if (endsAt.current !== null && Date.now() >= endsAt.current) {
      setTimedOut(true);
      setRun(finish);
      return;
    }
    const after = submit(run);
    const at = run.index;
    if (after === run || run.picked === null || recorded.current.has(at)) return;
    recorded.current.add(at);
    const xp = xpFor(question, run.picked);
    // The day it was answered, even if the save lands after midnight.
    const day = dayKey(new Date());
    setRun(after);
    setSaves((s) => ({ ...s, [at]: 'saving' }));
    // Every locked answer counts toward today, right or wrong.
    void updateProgress((p) => recordAnswer(p, day, xp)).then((ok) => {
      setSaves((s) => ({ ...s, [at]: ok ? 'saved' : 'failed' }));
    });
  };

  const total = run.questions.length;
  const isLast = run.index === total - 1;
  const domain = domainName(question.domain);
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
          <Text ref={leaveTitle} accessibilityRole="header" style={styles.leaveTitle}>
            Leave this test?
          </Text>
          <Text style={styles.body}>{leaveNotice(unsaved, saving)}</Text>
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
          {saved === 'failed' && (
            <Text accessibilityLiveRegion="polite" style={styles.body}>
              {answerUnsaved}
            </Text>
          )}
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

const EDGE = edges.tile;

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
    paddingVertical: space.sm,
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
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
  },
  leaveTitle: { fontFamily: fonts.black, fontSize: 20, color: colors.ink },
  body: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.ink },
});

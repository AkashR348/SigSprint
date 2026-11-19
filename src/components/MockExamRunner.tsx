import { Ionicons } from '@expo/vector-icons';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/ChunkyButton';
import { IconButton } from '@/components/IconButton';
import { MockExamResults, type ResultSave } from '@/components/MockExamResults';
import { MockOverview } from '@/components/MockOverview';
import type { Question } from '@/content/questions';
import { createExamTimer } from '@/lib/examTimer';
import { focusOn } from '@/lib/focusOn';
import {
  answerCurrent,
  choiceOrder,
  concludeExam,
  finishExam,
  goTo,
  keepClock,
  keepExam,
  quitExam,
  toggleFlag,
  WARNING_SECONDS,
  type Outcome,
} from '@/lib/mockExam';
import type { SavedExam } from '@/lib/mockSave';
import { examClock, examClockSpoken, leaveBody, progressUnsaved, warningNotice } from '@/lib/mockText';
import { dayKey } from '@/lib/progress';
import { updateProgress } from '@/lib/progressStore';
import { useAnnounce } from '@/lib/useAnnounce';
import { colors, edge as edges, fonts, minTouch, radius, space } from '@/theme/tokens';

type Props = {
  // The exam as saved when the screen opened, and its questions in the exam's order.
  saved: SavedExam;
  questions: readonly Question[];
  onLeave: () => void;
  onNewExam: () => void;
};

type Session = { exam: SavedExam; outcome: Outcome | null };
type Showing = 'question' | 'overview';
const LETTERS = ['A', 'B', 'C', 'D'];

/** Runs one mock exam from where it was saved to its results. */
export function MockExamRunner({ saved, questions, onLeave, onNewExam }: Props) {
  const relaxed = saved.mode === 'relaxed';
  const [session, setSession] = useState<Session>({ exam: saved, outcome: null });
  const [view, setView] = useState<Showing>('question');
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // Seconds left; null until the clock's first tick.
  const [left, setLeft] = useState<number | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [resultSave, setResultSave] = useState<ResultSave>('saving');
  const [attempt, setAttempt] = useState(0);
  const [timer] = useState(() => createExamTimer(saved.mode, saved.clock));
  const stem = useRef<ComponentRef<typeof Text>>(null);
  const leaveTitle = useRef<ComponentRef<typeof Text>>(null);
  const pausedTitle = useRef<ComponentRef<typeof Text>>(null);

  const { exam, outcome } = session;
  const running = outcome === null && !paused;

  // Read from the timer's own end time, so a strict exam's time in the background still passes.
  useEffect(() => {
    if (!running) return;
    timer.start();
    const tick = () => {
      if (!timer.running()) return;
      const ms = timer.msLeft();
      const now = timer.now();
      setLeft(Math.ceil(ms / 1000));
      if (ms <= 0) setSession((s) => (s.outcome ? s : { ...s, outcome: concludeExam(s.exam, questions, 0, true, now) }));
    };
    const first = setTimeout(tick, 0);
    const every = setInterval(tick, 500);
    return () => {
      clearTimeout(first);
      clearInterval(every);
      timer.stop();
    };
  }, [running, timer, questions]);

  // A relaxed exam stops its clock the moment the app is left, and comes back paused.
  useEffect(() => {
    if (!relaxed || outcome !== null) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' || !timer.running()) return;
      timer.stop();
      const ms = timer.msLeft();
      setPaused(true);
      void updateProgress((p) => keepClock(p, ms));
    });
    return () => sub.remove();
  }, [relaxed, outcome, timer]);

  // The result is written once: points, the day's count and the history row together.
  useEffect(() => {
    if (outcome === null) return;
    let change = 0;
    let live = true;
    void updateProgress((p) => {
      const after = finishExam(p, outcome, dayKey(new Date(outcome.record.at)));
      if (after) change = after.xp - p.xp;
      return after;
    }).then((ok) => {
      if (live) setResultSave(ok ? { change } : 'failed');
    });
    return () => {
      live = false;
    };
  }, [outcome, attempt]);

  const active = outcome === null;
  // Android's back button asks before leaving, like the close button.
  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setLeaving(true);
      return true;
    });
    return () => sub.remove();
  }, [active]);

  useEffect(() => {
    if (!leaving) return;
    AccessibilityInfo.announceForAccessibility('Leave this exam?');
    focusOn(leaveTitle.current);
  }, [leaving]);

  useEffect(() => {
    if (!paused) return;
    AccessibilityInfo.announceForAccessibility('Paused. The clock is stopped.');
    focusOn(pausedTitle.current);
  }, [paused]);

  const warned = active && left !== null && left <= WARNING_SECONDS;
  useAnnounce(warned ? warningNotice : null);
  useAnnounce(unsaved && active ? progressUnsaved : null);

  const index = exam.index;
  const onQuestion = active && view === 'question' && !paused;
  // A new question replaces the one that had focus.
  useEffect(() => {
    if (onQuestion && index > 0) focusOn(stem.current);
  }, [index, onQuestion]);

  if (outcome !== null) {
    return (
      <MockExamResults
        questions={questions}
        answers={exam.answers}
        outcome={outcome}
        save={resultSave}
        onRetry={() => {
          setResultSave('saving');
          setAttempt((n) => n + 1);
        }}
        onNewExam={onNewExam}
        onDone={onLeave}
      />
    );
  }
  const question = questions[index];
  // Nothing is drawn until the clock has been read once, so an exam that ran out never shows a question.
  if (left === null || !question) return <View style={styles.screen} />;

  // Every change goes to the phone at once, with the relaxed clock as it stands.
  const apply = (next: SavedExam) => {
    if (next === exam) return;
    setSession({ exam: next, outcome: null });
    const toSave = relaxed ? { ...next, clock: Math.floor(timer.msLeft()) } : next;
    void updateProgress((p) => keepExam(p, toSave)).then((ok) => setUnsaved(!ok));
  };
  const submit = () => {
    const now = timer.now();
    const ms = timer.msLeft();
    // The clock ticks twice a second; a submit after the end is a time out.
    setSession((s) => (s.outcome ? s : { ...s, outcome: concludeExam(s.exam, questions, ms, ms <= 0, now) }));
  };
  const pause = () => {
    timer.stop();
    const ms = timer.msLeft();
    setPaused(true);
    void updateProgress((p) => keepClock(p, ms));
  };
  const leaveForNow = () => {
    timer.stop();
    const ms = timer.msLeft();
    if (relaxed) void updateProgress((p) => keepClock(p, ms));
    onLeave();
  };
  const quit = () => {
    void updateProgress((p) => (p.exam ? quitExam(p) : null));
    onLeave();
  };

  const total = questions.length;
  const given = exam.answers[index] ?? null;
  const flagged = exam.flagged.includes(index);
  const isLast = index === total - 1;

  if (paused) {
    return (
      <View style={styles.center}>
        <Text ref={pausedTitle} accessibilityRole="header" style={styles.pausedTitle}>
          Paused
        </Text>
        <Text style={[styles.body, styles.centered]}>The clock is stopped and the question is hidden.</Text>
        <Text accessibilityLabel={examClockSpoken(left)} style={styles.pausedClock}>
          {examClock(left)}
        </Text>
        <ChunkyButton label="Resume" onPress={() => setPaused(false)} />
        <ChunkyButton tone="plain" label="Leave and come back later" onPress={leaveForNow} />
      </View>
    );
  }

  const clockRow = (
    <View style={styles.chips}>
      <Text accessibilityLabel={examClockSpoken(left)} style={[styles.chip, warned && styles.chipWarned]}>
        {examClock(left)}
      </Text>
      {relaxed && (
        <Pressable accessibilityRole="button" accessibilityLabel="Pause" onPress={pause} style={styles.tool}>
          <Ionicons name="pause" size={18} color={colors.ink} />
          <Text style={styles.toolText}>Pause</Text>
        </Pressable>
      )}
    </View>
  );
  const notices = (
    <>
      {warned && (
        <Text accessibilityLiveRegion="polite" style={styles.notice}>
          {warningNotice}
        </Text>
      )}
      {unsaved && (
        <Text accessibilityLiveRegion="polite" style={styles.notice}>
          {progressUnsaved}
        </Text>
      )}
    </>
  );
  const leaveSheet = (
    <View style={styles.footer}>
      <Text ref={leaveTitle} accessibilityRole="header" style={styles.leaveTitle}>
        Leave this exam?
      </Text>
      <Text style={styles.body}>{leaveBody(exam.mode)}</Text>
      <ChunkyButton label="Keep going" onPress={() => setLeaving(false)} />
      <ChunkyButton tone="plain" label="Leave and come back later" onPress={leaveForNow} />
      <ChunkyButton tone="plain" label="Quit exam" onPress={quit} />
    </View>
  );

  if (view === 'overview') {
    return (
      <MockOverview
        exam={exam}
        clockRow={clockRow}
        notices={notices}
        leaveSheet={leaving ? leaveSheet : null}
        onClose={() => setLeaving(true)}
        onOpen={(at) => {
          apply(goTo(exam, at));
          setView('question');
        }}
        onBack={() => setView('question')}
        onSubmit={submit}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="close" label="Close mock exam" onPress={() => setLeaving(true)} />
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Question ${index + 1} of ${total}`}
            accessibilityValue={{ min: 0, max: total, now: index + 1 }}
            style={styles.track}>
            <View style={[styles.fill, { width: `${((index + 1) / total) * 100}%` }]} />
          </View>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.count}>
            {index + 1} of {total}
          </Text>
        </View>

        {clockRow}
        {notices}

        <Text ref={stem} accessibilityRole="header" style={styles.stem}>
          {question.stem}
        </Text>

        <View accessibilityRole="radiogroup" style={styles.choices}>
          {choiceOrder(exam, index).map((stored, i) => {
            const on = stored === given;
            return (
              <Pressable
                key={stored}
                accessibilityRole="radio"
                accessibilityLabel={`${LETTERS[i]}. ${question.choices[stored]}`}
                accessibilityState={{ checked: on }}
                aria-checked={on}
                onPress={() => apply(answerCurrent(exam, stored))}
                style={[styles.choice, on && styles.choiceOn]}>
                <View style={[styles.letter, on && styles.letterOn]}>
                  <Text style={[styles.letterText, on && styles.letterTextOn]}>{LETTERS[i]}</Text>
                </View>
                <Text style={styles.choiceText}>{question.choices[stored]}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Flag this question for review"
          accessibilityState={{ checked: flagged }}
          aria-checked={flagged}
          onPress={() => apply(toggleFlag(exam))}
          style={[styles.tool, styles.flag, flagged && styles.flagOn]}>
          <Ionicons name={flagged ? 'flag' : 'flag-outline'} size={18} color={colors.ink} />
          <Text style={styles.toolText}>{flagged ? 'Flagged for review' : 'Flag for review'}</Text>
        </Pressable>
      </ScrollView>

      {leaving ? (
        leaveSheet
      ) : (
        <View style={styles.footer}>
          <View style={styles.pair}>
            <View style={styles.half}>
              <ChunkyButton tone="plain" label="Back" disabled={index === 0} onPress={() => apply(goTo(exam, index - 1))} />
            </View>
            <View style={styles.half}>
              <ChunkyButton label="Next" disabled={isLast} onPress={() => apply(goTo(exam, index + 1))} />
            </View>
          </View>
          <ChunkyButton tone={isLast ? 'green' : 'plain'} label="Review and submit" onPress={() => setView('overview')} />
        </View>
      )}
    </View>
  );
}

const EDGE = edges.tile;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: space.xxl, gap: space.lg },
  content: { padding: space.xl, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  track: { flex: 1, height: 14, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 14, borderRadius: radius.pill, backgroundColor: colors.green },
  count: { fontFamily: fonts.black, fontSize: 15, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  chip: {
    fontFamily: fonts.black,
    fontSize: 15,
    color: colors.blueOnTint,
    backgroundColor: colors.blueTint,
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    fontVariant: ['tabular-nums'],
  },
  chipWarned: { color: colors.yellowOnTint, backgroundColor: colors.yellowTint },
  tool: {
    minHeight: minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
  },
  toolText: { fontFamily: fonts.black, fontSize: 15, color: colors.ink },
  flag: { alignSelf: 'flex-start' },
  flagOn: { borderColor: colors.yellowEdge, backgroundColor: colors.yellowTint },
  notice: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.yellowOnTint,
    backgroundColor: colors.yellowTint,
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: space.md,
  },
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
  letter: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  letterOn: { backgroundColor: colors.green },
  letterText: { fontFamily: fonts.black, fontSize: 14, color: colors.muted },
  letterTextOn: { color: colors.white },
  choiceText: { flex: 1, fontFamily: fonts.extraBold, fontSize: 17, lineHeight: 23, color: colors.ink },
  footer: { padding: space.xl, paddingTop: space.lg, gap: space.md },
  pair: { flexDirection: 'row', gap: space.md },
  half: { flex: 1 },
  leaveTitle: { fontFamily: fonts.black, fontSize: 20, color: colors.ink },
  pausedTitle: { fontFamily: fonts.black, fontSize: 26, color: colors.ink, textAlign: 'center' },
  pausedClock: { fontFamily: fonts.black, fontSize: 32, color: colors.ink, textAlign: 'center', fontVariant: ['tabular-nums'] },
  body: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.ink },
  centered: { textAlign: 'center' },
});

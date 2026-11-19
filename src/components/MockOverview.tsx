import { Ionicons } from '@expo/vector-icons';
import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/ChunkyButton';
import { IconButton } from '@/components/IconButton';
import { focusOn } from '@/lib/focusOn';
import { examCounts } from '@/lib/mockExam';
import type { SavedExam } from '@/lib/mockSave';
import { countsLine, unansweredWarning } from '@/lib/mockText';
import { colors, fonts, minTouch, radius, space } from '@/theme/tokens';

type Props = {
  exam: SavedExam;
  clockRow: ReactNode;
  notices: ReactNode;
  // Shown in place of the buttons while the close question is open.
  leaveSheet: ReactNode | null;
  onClose: () => void;
  onOpen: (index: number) => void;
  onBack: () => void;
  onSubmit: () => void;
};

/** Every question's state before submitting: answered or not, flagged or not, each one a tap away. */
export function MockOverview({ exam, clockRow, notices, leaveSheet, onClose, onOpen, onBack, onSubmit }: Props) {
  const counts = examCounts(exam);
  // Submitting with blanks asks once first.
  const [asking, setAsking] = useState(false);
  const title = useRef<ComponentRef<typeof Text>>(null);
  const warning = useRef<ComponentRef<typeof Text>>(null);

  // The list replaces the question that had focus.
  useEffect(() => {
    focusOn(title.current);
  }, []);

  useEffect(() => {
    if (!asking) return;
    AccessibilityInfo.announceForAccessibility(unansweredWarning(counts.unanswered));
    focusOn(warning.current);
  }, [asking, counts.unanswered]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="close" label="Close mock exam" onPress={onClose} />
          <Text ref={title} accessibilityRole="header" style={styles.title}>
            Review your answers
          </Text>
        </View>
        {clockRow}
        {notices}
        <Text style={styles.counts}>{countsLine(counts.answered, counts.unanswered, counts.flagged)}</Text>
        <Text style={styles.hint}>Tap a number to go to that question.</Text>

        <View style={styles.grid}>
          {exam.answers.map((answer, i) => {
            const answered = answer !== null;
            const flagged = exam.flagged.includes(i);
            return (
              <Pressable
                key={exam.ids[i]}
                accessibilityRole="button"
                accessibilityLabel={`Question ${i + 1}, ${answered ? 'answered' : 'not answered'}${flagged ? ', flagged' : ''}`}
                onPress={() => onOpen(i)}
                style={[styles.cell, answered && styles.cellAnswered]}>
                <Text style={styles.cellText}>{i + 1}</Text>
                {/* The mark, not the colour alone, says which are answered. */}
                <Ionicons name={answered ? 'checkmark' : 'remove'} size={14} color={answered ? colors.green : colors.muted} />
                {flagged && (
                  <View style={styles.flag}>
                    <Ionicons name="flag" size={12} color={colors.amber} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {leaveSheet ?? (
        <View style={styles.footer}>
          {asking ? (
            <>
              <Text ref={warning} accessible style={styles.body}>
                {unansweredWarning(counts.unanswered)}
              </Text>
              <ChunkyButton label="Submit anyway" onPress={onSubmit} />
              <ChunkyButton tone="plain" label="Keep working" onPress={() => setAsking(false)} />
            </>
          ) : (
            <>
              <ChunkyButton label="Submit exam" onPress={() => (counts.unanswered > 0 ? setAsking(true) : onSubmit())} />
              <ChunkyButton tone="plain" label={`Back to question ${exam.index + 1}`} onPress={onBack} />
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.xl, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { fontFamily: fonts.black, fontSize: 24, color: colors.ink, flexShrink: 1 },
  counts: { fontFamily: fonts.black, fontSize: 16, lineHeight: 22, color: colors.ink },
  hint: { fontFamily: fonts.bold, fontSize: 15, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: {
    width: minTouch + 4,
    height: minTouch + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  cellAnswered: { borderColor: colors.green, backgroundColor: colors.greenTint },
  cellText: { fontFamily: fonts.black, fontSize: 15, color: colors.ink },
  flag: { position: 'absolute', top: 3, right: 3 },
  footer: { padding: space.xl, paddingTop: space.lg, gap: space.md },
  body: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.ink },
});

import { Ionicons } from '@expo/vector-icons';
import { type ComponentRef, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/ChunkyButton';
import { IconButton } from '@/components/IconButton';
import { SourceLink } from '@/components/SourceLink';
import { stemSource, type DrugCard } from '@/content/drugCards';
import { cardUnsaved, directionName, doneLine, gapLabel, ratingName, ratingSpoken, type Direction } from '@/lib/flashcardText';
import { dayKey } from '@/lib/progress';
import { getProgressState, subscribeProgress, updateProgress } from '@/lib/progressStore';
import { daysBetween, nextDue, nextGap, rateCard, RATINGS, type Rating } from '@/lib/review';
import { useAnnounce } from '@/lib/useAnnounce';
import { colors, edge as edges, fonts, radius, space } from '@/theme/tokens';

type Props = { cards: readonly DrugCard[]; direction: Direction; onLeave: () => void };

/** One sitting of flashcards: show a name, reveal the card, rate it. Each rating is saved before the next card. */
export function FlashcardRunner({ cards, direction, onLeave }: Props) {
  // Again sends a card to the back of the queue; Good and Easy take it out.
  const [queue, setQueue] = useState<readonly DrugCard[]>(cards);
  const [shown, setShown] = useState(false);
  const [finished, setFinished] = useState(0);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const heading = useRef<ComponentRef<typeof Text>>(null);
  const state = useSyncExternalStore(subscribeProgress, getProgressState, getProgressState);
  const states = state.status === 'ready' ? state.progress.cards : undefined;

  const card = queue.at(0);
  const total = cards.length;
  const asked = card ? (direction === 'brand' ? card.brand : card.generic) : '';
  const answer = card ? (direction === 'brand' ? card.generic : card.brand) : '';
  const view = card === undefined ? 'done' : `${card.id}:${shown}:${queue.length}`;
  const said = card === undefined ? null : shown ? `${asked} is ${answer}.` : null;

  useAnnounce(said);
  useAnnounce(failed ? cardUnsaved : null);
  // Each card, and each side of it, replaces what had focus.
  useEffect(() => {
    if (Platform.OS !== 'web' && heading.current) AccessibilityInfo.sendAccessibilityEvent(heading.current, 'focus');
  }, [view]);

  if (card === undefined) {
    const due = nextDue(cards.map((c) => c.id), states, dayKey(new Date()));
    const nextIn = due === null ? null : daysBetween(dayKey(new Date()), due);
    return <Done line={doneLine(total, nextIn)} onLeave={onLeave} />;
  }

  const rate = (rating: Rating) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setFailed(false);
    // The day it was rated, even if the save lands after midnight.
    const day = dayKey(new Date());
    void updateProgress((p) => rateCard(p, day, card.id, rating)).then((ok) => {
      busy.current = false;
      setSaving(false);
      if (!ok) {
        setFailed(true);
        return;
      }
      setQueue((q) => (rating === 'again' ? [...q.slice(1), q[0]] : q.slice(1)));
      if (rating !== 'again') setFinished((n) => n + 1);
      setShown(false);
    });
  };

  const at = Math.min(finished + 1, total);
  const previous = states?.[card.id]?.gap;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="close" label="Close flashcards" onPress={onLeave} />
          <View style={styles.headerBody}>
            <Text style={styles.deck}>Top 200 drugs · {directionName[direction]}</Text>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Card ${at} of ${total}`}
              accessibilityValue={{ min: 0, max: total, now: finished }}
              style={styles.track}>
              <View style={[styles.fill, { width: `${(finished / total) * 100}%` }]} />
            </View>
          </View>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.count}>
            {at} of {total}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.pill}>{shown ? 'Answer' : 'Question'}</Text>
          {shown ? (
            <>
              <View>
                <Text style={styles.lead}>{asked} is</Text>
                <Text ref={heading} accessibilityRole="header" style={[styles.name, styles.answer]}>
                  {answer}
                </Text>
              </View>
              <View>
                <Fact label="Class" value={card.drugClass} />
                <Fact label="Used for" value={card.usedFor} />
                <Fact label="Watch for" value={card.watchFor} />
              </View>
              {card.trick !== undefined && (
                <View style={styles.trick}>
                  <Ionicons name="bulb" size={22} color={colors.greenOnTint} />
                  <Text style={styles.trickText}>Memory trick: {card.trick}</Text>
                </View>
              )}
              <SourceLink source={card.source} />
              {card.trick !== undefined && <SourceLink source={stemSource} />}
            </>
          ) : (
            <View style={styles.front}>
              <Text style={styles.lead}>What is the {direction === 'brand' ? 'generic' : 'brand'} name for</Text>
              <Text ref={heading} accessibilityRole="header" style={styles.name}>
                {asked}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {failed && (
          <Text accessibilityLiveRegion="polite" style={styles.notice}>
            {cardUnsaved}
          </Text>
        )}
        {shown ? (
          <View style={styles.ratings}>
            {RATINGS.map((rating) => {
              const gap = nextGap(previous, rating);
              return (
                <Pressable
                  key={rating}
                  accessibilityRole="button"
                  accessibilityLabel={ratingSpoken(rating, gap)}
                  accessibilityState={{ disabled: saving }}
                  disabled={saving}
                  onPress={() => rate(rating)}
                  style={({ pressed }) => [styles.rating, styles[rating], (pressed || saving) && styles.dim]}>
                  <Text style={[styles.ratingName, rating === 'again' && styles.onAgain, rating === 'easy' && styles.onEasy]}>
                    {ratingName[rating]}
                  </Text>
                  <Text style={[styles.ratingGap, rating === 'again' && styles.onAgain, rating === 'easy' && styles.onEasy]}>
                    {gapLabel(gap)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <ChunkyButton label="Show answer" onPress={() => setShown(true)} />
        )}
      </View>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View accessible style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function Done({ line, onLeave }: { line: string; onLeave: () => void }) {
  const title = useRef<ComponentRef<typeof Text>>(null);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`All done for now. ${line}`);
    if (Platform.OS !== 'web' && title.current) AccessibilityInfo.sendAccessibilityEvent(title.current, 'focus');
  }, [line]);
  return (
    <View style={styles.done}>
      <Text ref={title} accessibilityRole="header" style={styles.doneTitle}>
        All done for now
      </Text>
      <Text style={styles.doneLine}>{line}</Text>
      <ChunkyButton label="Done" onPress={onLeave} />
    </View>
  );
}

const EDGE = edges.tile;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.xl, gap: space.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headerBody: { flex: 1, gap: space.sm },
  deck: { fontFamily: fonts.black, fontSize: 14, color: colors.ink },
  track: { height: 12, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 12, borderRadius: radius.pill, backgroundColor: colors.green },
  count: { fontFamily: fonts.black, fontSize: 15, color: colors.muted },
  card: {
    gap: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderBottomWidth: 2 + EDGE * 2,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: space.xl,
  },
  pill: {
    alignSelf: 'flex-start',
    fontFamily: fonts.black,
    fontSize: 13,
    color: colors.yellowOnTint,
    backgroundColor: colors.yellowTint,
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
  },
  front: { minHeight: 220, justifyContent: 'center' },
  lead: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.muted },
  name: { fontFamily: fonts.black, fontSize: 36, lineHeight: 44, color: colors.ink },
  answer: { color: colors.green },
  fact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    paddingVertical: space.md,
  },
  factLabel: { fontFamily: fonts.extraBold, fontSize: 14, lineHeight: 22, color: colors.muted },
  factValue: { flex: 1, fontFamily: fonts.black, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: 'right' },
  trick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.greenTint,
    borderRadius: radius.lg,
    padding: space.md,
  },
  trickText: { flex: 1, fontFamily: fonts.extraBold, fontSize: 14, lineHeight: 20, color: colors.greenOnTint },
  footer: { padding: space.xl, paddingTop: space.md, gap: space.md },
  notice: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.ink },
  ratings: { flexDirection: 'row', gap: space.md },
  rating: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderBottomWidth: 2 + EDGE,
    borderRadius: radius.lg,
    paddingVertical: space.sm,
  },
  again: { backgroundColor: colors.surface, borderColor: colors.red },
  good: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  easy: { backgroundColor: colors.green, borderColor: colors.greenEdge },
  dim: { opacity: 0.6 },
  ratingName: { fontFamily: fonts.black, fontSize: 16, color: colors.ink },
  ratingGap: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.muted },
  onAgain: { color: colors.red },
  onEasy: { color: colors.white },
  done: { flex: 1, justifyContent: 'center', padding: space.xxl, gap: space.lg },
  doneTitle: { fontFamily: fonts.black, fontSize: 26, color: colors.ink, textAlign: 'center' },
  doneLine: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24, color: colors.ink, textAlign: 'center' },
});

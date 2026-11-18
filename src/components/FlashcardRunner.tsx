import { Ionicons } from '@expo/vector-icons';
import { type ComponentRef, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ChunkyButton } from '@/components/ChunkyButton';
import { IconButton } from '@/components/IconButton';
import { SourceLink } from '@/components/SourceLink';
import type { Face } from '@/lib/flashcardFace';
import { cardUnsaved, doneLine, gapLabel, nameSize, NAME_SIZE, ratingName, ratingSpoken } from '@/lib/flashcardText';
import { focusOn } from '@/lib/focusOn';
import { dayKey } from '@/lib/progress';
import { getProgressState, subscribeProgress, updateProgress } from '@/lib/progressStore';
import { countReady, daysBetween, nextDue, nextGap, rateCard, RATINGS, type Rating } from '@/lib/review';
import { useAnnounce } from '@/lib/useAnnounce';
import { colors, edge as edges, fonts, radius, space } from '@/theme/tokens';

// `deckIds` is every card in the deck, so the end can say what is still waiting outside this sitting.
type Props = { cards: readonly Face[]; deckIds: readonly string[]; title: string; onLeave: () => void };

/** One sitting of flashcards: show a name, reveal the card, rate it. Each rating is saved before the next card. */
export function FlashcardRunner({ cards, deckIds, title, onLeave }: Props) {
  // Again sends a card to the back of the queue; Good and Easy take it out.
  const [queue, setQueue] = useState<readonly Face[]>(cards);
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
  const view = card === undefined ? 'done' : `${card.id}:${shown}:${queue.length}`;
  const mounted = useRef(false);
  const window = useWindowDimensions();

  useAnnounce(failed ? cardUnsaved : null);
  // Each card, and each side of it, replaces what had focus. Focus reads the name, so nothing is announced as well.
  // The first card leaves focus where the screen put it.
  useEffect(() => {
    if (mounted.current) focusOn(heading.current);
    mounted.current = true;
  }, [view]);

  if (card === undefined) {
    const today = dayKey(new Date());
    const { review, fresh } = countReady(deckIds, states, today);
    const due = nextDue(deckIds, states, today);
    return <Done line={doneLine(total, review + fresh, due === null ? null : daysBetween(today, due))} onLeave={onLeave} />;
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
  // A long name shrinks to fit the card, so large text or a narrow screen never splits a word.
  const fit = (name: string, most: number = NAME_SIZE) => {
    const size = Math.min(most, nameSize(name, window.width - CARD_INSET, window.fontScale));
    return { fontSize: size, lineHeight: Math.round(size * 1.22) };
  };
  const previous = states?.[card.id]?.gap;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <View style={styles.header}>
            <IconButton icon="close" label="Close flashcards" onPress={onLeave} />
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Card ${at} of ${total}`}
              accessibilityValue={{ min: 0, max: total, now: finished }}
              style={styles.track}>
              <View style={[styles.fill, { width: `${(finished / total) * 100}%` }]} />
            </View>
            <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.count}>
              {at} of {total}
            </Text>
          </View>
          <Text style={styles.deck}>{title}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.pill}>{shown ? 'Answer' : 'Question'}</Text>
          {shown ? (
            <>
              <View>
                <Text style={styles.lead}>{card.answerLead}</Text>
                <Text
                  ref={heading}
                  accessibilityRole="header"
                  style={[styles.name, styles.answer, fit(card.answer, card.phrase ? PHRASE_SIZE : NAME_SIZE)]}>
                  {card.answer}
                </Text>
              </View>
              {card.detail !== undefined && <Text style={styles.detail}>{card.detail}</Text>}
              {card.facts.length > 0 && (
                <View>
                  {card.facts.map((fact) => (
                    <Fact key={fact.label} label={fact.label} value={fact.value} />
                  ))}
                </View>
              )}
              {card.trick !== undefined && (
                <View style={styles.trick}>
                  <Ionicons name="bulb" size={22} color={colors.greenOnTint} />
                  <Text style={styles.trickText}>Memory trick: {card.trick}</Text>
                </View>
              )}
              {card.sources.map((source) => (
                <SourceLink key={source.url} source={source} />
              ))}
            </>
          ) : (
            <View style={styles.front}>
              <Text style={styles.lead}>{card.lead}</Text>
              <Text ref={heading} accessibilityRole="header" style={[styles.name, fit(card.name)]}>
                {card.name}
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
  // Focus reads the title and the line under it follows, so nothing is announced as well.
  useEffect(() => focusOn(title.current), []);
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
// An answer that is a sentence, not a name.
const PHRASE_SIZE = 22;
// Screen padding, card padding and card border, both sides.
const CARD_INSET = space.xl * 4 + 4;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.xl, gap: space.xl },
  top: { gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  deck: { fontFamily: fonts.black, fontSize: 14, color: colors.ink },
  track: { flex: 1, height: 12, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
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
  name: { fontFamily: fonts.black, fontSize: NAME_SIZE, lineHeight: 44, color: colors.ink },
  answer: { color: colors.green },
  detail: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24, color: colors.ink },
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

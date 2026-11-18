import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChunkyButton } from '@/components/ChunkyButton';
import { Mascot } from '@/components/Mascot';
import { ModeTile } from '@/components/ModeTile';
import { mockExam } from '@/content/domains';
import { brand } from '@/lib/brand';
import { goalProgress } from '@/lib/dailyGoal';
import { useToday } from '@/lib/useToday';
import { colors, fonts, radius, space } from '@/theme/tokens';
import React from 'react';

export default function HomeScreen() {
  const router = useRouter();
  const today = useToday();
  const progress = today.status === 'ready' ? goalProgress(today.answeredToday, today.dailyGoal) : null;

  let goalLine = 'Loading your day';
  if (today.status === 'unavailable') goalLine = "Couldn't load your progress";
  if (today.status === 'ready') goalLine = `${today.answeredToday} of ${today.dailyGoal} questions`;

  let cta = 'Start studying';
  if (progress?.done) cta = 'Goal done · keep going';
  else if (progress && progress.fraction > 0) cta = `Keep going · ${progress.remaining} left`;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>{brand.name}</Text>
            <Text accessibilityRole="header" style={styles.title}>Ready to sprint?</Text>
          </View>
          {today.status === 'ready' && (
            <View style={styles.pills}>
              <View style={[styles.pill, { backgroundColor: colors.yellowTint }]}>
                <Ionicons name="flame" size={16} color="#B45309" />
                <Text style={[styles.pillText, { color: colors.yellowOnTint }]}>
                  {today.streakDays} {today.streakDays === 1 ? 'day' : 'days'}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: colors.greenTint }]}>
                <Ionicons name="star" size={16} color={colors.green} />
                <Text style={[styles.pillText, { color: colors.greenOnTint }]}>{today.xp} XP</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.goalCard}>
          <Mascot />
          <View style={styles.goalBody}>
            <Text style={styles.goalKicker}>{"TODAY'S GOAL"}</Text>
            <Text style={styles.goalLine}>{goalLine}</Text>
            {progress && (
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: Math.round(progress.fraction * 100) }}
                style={styles.track}>
                <View style={[styles.fill, { width: `${progress.fraction * 100}%` }]} />
              </View>
            )}
          </View>
        </View>

        <ChunkyButton tone="yellow" label={cta} onPress={() => router.push('/study')} />

        <View style={styles.row}>
          <ModeTile title="Practice test" detail="Pick topics and length" icon="document-text" iconColor={colors.green} onPress={() => router.push('/study')} />
          <ModeTile title="Flashcards" detail="Top 200 drugs" icon="albums" iconColor="#B45309" onPress={() => router.push('/study')} />
        </View>
        <View style={styles.row}>
          <ModeTile title="Mock exam" detail={`${mockExam.questions} questions, timed`} icon="timer" iconColor="#1D4ED8" onPress={() => router.push('/study')} />
          <ModeTile title="Games" detail="Match · Speed round" icon="game-controller" iconColor="#BE185D" onPress={() => router.push('/games')} />
        </View>

        <Text style={styles.disclaimer}>{brand.disclaimer}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.xl, gap: space.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  headerText: { flexShrink: 1 },
  kicker: { fontFamily: fonts.bold, fontSize: 14, color: colors.muted },
  title: { fontFamily: fonts.black, fontSize: 26, color: colors.ink },
  pills: { flexDirection: 'row', gap: space.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 12 },
  pillText: { fontFamily: fonts.black, fontSize: 15 },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.green,
    borderRadius: radius.xl,
    borderBottomWidth: 6,
    borderBottomColor: colors.greenEdge,
    padding: space.xl,
  },
  goalBody: { flex: 1, gap: space.sm },
  goalKicker: { fontFamily: fonts.extraBold, fontSize: 13, color: colors.onGreenSoft },
  goalLine: { fontFamily: fonts.black, fontSize: 20, color: colors.white },
  track: { height: 12, borderRadius: radius.pill, backgroundColor: colors.greenEdge, overflow: 'hidden' },
  fill: { height: 12, borderRadius: radius.pill, backgroundColor: colors.yellow },
  row: { flexDirection: 'row', gap: space.md },
  disclaimer: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
});

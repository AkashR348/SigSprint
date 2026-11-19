import { StyleSheet, Text, View } from 'react-native';

import { estimateScore } from '@/lib/mockExam';
import type { ExamRecord } from '@/lib/mockSave';
import { historyRow, noHistory } from '@/lib/mockText';
import { colors, fonts, radius, space } from '@/theme/tokens';

/** The last finished mock exams, newest first, whatever their mode or length. */
export function MockHistory({ records }: { records: readonly ExamRecord[] }) {
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.label}>PAST RESULTS</Text>
      {records.length === 0 && <Text style={styles.empty}>{noHistory}</Text>}
      {records.map((record) => {
        const row = historyRow(record, estimateScore(record.correct, record.total));
        return (
          <View key={record.at} accessible accessibilityLabel={row.spoken} style={styles.row}>
            <Text style={styles.title}>{row.title}</Text>
            <Text style={styles.score}>{row.score}</Text>
            <Text style={styles.topics}>{row.topics}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  label: { fontFamily: fonts.black, fontSize: 13, color: colors.muted },
  empty: { fontFamily: fonts.bold, fontSize: 15, color: colors.muted },
  row: { gap: space.xs, borderWidth: 2, borderColor: colors.border, borderRadius: radius.lg, padding: space.lg },
  title: { fontFamily: fonts.black, fontSize: 15, lineHeight: 21, color: colors.ink },
  score: { fontFamily: fonts.extraBold, fontSize: 15, lineHeight: 21, color: colors.ink },
  topics: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.muted },
});

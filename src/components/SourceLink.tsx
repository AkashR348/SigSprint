import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import type { Source } from '@/content/questions';
import { colors, fonts, minTouch } from '@/theme/tokens';

/** Where an answer was confirmed; opens the page in the browser. */
export function SourceLink({ source }: { source: Source }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Source: ${source.title}`}
      accessibilityHint="Opens in your browser"
      // A phone with no browser has nowhere to open it; the title still names the source.
      onPress={() => void Linking.openURL(source.url).catch(() => {})}
      style={styles.box}>
      <Text style={styles.text}>
        Source: <Text style={styles.title}>{source.title}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: minTouch, justifyContent: 'center' },
  text: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.ink },
  title: { textDecorationLine: 'underline' },
});

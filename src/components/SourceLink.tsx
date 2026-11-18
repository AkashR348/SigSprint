import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Source } from '@/content/questions';
import { useAnnounce } from '@/lib/useAnnounce';
import { colors, fonts, minTouch } from '@/theme/tokens';

/** Where an answer was confirmed; opens the page in the browser, or shows its address if that fails. */
export function SourceLink({ source }: { source: Source }) {
  const [failed, setFailed] = useState(false);
  const fallback = failed ? `Couldn't open the page. Its address is ${source.url}` : null;
  useAnnounce(fallback);
  return (
    <View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Source: ${source.title}`}
        accessibilityHint="Opens in your browser"
        onPress={() => void Linking.openURL(source.url).then(() => setFailed(false), () => setFailed(true))}
        style={styles.box}>
        <Text style={styles.text}>
          Source: <Text style={styles.title}>{source.title}</Text>
        </Text>
      </Pressable>
      {fallback !== null && (
        <Text accessibilityLiveRegion="polite" selectable style={styles.text}>
          {fallback}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: minTouch, justifyContent: 'center' },
  text: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.ink },
  title: { textDecorationLine: 'underline' },
});

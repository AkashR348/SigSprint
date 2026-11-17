import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radius } from '@/theme/tokens';

type Props = { label: string; onPress: () => void; tone?: 'green' | 'yellow'; disabled?: boolean };

const EDGE = 5;

export function ChunkyButton({ label, onPress, tone = 'green', disabled = false }: Props) {
  const face = tone === 'green' ? colors.green : colors.yellow;
  const edge = tone === 'green' ? colors.greenEdge : colors.yellowEdge;
  const text = tone === 'green' ? colors.white : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: face, borderBottomColor: edge, opacity: disabled ? 0.5 : 1 },
        // The face drops onto its edge when pressed.
        pressed && { borderBottomWidth: 0, marginTop: EDGE },
      ]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderBottomWidth: EDGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: { fontFamily: fonts.black, fontSize: 18 },
});

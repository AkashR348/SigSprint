import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, edge as edges, fonts, radius, space } from '@/theme/tokens';

type Tone = 'green' | 'yellow' | 'plain';
type Props = { label: string; onPress: () => void; tone?: Tone; disabled?: boolean };

const EDGE = edges.button;

// `plain` is the quiet choice beside a main button; its outline holds 3:1 on white and on the tints.
const tones: Record<Tone, { face: string; edge: string; text: string; outline: number }> = {
  green: { face: colors.green, edge: colors.greenEdge, text: colors.white, outline: 0 },
  yellow: { face: colors.yellow, edge: colors.yellowEdge, text: colors.ink, outline: 0 },
  plain: { face: colors.surface, edge: colors.muted, text: colors.ink, outline: 2 },
};

export function ChunkyButton({ label, onPress, tone = 'green', disabled = false }: Props) {
  const { face, edge, text, outline } = tones[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.box, { opacity: disabled ? 0.5 : 1 }]}>
      {({ pressed }) => (
        // The face slides onto its edge; the outer box keeps its size so nothing around it moves.
        <>
          <View style={[styles.edge, { backgroundColor: edge }]} />
          <View
            style={[
              styles.face,
              { backgroundColor: face, borderWidth: outline, borderColor: edge },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.label, { color: text }]}>{label}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { paddingBottom: EDGE },
  edge: { position: 'absolute', top: EDGE, bottom: 0, left: 0, right: 0, borderRadius: radius.lg },
  face: {
    minHeight: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  pressed: { transform: [{ translateY: EDGE }] },
  label: { fontFamily: fonts.black, fontSize: 18 },
});

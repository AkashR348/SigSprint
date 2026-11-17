import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, space } from '@/theme/tokens';

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
      style={[styles.box, { opacity: disabled ? 0.5 : 1 }]}>
      {({ pressed }) => (
        // The face slides onto its edge; the outer box keeps its size so nothing around it moves.
        <>
          <View style={[styles.edge, { backgroundColor: edge }]} />
          <View style={[styles.face, { backgroundColor: face }, pressed && styles.pressed]}>
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

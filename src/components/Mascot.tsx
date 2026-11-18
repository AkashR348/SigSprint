import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

/** The capsule mascot, drawn with views. Decorative, so screen readers skip it. */
export function Mascot({ size = 84 }: { size?: number }) {
  const width = size * 0.52;
  const eye = size * 0.09;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.capsule, { width, height: size * 0.82, borderRadius: width / 2 }]}>
        <View style={styles.top}>
          <View style={[styles.eyes, { gap: eye }]}>
            <View style={[styles.eye, { width: eye, height: eye, borderRadius: eye / 2 }]} />
            <View style={[styles.eye, { width: eye, height: eye, borderRadius: eye / 2 }]} />
          </View>
        </View>
        <View style={styles.bottom} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: {
    borderWidth: 3,
    borderColor: colors.ink,
    overflow: 'hidden',
    transform: [{ rotate: '-28deg' }],
  },
  top: { flex: 1, backgroundColor: colors.yellow, justifyContent: 'flex-end', alignItems: 'center' },
  bottom: { flex: 1, backgroundColor: colors.white, borderTopWidth: 3, borderTopColor: colors.ink },
  eyes: { flexDirection: 'row', marginBottom: 6 },
  eye: { backgroundColor: colors.ink },
});

import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, minTouch, radius } from '@/theme/tokens';

type Props = { icon: ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void };

/** A square button that is only an icon; `label` is what a screen reader says. */
export function IconButton({ icon, label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.box, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: minTouch,
    height: minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.border },
});

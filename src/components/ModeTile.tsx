import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, space } from '@/theme/tokens';

type Props = {
  title: string;
  detail: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  onPress: () => void;
};

export function ModeTile({ title, detail, icon, iconColor, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <Ionicons name={icon} size={26} color={iconColor} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 104,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: space.xs,
  },
  pressed: { borderBottomWidth: 2, marginTop: 4 },
  title: { fontFamily: fonts.black, fontSize: 16, color: colors.ink, marginTop: space.xs },
  detail: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
});

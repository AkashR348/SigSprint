import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, edge as edges, fonts, radius, space } from '@/theme/tokens';
import React from 'react';

type Props = {
  title: string;
  detail: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  onPress: () => void;
};

const EDGE = edges.tile;

export function ModeTile({ title, detail, icon, iconColor, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      onPress={onPress}
      style={styles.box}>
      {({ pressed }) => (
        // The face slides onto its edge; the outer box keeps its size so the row never moves.
        <>
          <View style={styles.edge} />
          <View style={[styles.face, pressed && styles.pressed]}>
            <Ionicons name={icon} size={26} color={iconColor} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.detail}>{detail}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, paddingBottom: EDGE },
  edge: { position: 'absolute', top: EDGE, bottom: 0, left: 0, right: 0, borderRadius: radius.lg, backgroundColor: colors.borderStrong },
  face: {
    flex: 1,
    minHeight: 100,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    padding: space.lg,
    gap: space.xs,
  },
  pressed: { transform: [{ translateY: EDGE }] },
  title: { fontFamily: fonts.black, fontSize: 16, color: colors.ink, marginTop: space.xs },
  detail: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
});

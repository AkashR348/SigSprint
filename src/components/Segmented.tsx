import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, minTouch, radius, space } from '@/theme/tokens';

type Props<T extends string> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** A choice of one from a few, side by side. */
export function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.track}>
        {options.map((option) => {
          const on = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`${label}, ${option.label}`}
              accessibilityState={{ checked: on }}
              onPress={() => onChange(option.value)}
              style={[styles.option, on && styles.optionOn]}>
              <Text style={[styles.text, on && styles.textOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flex: 1, gap: space.sm },
  label: { fontFamily: fonts.black, fontSize: 13, color: colors.muted },
  track: { flexDirection: 'row', backgroundColor: colors.surfaceSoft, borderRadius: radius.md, padding: space.xs },
  option: { flex: 1, minHeight: minTouch, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xs },
  // The outline, not the fill alone, marks the chosen side; 3:1 against the track.
  optionOn: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.green },
  text: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.muted, textAlign: 'center' },
  textOn: { fontFamily: fonts.black, color: colors.ink },
});

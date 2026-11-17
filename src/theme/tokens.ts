// Capsule Pop. Text pairs here meet 4.5:1; check contrast before adding a pair.
export const colors = {
  ink: '#17302A',
  muted: '#4F6B63',
  surface: '#FFFFFF',
  surfaceSoft: '#F1F7F5',
  border: '#D6E4DF',
  // Outline of a tappable surface; 3:1 on white.
  borderStrong: '#7A968E',
  green: '#0A7C5F',
  greenEdge: '#075C46',
  greenTint: '#DDF5EC',
  greenOnTint: '#0A5C47',
  onGreenSoft: '#E6F9F1',
  yellow: '#FFD43B',
  yellowEdge: '#B38900',
  yellowTint: '#FFF3C4',
  yellowOnTint: '#6B4A00',
  white: '#FFFFFF',
  // Icon accents; each is at least 4.5:1 on white.
  amber: '#B45309',
  blue: '#1D4ED8',
  pink: '#BE185D',
} as const;

export const fonts = {
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const radius = { md: 14, lg: 18, xl: 24, pill: 999 } as const;

// Smallest tap target on either platform.
export const minTouch = 48;

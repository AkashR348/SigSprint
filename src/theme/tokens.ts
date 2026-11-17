// Capsule Pop. Text pairs here meet 4.5:1; check contrast before adding a pair.
export const colors = {
  ink: '#17302A',
  muted: '#4F6B63',
  surface: '#FFFFFF',
  surfaceSoft: '#F1F7F5',
  border: '#D6E4DF',
  green: '#0A7C5F',
  greenEdge: '#075C46',
  greenTint: '#DDF5EC',
  greenOnTint: '#0A5C47',
  onGreenSoft: '#C9F2E3',
  yellow: '#FFD43B',
  yellowEdge: '#C99A00',
  yellowTint: '#FFF3C4',
  yellowOnTint: '#6B4A00',
  white: '#FFFFFF',
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

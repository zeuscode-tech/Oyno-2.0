export const COLORS = {
  // Backgrounds
  bg: '#121212',
  bgCard: '#1E1E1E',
  bgInput: '#1E1E1E',
  bgDeep: '#0A0A0A',
  border: '#2A2A2A',

  // Brand
  accent: '#C6FF00',
  accentDim: 'rgba(198,255,0,0.1)',
  accentGlow: 'rgba(198,255,0,0.3)',

  // Text
  white: '#FFFFFF',
  gray: {
    100: '#E5E5E5',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
  },

  // Semantic
  error: '#EF5350',
  success: '#4CAF50',
  warning: '#FFB800',

  // Transparent overlays
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const FONTS = {
  black: 'Montserrat_900Black',
  blackItalic: 'Montserrat_900Black_Italic',
  bold: 'Montserrat_700Bold',
  boldItalic: 'Montserrat_700Bold_Italic',
  medium: 'Montserrat_500Medium',
  regular: 'Montserrat_400Regular',
} as const;

export const RADIUS = {
  sm: 12,
  md: 20,
  lg: 28,
  xl: 32,
  full: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const SHADOW = {
  accent: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

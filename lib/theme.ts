/**
 * Theme — plain exported design token object.
 *
 * Usage:
 *   import { theme } from '@/lib/theme'
 *   import { useColorScheme } from 'react-native'
 *
 *   const scheme = useColorScheme() ?? 'light'
 *   const c = theme.colors[scheme]
 *   const styles = StyleSheet.create({
 *     container: { backgroundColor: c.background, padding: theme.spacing.md },
 *   })
 *
 * No hooks, no context — just a plain constant so it can be imported anywhere,
 * including outside of React components (e.g. stores, utilities).
 */

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

const lightColors = {
  // Backgrounds
  background: '#F5F2EE',   // Sail canvas / parchment
  surface: '#FDFAF6',      // Card / panel

  // Borders
  border: '#E0D9D0',       // Natural rope

  // Brand
  primary: '#3A7DB5',      // Port-side blue
  primaryLight: '#D4E4F0', // Light sea wash
  secondary: '#B8736B',    // Weathered signal buoy red
  secondaryLight: '#F0DADA', // Light red wash

  // Text
  text: '#2C3440',         // Near-black navy
  textSecondary: '#7A8494', // Mid nautical grey
  textMuted: '#A8B0BC',    // Haze

  // Semantic
  success: '#2E8B57',      // Sea-green
  warning: '#C4895A',      // Brass / lantern amber
  error: '#C0392B',        // Signal red
} as const

const darkColors = {
  // Backgrounds
  background: '#0D1B2A',   // Deep night sea
  surface: '#1A2B3C',      // Chart table below decks

  // Borders
  border: '#2A3D52',       // Subtle hull seam

  // Brand
  primary: '#7BB8D4',      // Moonlit blue
  primaryLight: '#1A3A52', // Deep blue wash
  secondary: '#C4736B',    // Signal red (lifted for contrast)
  secondaryLight: '#3D1E1E', // Dark red wash

  // Text
  text: '#E8DEC8',         // Moonlit parchment
  textSecondary: '#9AACBA', // Faded chart ink
  textMuted: '#5A7080',    // Night haze

  // Semantic
  success: '#2E8B57',      // Phosphorescence
  warning: '#C4895A',      // Brass lantern
  error: '#C0392B',        // Warning red
} as const

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------

const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999,
} as const

// ---------------------------------------------------------------------------
// Typography
//
// Tokens name the font family role; actual font loading is handled in the
// root layout via expo-font / @expo-google-fonts.
// ---------------------------------------------------------------------------

const fonts = {
  display: 'Lora_700Bold',
  heading: 'Lora_600SemiBold',
  label: 'Nunito_600SemiBold',
  body: 'Nunito_400Regular',
} as const

// ---------------------------------------------------------------------------
// Composed export
// ---------------------------------------------------------------------------

export const theme = {
  colors: {
    light: lightColors,
    dark: darkColors,
  },
  spacing,
  radius,
  fonts,
} as const

// Convenience types — useful for prop typing.
export type ColorScheme = keyof typeof theme.colors
export type Colors = typeof lightColors  // light and dark have the same keys
export type ThemeSpacing = typeof spacing
export type ThemeRadius = typeof radius
export type ThemeFonts = typeof fonts

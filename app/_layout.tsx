// Initialise i18n before any screen renders.
// This is a side-effect import — it runs i18next.init() synchronously.
import '@/lib/i18n'

import { Slot } from 'expo-router'

/**
 * Root layout — the single ancestor wrapping every screen in the app.
 *
 * Phase 1: minimal shell. Expo Router renders child routes via <Slot />.
 *
 * Future phases will add here:
 *   - Font loading + SplashScreen gating       (Phase 2)
 *   - Auth session listener + redirect logic   (Phase 2)
 *   - Tab / stack navigator structure          (Phase 7)
 */
export default function RootLayout() {
  return <Slot />
}

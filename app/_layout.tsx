// Initialise i18n before any screen renders.
// This is a side-effect import — it runs i18next.init() synchronously.
import '@/lib/i18n'

import * as Sentry from '@sentry/react-native'
import { Slot } from 'expo-router'

// Initialise Sentry as early as possible so it captures errors in all
// subsequent imports and lifecycle hooks. The DSN is a public identifier —
// safe to ship in the bundle. When EXPO_PUBLIC_SENTRY_DSN is empty (e.g.
// a dev environment without a Sentry project) this call is a safe no-op.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__,
})

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

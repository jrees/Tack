// Initialise i18n before any screen renders.
// This is a side-effect import — it runs i18next.init() synchronously.
import '@/lib/i18n'

import * as Sentry from '@sentry/react-native'
import * as SplashScreen from 'expo-splash-screen'
import * as Linking from 'expo-linking'
import { useFonts, Lora_700Bold, Lora_600SemiBold } from '@expo-google-fonts/lora'
import { Nunito_400Regular, Nunito_600SemiBold } from '@expo-google-fonts/nunito'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useHouseholdStore } from '@/stores/householdStore'

// Keep the splash screen visible until we explicitly call hideAsync().
SplashScreen.preventAutoHideAsync()

// Initialise Sentry as early as possible.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__,
})

// ---------------------------------------------------------------------------
// Auth + routing guard
// ---------------------------------------------------------------------------
// Analogous to a Blazor AuthorizeRouteView — after each auth or household
// state change this hook redirects to the correct route group.
// ---------------------------------------------------------------------------

function useAuthGuard() {
  const segments = useSegments() as string[]
  const router = useRouter()
  const { session, isLoading, isPasswordRecovery } = useAuthStore()
  const { currentHousehold, isLoading: householdLoading, fetchHousehold, reset: resetHousehold } = useHouseholdStore()

  // Fetch household whenever the authenticated user changes.
  useEffect(() => {
    if (session?.user) {
      fetchHousehold(session.user.id)
    } else {
      resetHousehold()
    }
  }, [session?.user?.id])

  useEffect(() => {
    // Don't redirect until auth has resolved — avoids flicker on cold start.
    if (isLoading) return

    // During password recovery, route to the update-password screen and hold
    // there until the user submits a new password.  We actively navigate
    // rather than just returning, because the deep-link URL exchange is async
    // and the guard may fire before isPasswordRecovery is set — the next time
    // it fires with isPasswordRecovery=true this redirect corrects the path.
    if (isPasswordRecovery) {
      const onUpdatePassword =
        segments[0] === '(auth)' && segments[1] === 'update-password'
      if (!onUpdatePassword) router.replace('/(auth)/update-password')
      return
    }

    const inAuthGroup      = segments[0] === '(auth)'
    const inHouseholdGroup = segments[0] === '(household)'

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login')
      return
    }

    // Session exists but household query hasn't resolved yet — wait.
    if (householdLoading) return

    if (!currentHousehold) {
      if (!inHouseholdGroup) router.replace('/(household)/setup')
    } else {
      if (inAuthGroup || inHouseholdGroup) router.replace('/(app)')
    }
  }, [session, isLoading, isPasswordRecovery, currentHousehold, householdLoading, segments])
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

export default function RootLayout() {
  const initialize = useAuthStore(s => s.initialize)
  const { session, isLoading } = useAuthStore()

  // Load custom fonts — Lora (display/heading) and Nunito (labels).
  // expo-file-system is installed as a peer requirement for expo-font to work
  // correctly on Android (without it, vector icons render as CJK characters).
  const [fontsLoaded] = useFonts({
    Lora_700Bold,
    Lora_600SemiBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
  })

  // Initialise auth store once on mount — loads the persisted session.
  useEffect(() => {
    initialize()
  }, [])

  // Hide splash only when BOTH auth AND fonts are ready.
  useEffect(() => {
    if (!isLoading && fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [isLoading, fontsLoaded])

  // Deep link handler for password recovery.
  // Supabase emails a link like: tack://update-password?token_hash=abc&type=recovery
  // When tapped, Expo's Linking API fires this event and we hand it to the
  // store, which exchanges the token hash for a live session.
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      if (url.includes('type=recovery') || url.includes('update-password')) {
        await useAuthStore.getState().handlePasswordRecoveryUrl(url)
      }
    }

    // Cold-start: app opened via the link.
    Linking.getInitialURL().then(url => {
      if (url) handleUrl({ url })
    })

    // Warm: link opened while app is already running.
    const subscription = Linking.addEventListener('url', handleUrl)
    return () => subscription.remove()
  }, [])

  useAuthGuard()

  return <Slot />
}

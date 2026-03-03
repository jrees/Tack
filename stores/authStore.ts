import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { SubscriptionTier } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuthState = {
  session: Session | null
  user: User | null
  tier: SubscriptionTier
  isLoading: boolean
  isPasswordRecovery: boolean
}

type AuthActions = {
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signOut: () => Promise<void>
  sendPasswordResetEmail: (email: string, redirectTo: string) => Promise<void>
  handlePasswordRecoveryUrl: (url: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
}

type AuthStore = AuthState & AuthActions

// ---------------------------------------------------------------------------
// Auth listener — attached once at module level to prevent Fast Refresh
// stacking multiple listeners on hot reload.
// ---------------------------------------------------------------------------
// The listener calls back into the store via a setter function that is set
// during `initialize()`.  Using a module-level variable is the standard
// Zustand pattern for external subscriptions.
// ---------------------------------------------------------------------------

let _setStoreState: ((partial: Partial<AuthState>) => void) | null = null

supabase.auth.onAuthStateChange((event, session) => {
  if (!_setStoreState) return

  if (event === 'PASSWORD_RECOVERY') {
    _setStoreState({ session, user: session?.user ?? null, isPasswordRecovery: true })
    return
  }

  _setStoreState({
    session,
    user: session?.user ?? null,
    isPasswordRecovery: false,
  })

  // Fetch subscription tier whenever the user session changes.
  if (session?.user) {
    fetchTier(session.user.id).then(tier => _setStoreState?.({ tier }))
  } else {
    _setStoreState({ tier: 'free' })
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchTier(userId: string): Promise<SubscriptionTier> {
  const { data } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle()

  // No row = free tier (see CLAUDE.md data model notes)
  return data?.tier ?? 'free'
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthStore>((set) => {
  // Wire up the module-level setter so the auth listener can reach the store.
  _setStoreState = (partial) => set(partial as Partial<AuthStore>)

  return {
    // ---- initial state ----
    session: null,
    user: null,
    tier: 'free',
    isLoading: true,
    isPasswordRecovery: false,

    // ---- actions ----

    /**
     * Load the persisted session from SecureStore and start the auth listener.
     * Call this once from the root layout on mount.
     */
    initialize: async () => {
      const { data: { session } } = await supabase.auth.getSession()

      const tier = session?.user
        ? await fetchTier(session.user.id)
        : 'free'

      set({
        session,
        user: session?.user ?? null,
        tier,
        isLoading: false,
      })
    },

    /**
     * Sign in with email and password.
     * Throws on error so callers can show inline feedback.
     */
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },

    /**
     * Register a new user.
     * Passes display_name as user metadata so the handle_new_user trigger
     * can write it to public.profiles automatically (SECURITY DEFINER).
     * There is no INSERT policy on profiles for client callers — the trigger
     * is the only correct insertion path.
     * Throws on error so callers can show inline feedback.
     */
    signUp: async (email, password, displayName) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          // After email confirmation the browser redirects to this deep link.
          // The OS opens the app at the login screen; the user signs in normally.
          // tack://** must be in the Supabase Auth redirect URL allowlist.
          emailRedirectTo: 'tack://login',
        },
      })
      if (error) throw error

      // Supabase returns HTTP 200 for repeated signups to prevent email
      // enumeration, so there is no error to catch. An empty identities array
      // is the official signal that the address is already confirmed.
      if (data.user?.identities?.length === 0) {
        throw new Error('email already in use')
      }
    },

    /**
     * Sign out the current user and clear all auth state.
     */
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      // onAuthStateChange will fire and clear session/user via _setStoreState,
      // but we set tier immediately for a snappy UI response.
      set({ tier: 'free' })
    },

    /**
     * Send a password reset email.
     * `redirectTo` should be the deep-link URL the app listens to
     * (e.g. `tack://update-password`).
     */
    sendPasswordResetEmail: async (email, redirectTo) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })
      if (error) throw error
    },

    /**
     * Parse a password-recovery deep link URL, extract the tokens, and
     * establish a session so the user can call `updatePassword`.
     *
     * Supabase embeds the token_hash in the URL fragment; we exchange it for
     * a full session using `verifyOtp` with `type: 'recovery'`.
     */
    handlePasswordRecoveryUrl: async (url) => {
      // Extract the token_hash query param from URLs like:
      // tack://update-password?token_hash=abc123&type=recovery
      const tokenHashMatch = url.match(/[?&]token_hash=([^&]+)/)
      if (!tokenHashMatch) return

      const tokenHash = decodeURIComponent(tokenHashMatch[1])
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      })
      if (error) throw error

      set({
        session: data.session,
        user: data.user,
        isPasswordRecovery: true,
      })
    },

    /**
     * Set a new password for the currently authenticated user.
     * Only valid after `handlePasswordRecoveryUrl` has established a session.
     * Clears the `isPasswordRecovery` flag on success.
     */
    updatePassword: async (newPassword) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      set({ isPasswordRecovery: false })
    },
  }
})

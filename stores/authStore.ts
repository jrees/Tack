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
  signUp: (email: string, password: string, displayName: string, redirectTo: string) => Promise<void>
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

// True while handlePasswordRecoveryUrl is mid-flight calling setSession().
// setSession() fires SIGNED_IN (not PASSWORD_RECOVERY), so without this flag
// the auth listener would reset isPasswordRecovery to false before we can set
// it back to true.
let _isHandlingRecovery = false

supabase.auth.onAuthStateChange((event, session) => {
  if (!_setStoreState) return

  if (event === 'PASSWORD_RECOVERY') {
    _setStoreState({ session, user: session?.user ?? null, isPasswordRecovery: true })
    return
  }

  _setStoreState({
    session,
    user: session?.user ?? null,
    // Don't clear isPasswordRecovery while we're inside handlePasswordRecoveryUrl
    // — the SIGNED_IN event from setSession() must not clobber the flag.
    ...(!_isHandlingRecovery && { isPasswordRecovery: false }),
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
    signUp: async (email, password, displayName, redirectTo) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          // After email confirmation the browser redirects to this deep link.
          // redirectTo is supplied by the caller via Linking.createURL() so it
          // resolves to exp://... in Expo Go and tack://... in a production build.
          emailRedirectTo: redirectTo,
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
     * Parse a password-recovery deep link URL and establish a session so the
     * user can call `updatePassword`.
     *
     * Supabase delivers credentials in one of two formats depending on the
     * auth flow configured:
     *
     * A) token_hash in query string (newer PKCE-adjacent flow):
     *    tack://update-password?token_hash=abc&type=recovery
     *    → call verifyOtp to exchange the hash for a session.
     *
     * B) access_token + refresh_token in URL fragment (implicit flow, default):
     *    tack://update-password#access_token=abc&refresh_token=xyz&type=recovery
     *    → call setSession directly with the tokens.
     *
     * In Expo Go the scheme is exp:// rather than tack://, but the rest of the
     * URL structure and parsing is identical.
     */
    handlePasswordRecoveryUrl: async (url) => {
      // --- Format A: token_hash as query param ---
      const queryString = url.split('?')[1]?.split('#')[0] ?? ''
      const queryParams = new URLSearchParams(queryString)
      const tokenHash = queryParams.get('token_hash')

      if (tokenHash) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })
        if (error) throw error
        set({ session: data.session, user: data.user, isPasswordRecovery: true })
        return
      }

      // --- Format B: access_token + refresh_token in URL fragment ---
      const fragment = url.split('#')[1] ?? ''
      const fragmentParams = new URLSearchParams(fragment)
      const accessToken = fragmentParams.get('access_token')
      const refreshToken = fragmentParams.get('refresh_token')
      const type = fragmentParams.get('type')

      if (accessToken && refreshToken && type === 'recovery') {
        _isHandlingRecovery = true
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
          set({ session: data.session, user: data.user, isPasswordRecovery: true })
        } finally {
          _isHandlingRecovery = false
        }
      }
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

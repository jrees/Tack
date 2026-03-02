import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '@/lib/theme'
import { useAuthStore } from '@/stores/authStore'
import { FormInput } from '@/components/FormInput'
import { PrimaryButton } from '@/components/PrimaryButton'

// ---------------------------------------------------------------------------
// Map Supabase error messages to localised user-friendly strings.
// Supabase returns English error strings; we match on keywords rather than
// exact text so minor upstream changes don't break the mapping.
// ---------------------------------------------------------------------------
function mapError(msg: string, t: ReturnType<typeof useTranslation>['t']): string {
  const lower = msg.toLowerCase()
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return t('auth.errors.invalidCredentials')
  }
  if (lower.includes('email not confirmed')) {
    return t('auth.errors.generic')
  }
  return t('auth.errors.generic')
}

export default function LoginScreen() {
  const { t } = useTranslation()
  const scheme = useColorScheme() ?? 'light'
  const c = theme.colors[scheme]
  const router = useRouter()
  const signIn = useAuthStore(s => s.signIn)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validate = (): boolean => {
    let valid = true
    setEmailError('')
    setPasswordError('')
    setFormError('')

    if (!email.trim()) {
      setEmailError(t('auth.errors.emailRequired'))
      valid = false
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setEmailError(t('auth.errors.invalidEmail'))
      valid = false
    }

    if (!password) {
      setPasswordError(t('auth.errors.passwordRequired'))
      valid = false
    }

    return valid
  }

  const handleSignIn = async () => {
    if (!validate()) return

    setIsLoading(true)
    try {
      await signIn(email.trim(), password)
      // On success the auth state change triggers the root layout guard,
      // which redirects to /(app) or /(household)/setup automatically.
    } catch (err) {
      setFormError(mapError((err as Error).message, t))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand */}
          <View style={styles.header}>
            <Text style={[styles.appName, { color: c.primary }]}>Tack</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label={t('auth.email')}
              value={email}
              onChangeText={text => { setEmail(text); setEmailError('') }}
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              error={emailError}
            />

            <FormInput
              label={t('auth.password')}
              value={password}
              onChangeText={text => { setPassword(text); setPasswordError(''); setFormError('') }}
              secureTextEntry
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
              error={passwordError}
            />

            {formError ? (
              <Text style={[styles.formError, { color: c.error }]}>{formError}</Text>
            ) : null}

            <PrimaryButton
              title={t('auth.signIn')}
              onPress={handleSignIn}
              isLoading={isLoading}
            />

            <Pressable
              style={styles.forgotLink}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={[styles.link, { color: c.primary }]}>
                {t('auth.forgotPassword')}
              </Text>
            </Pressable>
          </View>

          {/* Register */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: c.textSecondary }]}>
              {t('auth.noAccount')}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.link, { color: c.primary }]}>
                {' '}{t('auth.signUp')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl + theme.spacing.lg,
  },
  appName: {
    fontSize: 52,
    fontFamily: theme.fonts.display,
    letterSpacing: -1,
  },
  form: {
    marginBottom: theme.spacing.lg,
  },
  formError: {
    fontSize: 14,
    fontFamily: theme.fonts.label,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  forgotLink: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: theme.fonts.label,
  },
  link: {
    fontSize: 14,
    fontFamily: theme.fonts.label,
  },
})

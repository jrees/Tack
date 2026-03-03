import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme, type ColorScheme } from '@/lib/theme'
import { useAuthStore } from '@/stores/authStore'
import { FormInput } from '@/components/FormInput'
import { PrimaryButton } from '@/components/PrimaryButton'

// ---------------------------------------------------------------------------
// Password strength
// ---------------------------------------------------------------------------

type PasswordChecks = {
  length: boolean
  upper: boolean
  lower: boolean
  number: boolean
  symbol: boolean
}

function checkPassword(pw: string): PasswordChecks {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  }
}

function isStrong(checks: PasswordChecks): boolean {
  return Object.values(checks).every(Boolean)
}

// ---------------------------------------------------------------------------
// Supabase error detection + mapping
// ---------------------------------------------------------------------------

function isEmailInUseError(msg: string): boolean {
  const lower = msg.toLowerCase()
  return (
    lower.includes('already registered') ||
    lower.includes('already in use') ||
    lower.includes('already exists') ||
    lower.includes('user already')
  )
}

function mapError(msg: string, t: ReturnType<typeof useTranslation>['t']): string {
  if (isEmailInUseError(msg)) return t('auth.errors.emailInUse')
  return t('auth.errors.generic')
}

// ---------------------------------------------------------------------------
// Password strength checklist — rendered as a FormInput hint
// ---------------------------------------------------------------------------

function PasswordStrengthIndicator({ password }: { password: string }) {
  const { t } = useTranslation()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]

  if (!password) return null

  const checks = checkPassword(password)
  const requirements: Array<{ key: keyof PasswordChecks; label: string }> = [
    { key: 'length', label: t('auth.passwordStrength.reqs.length') },
    { key: 'upper', label: t('auth.passwordStrength.reqs.upper') },
    { key: 'lower', label: t('auth.passwordStrength.reqs.lower') },
    { key: 'number', label: t('auth.passwordStrength.reqs.number') },
    { key: 'symbol', label: t('auth.passwordStrength.reqs.symbol') },
  ]

  return (
    <View style={strengthStyles.container}>
      {requirements.map(r => {
        const met = checks[r.key]
        return (
          <View key={r.key} style={strengthStyles.row}>
            <Text style={[strengthStyles.bullet, { color: met ? c.success : c.textMuted }]}>
              {met ? '✓' : '·'}
            </Text>
            <Text style={[strengthStyles.reqLabel, { color: met ? c.text : c.textMuted }]}>
              {r.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const strengthStyles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  bullet: {
    width: 18,
    fontSize: 13,
    fontFamily: theme.fonts.label,
  },
  reqLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.body,
  },
})

// ---------------------------------------------------------------------------
// Check circle — drawn with RN primitives to guarantee Android rendering
// ---------------------------------------------------------------------------

function CheckCircle({ color }: { color: string }) {
  return (
    <View style={[checkCircleStyles.circle, { borderColor: color }]}>
      <View style={[checkCircleStyles.stem, { borderColor: color }]} />
    </View>
  )
}

const checkCircleStyles = StyleSheet.create({
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  // L-shaped checkmark via rotated rectangle with bottom + right borders
  stem: {
    width: 14,
    height: 22,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    transform: [{ rotate: '45deg' }, { translateY: -3 }],
  },
})

// ---------------------------------------------------------------------------
// Email confirmation success view
// ---------------------------------------------------------------------------

function EmailConfirmSuccess({ email }: { email: string }) {
  const { t } = useTranslation()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]
  const router = useRouter()

  return (
    <View style={successStyles.container}>
      <CheckCircle color={c.success} />
      <Text style={[successStyles.title, { color: c.text }]}>
        {t('auth.emailConfirmTitle')}
      </Text>
      <Text style={[successStyles.body, { color: c.textSecondary }]}>
        {t('auth.emailConfirmBody', { email })}
      </Text>
      <Pressable
        style={successStyles.link}
        onPress={() => router.replace('/(auth)/login')}
      >
        <Text style={[successStyles.linkText, { color: c.primary }]}>
          {t('auth.backToSignIn')}
        </Text>
      </Pressable>
    </View>
  )
}

const successStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  title: {
    fontSize: 24,
    fontFamily: theme.fonts.heading,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  body: {
    fontSize: 15,
    fontFamily: theme.fonts.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  link: {
    paddingVertical: theme.spacing.md,
  },
  linkText: {
    fontSize: 14,
    fontFamily: theme.fonts.label,
  },
})

// ---------------------------------------------------------------------------
// Register screen
// ---------------------------------------------------------------------------

export default function RegisterScreen() {
  const { t } = useTranslation()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]
  const router = useRouter()
  const signUp = useAuthStore(s => s.signUp)

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [displayNameError, setDisplayNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [showSignInFallback, setShowSignInFallback] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  const validate = (): boolean => {
    let valid = true
    setDisplayNameError('')
    setEmailError('')
    setPasswordError('')
    setFormError('')
    setShowSignInFallback(false)

    if (!displayName.trim()) {
      setDisplayNameError(t('auth.errors.displayNameRequired'))
      valid = false
    }

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
    } else if (!isStrong(checkPassword(password))) {
      setPasswordError(t('auth.errors.passwordWeak'))
      valid = false
    }

    return valid
  }

  const handleSignUp = async () => {
    if (!validate()) return

    setIsLoading(true)
    try {
      await signUp(email.trim(), password, displayName.trim())
      setRegistered(true)
    } catch (err) {
      const message = (err as Error).message
      setFormError(mapError(message, t))
      setShowSignInFallback(isEmailInUseError(message))
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
            <Text style={[styles.tagline, { color: c.textSecondary }]}>
              {t('auth.registerTagline')}
            </Text>
          </View>

          {registered ? (
            <EmailConfirmSuccess email={email} />
          ) : (
            <>
              {/* Form */}
              <View style={styles.form}>
                <FormInput
                  label={t('auth.displayName')}
                  value={displayName}
                  onChangeText={text => { setDisplayName(text); setDisplayNameError('') }}
                  autoComplete="name"
                  returnKeyType="next"
                  error={displayNameError}
                />

                <FormInput
                  label={t('auth.email')}
                  value={email}
                  onChangeText={text => { setEmail(text); setEmailError(''); setShowSignInFallback(false) }}
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
                  showToggle
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                  error={passwordError}
                  hint={<PasswordStrengthIndicator password={password} />}
                />

                {formError ? (
                  <View style={styles.formErrorBlock}>
                    <Text style={[styles.formError, { color: c.error }]}>{formError}</Text>
                    {showSignInFallback ? (
                      <Pressable
                        onPress={() => router.replace('/(auth)/login')}
                        style={styles.signInFallback}
                      >
                        <Text style={[styles.link, { color: c.primary }]}>
                          {t('auth.signInInstead')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.buttonWrapper}>
                  <PrimaryButton
                    title={t('auth.createAccount')}
                    onPress={handleSignUp}
                    isLoading={isLoading}
                  />
                </View>
              </View>

              {/* Sign in link */}
              <View style={[styles.footer, { borderTopColor: c.border }]}>
                <Text style={[styles.footerText, { color: c.textSecondary }]}>
                  {t('auth.hasAccount')}
                </Text>
                <Pressable onPress={() => router.replace('/(auth)/login')}>
                  <Text style={[styles.link, { color: c.primary }]}>
                    {' '}{t('auth.signIn')}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
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
  tagline: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    marginTop: theme.spacing.sm,
  },
  form: {
    marginBottom: theme.spacing.lg,
  },
  formErrorBlock: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  formError: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
  },
  signInFallback: {
    paddingTop: theme.spacing.xs,
  },
  buttonWrapper: {
    marginTop: theme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: theme.spacing.lg,
  },
  footerText: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
  },
  link: {
    fontSize: 14,
    fontFamily: theme.fonts.label,
  },
})

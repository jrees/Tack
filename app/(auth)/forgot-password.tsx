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
// Reset-sent success view
// ---------------------------------------------------------------------------

function ResetSentSuccess({ email }: { email: string }) {
  const { t } = useTranslation()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]
  const router = useRouter()

  return (
    <View style={successStyles.container}>
      <CheckCircle color={c.success} />
      <Text style={[successStyles.title, { color: c.text }]}>
        {t('auth.resetSent')}
      </Text>
      <Text style={[successStyles.body, { color: c.textSecondary }]}>
        {t('auth.resetSentBody', { email })}
      </Text>
      <Pressable
        style={successStyles.link}
        onPress={() => router.replace('/(auth)/login')}
      >
        <Text style={[successStyles.linkText, { color: c.primary }]}>
          {t('auth.resetSentDone')}
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
// Forgot password screen
// ---------------------------------------------------------------------------

export default function ForgotPasswordScreen() {
  const { t } = useTranslation()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]
  const router = useRouter()
  const sendPasswordResetEmail = useAuthStore(s => s.sendPasswordResetEmail)

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const validate = (): boolean => {
    setEmailError('')
    setFormError('')

    if (!email.trim()) {
      setEmailError(t('auth.errors.emailRequired'))
      return false
    }

    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setEmailError(t('auth.errors.invalidEmail'))
      return false
    }

    return true
  }

  const handleReset = async () => {
    if (!validate()) return

    setIsLoading(true)
    try {
      await sendPasswordResetEmail(email.trim(), 'tack://update-password')
      setSent(true)
    } catch {
      setFormError(t('auth.errors.generic'))
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
              {t('auth.forgotTagline')}
            </Text>
          </View>

          {sent ? (
            <ResetSentSuccess email={email} />
          ) : (
            <>
              {/* Form */}
              <View style={styles.form}>
                <FormInput
                  label={t('auth.email')}
                  value={email}
                  onChangeText={text => { setEmail(text); setEmailError('') }}
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                  error={emailError}
                />

                {formError ? (
                  <Text style={[styles.formError, { color: c.error }]}>{formError}</Text>
                ) : null}

                <View style={styles.buttonWrapper}>
                  <PrimaryButton
                    title={t('auth.resetPassword')}
                    onPress={handleReset}
                    isLoading={isLoading}
                  />
                </View>
              </View>

              {/* Back to sign in */}
              <View style={[styles.footer, { borderTopColor: c.border }]}>
                <Text style={[styles.footerText, { color: c.textSecondary }]}>
                  {t('auth.rememberPassword')}
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
  formError: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
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

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme, type ColorScheme } from '@/lib/theme'
import { useAuthStore } from '@/stores/authStore'
import { FormInput } from '@/components/FormInput'
import { PrimaryButton } from '@/components/PrimaryButton'

// ---------------------------------------------------------------------------
// Password strength — same logic as register.tsx
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
// Update password screen
// ---------------------------------------------------------------------------

export default function UpdatePasswordScreen() {
  const { t } = useTranslation()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]
  const updatePassword = useAuthStore(s => s.updatePassword)

  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validate = (): boolean => {
    setPasswordError('')
    setFormError('')

    if (!password) {
      setPasswordError(t('auth.errors.passwordRequired'))
      return false
    }

    if (!isStrong(checkPassword(password))) {
      setPasswordError(t('auth.errors.passwordWeak'))
      return false
    }

    return true
  }

  const handleUpdate = async () => {
    if (!validate()) return

    setIsLoading(true)
    try {
      await updatePassword(password)
      // On success, updatePassword sets isPasswordRecovery = false.
      // The auth guard then fires and redirects to /(app) or /(household)/setup
      // automatically — no explicit navigation needed here.
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
              {t('auth.updatePasswordTagline')}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label={t('auth.newPassword')}
              value={password}
              onChangeText={text => { setPassword(text); setPasswordError(''); setFormError('') }}
              secureTextEntry
              showToggle
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleUpdate}
              error={passwordError}
              hint={<PasswordStrengthIndicator password={password} />}
            />

            {formError ? (
              <Text style={[styles.formError, { color: c.error }]}>{formError}</Text>
            ) : null}

            <View style={styles.buttonWrapper}>
              <PrimaryButton
                title={t('auth.updatePassword')}
                onPress={handleUpdate}
                isLoading={isLoading}
              />
            </View>
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
})

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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme, type ColorScheme } from '@/lib/theme'
import { useAuthStore } from '@/stores/authStore'
import { useHouseholdStore } from '@/stores/householdStore'
import { FormInput } from '@/components/FormInput'
import { PrimaryButton } from '@/components/PrimaryButton'

type Mode = 'create' | 'join'

export default function HouseholdSetupScreen() {
  const { t } = useTranslation()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]

  const userId = useAuthStore(s => s.user?.id)
  const { createHousehold, joinHousehold, isLoading } = useHouseholdStore()

  const [mode, setMode] = useState<Mode>('create')

  const [householdName, setHouseholdName] = useState('')
  const [nameError, setNameError] = useState('')

  const [inviteCode, setInviteCode] = useState('')
  const [codeError, setCodeError] = useState('')

  const [formError, setFormError] = useState('')

  const clearErrors = () => {
    setNameError('')
    setCodeError('')
    setFormError('')
  }

  const handleSubmit = async () => {
    if (!userId) return
    clearErrors()

    if (mode === 'create') {
      if (!householdName.trim()) {
        setNameError(t('household.errors.nameRequired'))
        return
      }
      try {
        await createHousehold(householdName.trim(), userId)
        // Auth guard in _layout.tsx will navigate to (app) once currentHousehold is set
      } catch {
        setFormError(t('common.error'))
      }
    } else {
      if (!inviteCode.trim()) {
        setCodeError(t('household.errors.codeRequired'))
        return
      }
      try {
        await joinHousehold(inviteCode.trim(), userId)
      } catch (err) {
        const msg = (err as Error).message
        if (msg === 'household_not_found') {
          setCodeError(t('household.errors.codeNotFound'))
        } else if (msg === 'already_member') {
          setCodeError(t('household.errors.alreadyMember'))
        } else {
          setFormError(t('common.error'))
        }
      }
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
              {t('household.setupTagline')}
            </Text>
          </View>

          {/* Mode toggle */}
          <View style={[styles.toggle, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Pressable
              style={[
                styles.toggleOption,
                mode === 'create' && { backgroundColor: c.primary },
              ]}
              onPress={() => { setMode('create'); clearErrors() }}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: mode === 'create' ? '#fff' : c.textSecondary },
                ]}
              >
                {t('household.create')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.toggleOption,
                mode === 'join' && { backgroundColor: c.primary },
              ]}
              onPress={() => { setMode('join'); clearErrors() }}
            >
              <Text
                style={[
                  styles.toggleText,
                  { color: mode === 'join' ? '#fff' : c.textSecondary },
                ]}
              >
                {t('household.join')}
              </Text>
            </Pressable>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'create' ? (
              <FormInput
                label={t('household.name')}
                value={householdName}
                onChangeText={text => { setHouseholdName(text); setNameError('') }}
                placeholder={t('household.namePlaceholder')}
                autoComplete="off"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                error={nameError}
              />
            ) : (
              <FormInput
                label={t('household.inviteCode')}
                value={inviteCode}
                onChangeText={text => {
                  setInviteCode(text.toUpperCase())
                  setCodeError('')
                }}
                autoCapitalize="characters"
                autoComplete="off"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                error={codeError}
              />
            )}

            {formError ? (
              <Text style={[styles.formError, { color: c.error }]}>{formError}</Text>
            ) : null}

            <View style={styles.buttonWrapper}>
              <PrimaryButton
                title={mode === 'create' ? t('household.create') : t('household.join')}
                onPress={handleSubmit}
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
  toggle: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: theme.spacing.xl,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: theme.spacing.sm + 2,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontFamily: theme.fonts.label,
  },
  form: {
    marginBottom: theme.spacing.lg,
  },
  formError: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    marginTop: theme.spacing.sm,
  },
  buttonWrapper: {
    marginTop: theme.spacing.sm,
  },
})

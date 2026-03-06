import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { theme, type ColorScheme } from '@/lib/theme'
import { useAuthStore } from '@/stores/authStore'
import { useHouseholdStore } from '@/stores/householdStore'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]

  const user = useAuthStore(s => s.user)
  const signOut = useAuthStore(s => s.signOut)
  const household = useHouseholdStore(s => s.currentHousehold)
  const members = useHouseholdStore(s => s.members)

  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  const profile = members.find(m => m.user_id === user?.id)?.profile

  const handleSignOut = async () => {
    setSigningOut(true)
    setSignOutError('')
    try {
      await signOut()
    } catch {
      setSignOutError(t('common.error'))
      setSigningOut(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading }]}>
          {t('settings.title')}
        </Text>
      </View>

      {/* Profile section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: c.textMuted, fontFamily: theme.fonts.label }]}>
          {t('settings.profile').toUpperCase()}
        </Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
              {t('settings.displayName')}
            </Text>
            <Text style={[styles.rowValue, { color: c.text, fontFamily: theme.fonts.label }]}>
              {profile?.display_name ?? user?.email ?? '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Household section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: c.textMuted, fontFamily: theme.fonts.label }]}>
          {t('settings.household').toUpperCase()}
        </Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
              {t('household.name')}
            </Text>
            <Text style={[styles.rowValue, { color: c.text, fontFamily: theme.fonts.label }]}>
              {household?.name ?? '—'}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/(app)/household')}
          >
            <Text style={[styles.rowLabel, { color: c.primary, fontFamily: theme.fonts.label }]}>
              {t('household.manage')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign out */}
      <View style={styles.section}>
        {!!signOutError && (
          <Text style={[styles.errorText, { color: c.error, fontFamily: theme.fonts.body }]}>
            {signOutError}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: c.error }]}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          {signingOut
            ? <ActivityIndicator color={c.error} />
            : <Text style={[styles.signOutText, { color: c.error, fontFamily: theme.fonts.label }]}>
                {t('auth.logOut')}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  title: { fontSize: 28 },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
  },
  card: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    minHeight: 48,
  },
  rowLabel: { fontSize: 15 },
  rowValue: { fontSize: 15 },
  divider: { height: 1 },
  signOutBtn: {
    height: 48,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { fontSize: 16 },
  errorText: { fontSize: 13, marginBottom: theme.spacing.sm },
})

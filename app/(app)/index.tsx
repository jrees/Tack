import { StyleSheet, Text, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { theme, type ColorScheme } from '@/lib/theme'
import { useHouseholdStore } from '@/stores/householdStore'

export default function DashboardScreen() {
  const { t } = useTranslation()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]
  const household = useHouseholdStore(s => s.currentHousehold)

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={styles.container}>
        <Text style={[styles.name, { color: c.primary }]}>Tack</Text>
        <Text style={[styles.household, { color: c.text }]}>{household?.name}</Text>
        <Text style={[styles.note, { color: c.textSecondary }]}>
          {t('common.loading')}
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  name: {
    fontSize: 52,
    fontFamily: theme.fonts.display,
    letterSpacing: -1,
  },
  household: {
    fontSize: 20,
    fontFamily: theme.fonts.heading,
    marginTop: theme.spacing.sm,
  },
  note: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    marginTop: theme.spacing.lg,
  },
})

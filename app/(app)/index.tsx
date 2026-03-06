import { StyleSheet, Text, View, TouchableOpacity, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { theme, type ColorScheme } from '@/lib/theme'
import { useHouseholdStore } from '@/stores/householdStore'

export default function DashboardScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]
  const household = useHouseholdStore(s => s.currentHousehold)

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={styles.container}>
        <Text style={[styles.name, { color: c.primary }]}>Tack</Text>
        <Text style={[styles.household, { color: c.text }]}>{household?.name}</Text>
        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => router.push('/(app)/household')}
        >
          <Text style={[styles.manageLink, { color: c.primary }]}>
            {t('household.manage')}
          </Text>
        </TouchableOpacity>
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
  manageButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  manageLink: {
    fontSize: 15,
    fontFamily: theme.fonts.label,
  },
})

import { View, Text, StyleSheet, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { theme, type ColorScheme } from '@/lib/theme'

export default function TasksScreen() {
  const { t } = useTranslation()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading }]}>
          {t('tasks.title')}
        </Text>
      </View>
      <View style={styles.center}>
        <Text style={[styles.emoji]}>🚧</Text>
        <Text style={[styles.body, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
          Tasks are coming in Phase 5
        </Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 48, marginBottom: theme.spacing.md },
  body: { fontSize: 15 },
})

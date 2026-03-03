import { ActivityIndicator, Pressable, StyleSheet, Text, useColorScheme } from 'react-native'
import { theme, type ColorScheme } from '@/lib/theme'

type Props = {
  title: string
  onPress: () => void
  isLoading?: boolean
  disabled?: boolean
}

export function PrimaryButton({ title, onPress, isLoading, disabled }: Props) {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]
  const isDisabled = isLoading || disabled

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: c.primary,
          opacity: pressed || isDisabled ? 0.65 : 1,
        },
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={c.surface} />
      ) : (
        <Text style={[styles.label, { color: c.surface }]}>{title}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontFamily: theme.fonts.label,
  },
})

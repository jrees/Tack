import { useState } from 'react'
import { StyleSheet, Text, TextInput, TextInputProps, View, useColorScheme } from 'react-native'
import { theme, type ColorScheme } from '@/lib/theme'

type Props = TextInputProps & {
  label: string
  error?: string
}

export function FormInput({ label, error, style, ...props }: Props) {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]
  const [focused, setFocused] = useState(false)

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: c.surface,
            borderColor: error ? c.error : focused ? c.primary : c.border,
            color: c.text,
          },
          style,
        ]}
        placeholderTextColor={c.textMuted}
        autoCapitalize="none"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error ? (
        <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontFamily: theme.fonts.label,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: theme.fonts.label,
  },
  errorText: {
    fontSize: 13,
    fontFamily: theme.fonts.label,
    marginTop: 4,
  },
})

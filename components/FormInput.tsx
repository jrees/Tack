import { useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, useColorScheme } from 'react-native'
import { useTranslation } from 'react-i18next'
import { theme, type ColorScheme } from '@/lib/theme'

type Props = TextInputProps & {
  label: string
  error?: string
  // When true, renders a Show/Hide toggle inside the input.
  // Only meaningful when secureTextEntry is also true.
  showToggle?: boolean
  // Optional content rendered below the error (before the container's bottom margin).
  // Use this to attach contextual UI — e.g. a password strength checklist — to a field
  // without reaching outside the component's spacing contract.
  hint?: ReactNode
}

export function FormInput({ label, error, showToggle, hint, secureTextEntry, style, ...props }: Props) {
  const { t } = useTranslation()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]
  const [focused, setFocused] = useState(false)
  const [showText, setShowText] = useState(false)

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      <View style={[
        styles.inputRow,
        {
          backgroundColor: c.surface,
          borderColor: error ? c.error : focused ? c.primary : c.border,
        },
      ]}>
        <TextInput
          style={[styles.input, { color: c.text }, style]}
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          secureTextEntry={showToggle ? !showText : secureTextEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {showToggle ? (
          <Pressable
            onPress={() => setShowText(v => !v)}
            style={styles.toggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.toggleText, { color: c.primary }]}>
              {showText ? t('auth.hidePassword') : t('auth.showPassword')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
      ) : null}
      {hint}
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.radius.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: theme.fonts.label,
  },
  toggle: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: theme.fonts.label,
  },
  errorText: {
    fontSize: 13,
    fontFamily: theme.fonts.body,
    marginTop: 4,
  },
})

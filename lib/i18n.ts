/**
 * i18n — i18next configuration with device locale detection.
 *
 * Usage:
 *   import '@/lib/i18n'           // side-effect import in _layout.tsx
 *
 *   import { useTranslation } from 'react-i18next'
 *   const { t } = useTranslation()
 *   t('common.save')              // → "Save"
 *   t('tasks.count', { count: 3 }) // → "3 tasks"
 *
 * To add a language: create locales/<tag>.json matching the en.json structure,
 * then add it to the `resources` object below.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'

import en from '@/locales/en.json'

// ---------------------------------------------------------------------------
// Resources
// Add new languages here. The key must match a BCP 47 language tag prefix
// (e.g. 'en' matches 'en-GB', 'en-US', etc. via i18next fallback).
// ---------------------------------------------------------------------------

const resources = {
  en: { translation: en },
} as const

// ---------------------------------------------------------------------------
// Locale detection
// expo-localization returns the device's preferred locales in priority order.
// We take the first one and let i18next fall back to 'en' if we don't have
// a matching resource. This is synchronous — no async loading required.
// ---------------------------------------------------------------------------

const deviceLocale = Localization.getLocales()[0]?.languageTag ?? 'en'

// ---------------------------------------------------------------------------
// Initialise
// ---------------------------------------------------------------------------

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: deviceLocale,
    fallbackLng: 'en',

    // i18next v4 plural format (required for React Native)
    compatibilityJSON: 'v4',

    interpolation: {
      // React already escapes output — no need for i18next to double-escape
      escapeValue: false,
    },
  })

export default i18n

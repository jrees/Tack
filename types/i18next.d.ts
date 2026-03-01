/**
 * i18next TypeScript augmentation.
 *
 * Extends the i18next `CustomTypeOptions` interface so that `t()` is
 * fully typed against our translation keys. TypeScript will error if you
 * call t() with a key that doesn't exist in en.json, and will autocomplete
 * valid key paths in your editor.
 *
 * This is a declaration file — it has no runtime effect.
 *
 * Reference: https://www.i18next.com/overview/typescript
 */

import en from '@/locales/en.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: typeof en
    }
  }
}

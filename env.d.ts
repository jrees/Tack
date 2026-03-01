// Type declarations for EXPO_PUBLIC_ environment variables.
// Expo inlines these at build time from your .env file.

declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_SUPABASE_URL: string
    readonly EXPO_PUBLIC_SUPABASE_ANON_KEY: string
  }
}

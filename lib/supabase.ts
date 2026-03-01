import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import type { Database } from '@/types/database'

// ---------------------------------------------------------------------------
// SecureStore adapter
// ---------------------------------------------------------------------------
// expo-secure-store enforces a 2 048-byte limit per value.  Supabase JWT
// tokens can exceed that, so we transparently chunk large values.
// ---------------------------------------------------------------------------

const CHUNK_SIZE = 2048

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const chunkCountRaw = await SecureStore.getItemAsync(`${key}_chunks`)
    if (chunkCountRaw !== null) {
      const chunkCount = parseInt(chunkCountRaw, 10)
      const chunks: string[] = []
      for (let i = 0; i < chunkCount; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`)
        if (chunk === null) return null
        chunks.push(chunk)
      }
      return chunks.join('')
    }
    return SecureStore.getItemAsync(key)
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length > CHUNK_SIZE) {
      const chunks: string[] = []
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE))
      }
      await SecureStore.setItemAsync(`${key}_chunks`, String(chunks.length))
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i])
      }
    } else {
      await SecureStore.setItemAsync(key, value)
    }
  },

  removeItem: async (key: string): Promise<void> => {
    const chunkCountRaw = await SecureStore.getItemAsync(`${key}_chunks`)
    if (chunkCountRaw !== null) {
      const chunkCount = parseInt(chunkCountRaw, 10)
      await SecureStore.deleteItemAsync(`${key}_chunks`)
      for (let i = 0; i < chunkCount; i++) {
        await SecureStore.deleteItemAsync(`${key}_chunk_${i}`)
      }
    } else {
      await SecureStore.deleteItemAsync(key)
    }
  },
}

// ---------------------------------------------------------------------------
// Supabase client singleton
// ---------------------------------------------------------------------------
// This is the ONLY file that imports from @supabase/supabase-js.
// All stores and lib files import `supabase` from here.
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

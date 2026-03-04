import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Household, HouseholdMember, Profile } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MemberWithProfile = HouseholdMember & {
  profile: Pick<Profile, 'display_name' | 'avatar_url'>
}

type HouseholdState = {
  currentHousehold: Household | null
  members: MemberWithProfile[]
  isLoading: boolean
}

type HouseholdActions = {
  fetchHousehold: (userId: string) => Promise<void>
  createHousehold: (name: string, userId: string) => Promise<void>
  joinHousehold: (code: string, userId: string) => Promise<void>
  fetchMembers: (householdId: string) => Promise<void>
  reset: () => void
}

type HouseholdStore = HouseholdState & HouseholdActions

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateInviteCode(): string {
  // 6-character uppercase alphanumeric, no ambiguous chars (0/O, 1/I/L)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useHouseholdStore = create<HouseholdStore>((set, get) => ({
  // ---- initial state ----
  // Start loading=true so the auth guard waits for the first fetchHousehold
  // to complete before deciding which route group to show. reset() sets it
  // back to false (called when the user has no session, so no fetch needed).
  currentHousehold: null,
  members: [],
  isLoading: true,

  // ---- actions ----

  /**
   * Fetch the household the user belongs to (if any).
   * Sets currentHousehold to null if they haven't joined one yet.
   */
  fetchHousehold: async (userId) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id, households(id, name, created_at, invite_code)')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        set({ currentHousehold: null })
        return
      }

      // `households` is the joined row — Supabase returns it as an object
      const household = data.households as unknown as Household
      set({ currentHousehold: household })
      await get().fetchMembers(household.id)
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * Create a new household and add the creator as admin.
   * Uses a transaction-like pattern: create household first, then add member.
   * If the member insert fails we surface the error; the orphan household is
   * harmless and won't be visible to the user.
   */
  createHousehold: async (name, userId) => {
    set({ isLoading: true })
    try {
      const inviteCode = generateInviteCode()

      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({ name: name.trim(), invite_code: inviteCode })
        .select()
        .single()

      if (householdError) throw householdError

      const { error: memberError } = await supabase
        .from('household_members')
        .insert({ household_id: household.id, user_id: userId, role: 'admin' })

      if (memberError) throw memberError

      set({ currentHousehold: household })
      await get().fetchMembers(household.id)
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * Join an existing household via invite code.
   * Calls the SECURITY DEFINER RPC to look up the household (bypasses RLS),
   * then inserts the caller as a member (covered by the members INSERT policy).
   * Throws a typed error string so the screen can show the right message.
   */
  joinHousehold: async (code, userId) => {
    set({ isLoading: true })
    try {
      const { data: rows, error: rpcError } = await supabase
        .rpc('find_household_by_invite_code', { code: code.toUpperCase().trim() })

      if (rpcError) throw rpcError
      if (!rows || rows.length === 0) throw new Error('household_not_found')

      const { id: householdId } = rows[0]

      // Check the user isn't already a member
      const { count } = await supabase
        .from('household_members')
        .select('id', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .eq('user_id', userId)

      if ((count ?? 0) > 0) throw new Error('already_member')

      const { error: memberError } = await supabase
        .from('household_members')
        .insert({ household_id: householdId, user_id: userId, role: 'member' })

      if (memberError) throw memberError

      // Fetch the full household row now that we're a member (RLS allows it)
      const { data: household, error: fetchError } = await supabase
        .from('households')
        .select()
        .eq('id', householdId)
        .single()

      if (fetchError) throw fetchError

      set({ currentHousehold: household })
      await get().fetchMembers(household.id)
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * Fetch all members of a household, joined with their profile display names.
   */
  fetchMembers: async (householdId) => {
    const { data, error } = await supabase
      .from('household_members')
      .select('*, profiles(display_name, avatar_url)')
      .eq('household_id', householdId)

    if (error) throw error

    const members: MemberWithProfile[] = (data ?? []).map(row => ({
      id: row.id,
      household_id: row.household_id,
      user_id: row.user_id,
      role: row.role as HouseholdMember['role'],
      joined_at: row.joined_at,
      profile: {
        display_name: (row.profiles as any)?.display_name ?? null,
        avatar_url: (row.profiles as any)?.avatar_url ?? null,
      },
    }))

    set({ members })
  },

  /**
   * Clear household state on sign-out.
   */
  reset: () => set({ currentHousehold: null, members: [], isLoading: false }),
}))

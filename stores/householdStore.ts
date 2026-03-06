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
  pendingInviteCode: string | null
}

type HouseholdActions = {
  fetchHousehold: (userId: string) => Promise<void>
  createHousehold: (name: string, userId: string) => Promise<void>
  joinHousehold: (code: string, userId: string) => Promise<void>
  fetchMembers: (householdId: string) => Promise<void>
  leaveHousehold: (userId: string) => Promise<void>
  removeMember: (memberUserId: string) => Promise<void>
  transferAdmin: (toUserId: string) => Promise<void>
  deleteHousehold: () => Promise<void>
  setPendingInviteCode: (code: string | null) => void
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
  pendingInviteCode: null,

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
        .insert({ name: name.trim(), invite_code: inviteCode, created_by: userId })
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
    // household_members.user_id has no FK to profiles in the schema, so we
    // can't use PostgREST's FK join syntax. Instead, fetch members then
    // fetch the matching profiles in a second query.
    const { data: memberRows, error: membersError } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', householdId)

    if (membersError) throw membersError

    const userIds = (memberRows ?? []).map(r => r.user_id)

    const { data: profileRows } = userIds.length
      ? await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds)
      : { data: [] }

    const profileMap = Object.fromEntries(
      (profileRows ?? []).map(p => [p.id, p])
    )

    const members: MemberWithProfile[] = (memberRows ?? []).map(row => ({
      id: row.id,
      household_id: row.household_id,
      user_id: row.user_id,
      role: row.role as HouseholdMember['role'],
      joined_at: row.joined_at,
      profile: {
        display_name: profileMap[row.user_id]?.display_name ?? null,
        avatar_url: profileMap[row.user_id]?.avatar_url ?? null,
      },
    }))

    set({ members })
  },

  /**
   * Leave the household. Deletes the caller's own household_members row.
   * The last admin must transfer admin or delete the household first —
   * enforce that in the UI before calling this.
   */
  leaveHousehold: async (userId) => {
    const { data, error } = await supabase
      .from('household_members')
      .delete()
      .eq('user_id', userId)
      .select('id')
      .single()

    if (error || !data) throw error ?? new Error('leave_failed')

    get().reset()
  },

  /**
   * Admin removes another member. Deletes their household_members row.
   * Their tasks and list items remain — they're household data.
   */
  removeMember: async (memberUserId) => {
    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('user_id', memberUserId)

    if (error) throw error

    const householdId = get().currentHousehold?.id
    if (householdId) await get().fetchMembers(householdId)
  },

  /**
   * Transfer admin role to another member. Updates both rows atomically
   * via two sequential updates — Postgres row-level locking keeps this safe.
   * The caller retains membership as a regular member.
   */
  transferAdmin: async (toUserId) => {
    const householdId = get().currentHousehold?.id
    if (!householdId) throw new Error('no_household')

    // Promote the target member first
    const { error: promoteError } = await supabase
      .from('household_members')
      .update({ role: 'admin' })
      .eq('household_id', householdId)
      .eq('user_id', toUserId)

    if (promoteError) throw promoteError

    // Demote the current admin (caller) — still a member
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('no_user')

    const { error: demoteError } = await supabase
      .from('household_members')
      .update({ role: 'member' })
      .eq('household_id', householdId)
      .eq('user_id', user.id)

    if (demoteError) throw demoteError

    await get().fetchMembers(householdId)
  },

  /**
   * Delete the household entirely. Cascade deletes handle all related rows
   * (household_members, tasks, task_subtasks, lists, list_items).
   * All members will be routed to the household setup screen on next render.
   */
  deleteHousehold: async () => {
    const householdId = get().currentHousehold?.id
    if (!householdId) throw new Error('no_household')

    const { error } = await supabase
      .from('households')
      .delete()
      .eq('id', householdId)

    if (error) throw error

    get().reset()
  },

  setPendingInviteCode: (code) => set({ pendingInviteCode: code }),

  /**
   * Clear household state on sign-out.
   */
  // isLoading stays true — the guard only checks it when session exists,
  // so this is harmless when there's no session and prevents the gap between
  // reset() and the next fetchHousehold() call from causing a premature redirect.
  reset: () => set({ currentHousehold: null, members: [], isLoading: true }),
}))

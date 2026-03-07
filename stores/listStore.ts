import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { List, ListItem } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ListState = {
  lists: List[]
  items: Record<string, ListItem[]>   // keyed by list_id
  isLoading: boolean
}

type ListActions = {
  fetchLists: (householdId: string) => Promise<void>
  createList: (fields: { household_id: string; created_by: string; title: string; category: List['category'] }) => Promise<List>
  renameList: (id: string, title: string) => Promise<void>
  pinList: (id: string, pinned: boolean) => Promise<void>
  deleteList: (id: string) => Promise<void>
  clearChecked: (listId: string) => Promise<void>
  duplicateList: (listId: string, uncheckAll: boolean) => Promise<List>
  fetchItems: (listId: string) => Promise<void>
  addItem: (fields: { list_id: string; added_by: string; title: string }) => Promise<void>
  toggleItem: (item: ListItem, userId: string) => Promise<void>
  deleteItem: (id: string, listId: string) => Promise<void>
  subscribeToLists: (householdId: string) => () => void
  subscribeToItems: (listId: string) => () => void
  reset: () => void
}

type ListStore = ListState & ListActions

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sort lists: pinned first, then by created_at descending. */
function sortLists(lists: List[]): List[] {
  return [...lists].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    return b.created_at.localeCompare(a.created_at)
  })
}

/** Sort items: unchecked first (preserving sort_order), then checked. */
function sortItems(items: ListItem[]): ListItem[] {
  const unchecked = [...items].filter(i => !i.is_checked).sort((a, b) => a.sort_order - b.sort_order)
  const checked = [...items].filter(i => i.is_checked).sort((a, b) => a.sort_order - b.sort_order)
  return [...unchecked, ...checked]
}

function mergeItem(existing: ListItem[], updated: ListItem): ListItem[] {
  const idx = existing.findIndex(i => i.id === updated.id)
  if (idx === -1) return sortItems([...existing, updated])
  const next = [...existing]
  next[idx] = updated
  return sortItems(next)
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useListStore = create<ListStore>((set, get) => ({
  // ---- initial state ----
  lists: [],
  items: {},
  isLoading: false,

  // ---- actions ----

  /**
   * Fetch active (non-archived) lists for a household.
   * Pinned lists come first, then sorted by created_at descending.
   */
  fetchLists: async (householdId) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('household_id', householdId)
        .eq('is_archived', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ lists: sortLists(data ?? []) })
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * Create a new list and prepend it to the store.
   * Returns the created list so the caller can navigate to it.
   */
  createList: async (fields) => {
    const { data, error } = await supabase
      .from('lists')
      .insert({ ...fields, is_archived: false, is_pinned: false })
      .select()
      .single()

    if (error) throw error

    set(state => ({ lists: sortLists([data, ...state.lists]) }))
    return data
  },

  /**
   * Rename a list. Optimistic update — reverts on error.
   */
  renameList: async (id, title) => {
    const prev = get().lists
    set(state => ({
      lists: state.lists.map(l => l.id === id ? { ...l, title } : l),
    }))
    try {
      const { error } = await supabase
        .from('lists')
        .update({ title })
        .eq('id', id)

      if (error) throw error
    } catch (err) {
      set({ lists: prev })
      throw err
    }
  },

  /**
   * Pin or unpin a list. Optimistic update — reverts on error.
   */
  pinList: async (id, pinned) => {
    const prev = get().lists
    set(state => ({
      lists: sortLists(state.lists.map(l => l.id === id ? { ...l, is_pinned: pinned } : l)),
    }))
    try {
      const { error } = await supabase
        .from('lists')
        .update({ is_pinned: pinned })
        .eq('id', id)

      if (error) throw error
    } catch (err) {
      set({ lists: prev })
      throw err
    }
  },

  /**
   * Delete a list and remove it and its items from the store.
   */
  deleteList: async (id) => {
    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', id)

    if (error) throw error

    set(state => {
      const { [id]: _removed, ...rest } = state.items
      return {
        lists: state.lists.filter(l => l.id !== id),
        items: rest,
      }
    })
  },

  /**
   * Delete all checked items from a list.
   */
  clearChecked: async (listId) => {
    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('list_id', listId)
      .eq('is_checked', true)

    if (error) throw error

    set(state => ({
      items: {
        ...state.items,
        [listId]: (state.items[listId] ?? []).filter(i => !i.is_checked),
      },
    }))
  },

  /**
   * Duplicate a list and all its items.
   * If uncheckAll is true, all copied items will be unchecked.
   * The new list is titled "<original title> (copy)".
   */
  duplicateList: async (listId, uncheckAll) => {
    const sourceList = get().lists.find(l => l.id === listId)
    if (!sourceList) throw new Error('List not found')

    const { data: newList, error: listError } = await supabase
      .from('lists')
      .insert({
        household_id: sourceList.household_id,
        created_by: sourceList.created_by,
        title: `${sourceList.title} (copy)`,
        category: sourceList.category,
        is_archived: false,
        is_pinned: false,
      })
      .select()
      .single()

    if (listError) throw listError

    // Fetch source items directly — they may not be loaded in the store yet.
    const { data: sourceItems, error: itemsReadError } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', listId)
      .order('sort_order', { ascending: true })

    if (itemsReadError) throw itemsReadError

    if (sourceItems && sourceItems.length > 0) {
      const copies = sourceItems.map(item => ({
        list_id: newList.id,
        added_by: item.added_by,
        title: item.title,
        sort_order: item.sort_order,
        is_checked: uncheckAll ? false : item.is_checked,
        checked_by: uncheckAll ? null : item.checked_by,
        checked_at: uncheckAll ? null : item.checked_at,
      }))

      const { error: insertError } = await supabase
        .from('list_items')
        .insert(copies)

      if (insertError) throw insertError
    }

    set(state => ({ lists: sortLists([newList, ...state.lists]) }))
    return newList
  },

  /**
   * Fetch all items for a list. Unchecked items shown first.
   */
  fetchItems: async (listId) => {
    const { data, error } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', listId)
      .order('sort_order', { ascending: true })

    if (error) throw error
    set(state => ({
      items: { ...state.items, [listId]: sortItems(data ?? []) },
    }))
  },

  /**
   * Add an item to a list. Sort order is one higher than the current max.
   */
  addItem: async (fields) => {
    const current = get().items[fields.list_id] ?? []
    const maxOrder = current.reduce((max, i) => Math.max(max, i.sort_order), -1)

    const { data, error } = await supabase
      .from('list_items')
      .insert({ ...fields, sort_order: maxOrder + 1, is_checked: false })
      .select()
      .single()

    if (error) throw error

    set(state => ({
      items: {
        ...state.items,
        [fields.list_id]: sortItems([...(state.items[fields.list_id] ?? []), data]),
      },
    }))
  },

  /**
   * Toggle an item's checked state. Optimistic update — reverts on error.
   * Sets checked_by / checked_at on check; clears them on uncheck.
   */
  toggleItem: async (item, userId) => {
    const listId = item.list_id
    const prev = get().items[listId] ?? []
    const now = new Date().toISOString()
    const optimistic: ListItem = item.is_checked
      ? { ...item, is_checked: false, checked_by: null, checked_at: null }
      : { ...item, is_checked: true, checked_by: userId, checked_at: now }

    set(state => ({
      items: { ...state.items, [listId]: mergeItem(state.items[listId] ?? [], optimistic) },
    }))

    try {
      const update = optimistic.is_checked
        ? { is_checked: true, checked_by: userId, checked_at: now }
        : { is_checked: false, checked_by: null, checked_at: null }

      const { error } = await supabase
        .from('list_items')
        .update(update)
        .eq('id', item.id)

      if (error) throw error
    } catch (err) {
      // Revert
      set(state => ({
        items: { ...state.items, [listId]: mergeItem(state.items[listId] ?? [], item) },
      }))
      throw err
    }
  },

  /**
   * Delete an item from a list.
   */
  deleteItem: async (id, listId) => {
    const { error } = await supabase
      .from('list_items')
      .delete()
      .eq('id', id)

    if (error) throw error

    set(state => ({
      items: {
        ...state.items,
        [listId]: (state.items[listId] ?? []).filter(i => i.id !== id),
      },
    }))
  },

  /**
   * Subscribe to real-time changes on the lists table for a household.
   * Returns an unsubscribe function to call on unmount.
   *
   * Zustand ≈ a singleton service; subscriptions live here so any component
   * that reads lists stays in sync without each screen managing its own channel.
   */
  subscribeToLists: (householdId) => {
    let channel: RealtimeChannel | null = null

    channel = supabase
      .channel(`lists:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists',
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as List
            if (!inserted.is_archived) {
              set(state => ({
                lists: sortLists([
                  ...state.lists.filter(l => l.id !== inserted.id),
                  inserted,
                ]),
              }))
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as List
            set(state => ({
              lists: updated.is_archived
                ? state.lists.filter(l => l.id !== updated.id)
                : sortLists(state.lists.map(l => l.id === updated.id ? updated : l)),
            }))
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            set(state => ({
              lists: state.lists.filter(l => l.id !== deleted.id),
            }))
          }
        }
      )
      .subscribe()

    return () => {
      channel?.unsubscribe()
    }
  },

  /**
   * Subscribe to real-time changes on list_items for a specific list.
   * Returns an unsubscribe function to call on unmount.
   */
  subscribeToItems: (listId) => {
    let channel: RealtimeChannel | null = null

    channel = supabase
      .channel(`list_items:${listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'list_items',
          filter: `list_id=eq.${listId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as ListItem
            set(state => ({
              items: {
                ...state.items,
                [listId]: sortItems([
                  ...(state.items[listId] ?? []).filter(i => i.id !== inserted.id),
                  inserted,
                ]),
              },
            }))
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ListItem
            set(state => ({
              items: {
                ...state.items,
                [listId]: mergeItem(state.items[listId] ?? [], updated),
              },
            }))
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            set(state => ({
              items: {
                ...state.items,
                [listId]: (state.items[listId] ?? []).filter(i => i.id !== deleted.id),
              },
            }))
          }
        }
      )
      .subscribe()

    return () => {
      channel?.unsubscribe()
    }
  },

  /**
   * Clear all list state on sign-out.
   */
  reset: () => set({ lists: [], items: {}, isLoading: false }),
}))

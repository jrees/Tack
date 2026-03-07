import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Task, TaskSubtask, RecurrenceRule, Database } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

type TaskUpdate = Database['public']['Tables']['tasks']['Update']

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskState = {
  tasks: Task[]
  subtasks: Record<string, TaskSubtask[]>   // keyed by task_id
  isLoading: boolean
}

type TaskActions = {
  fetchTasks: (householdId: string) => Promise<void>
  createTask: (fields: {
    household_id: string
    created_by: string
    title: string
    description?: string | null
    assigned_to?: string | null
    status?: Task['status']
    due_date?: string | null
    is_recurring?: boolean
    recurrence_rule?: RecurrenceRule | null
    category?: Task['category']
  }) => Promise<Task>
  updateTask: (id: string, fields: TaskUpdate) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  subscribeToTasks: (householdId: string) => () => void

  fetchSubtasksForHousehold: (householdId: string) => Promise<void>
  addSubtask: (fields: { task_id: string; household_id: string; title: string }) => Promise<void>
  toggleSubtask: (subtask: TaskSubtask) => Promise<void>
  deleteSubtask: (id: string, taskId: string) => Promise<void>
  subscribeToSubtasks: (householdId: string) => () => void

  reset: () => void
}

type TaskStore = TaskState & TaskActions

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sort tasks: todo first, then in_progress, then done; within each group by created_at descending. */
function sortTasks(tasks: Task[]): Task[] {
  const order: Record<Task['status'], number> = { todo: 0, in_progress: 1, done: 2 }
  return [...tasks].sort((a, b) => {
    const statusDiff = order[a.status] - order[b.status]
    if (statusDiff !== 0) return statusDiff
    return b.created_at.localeCompare(a.created_at)
  })
}

function sortSubtasks(items: TaskSubtask[]): TaskSubtask[] {
  return [...items].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

function mergeSubtask(existing: TaskSubtask[], updated: TaskSubtask): TaskSubtask[] {
  const idx = existing.findIndex(s => s.id === updated.id)
  if (idx === -1) return sortSubtasks([...existing, updated])
  const next = [...existing]
  next[idx] = updated
  return next
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useTaskStore = create<TaskStore>((set, get) => ({
  // ---- initial state ----
  tasks: [],
  subtasks: {},
  isLoading: false,

  // ---- task actions ----

  /**
   * Fetch all tasks for a household, sorted by status then created_at.
   */
  fetchTasks: async (householdId) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ tasks: sortTasks(data ?? []) })
    } finally {
      set({ isLoading: false })
    }
  },

  /**
   * Create a new task. Returns the created task so the caller can open it.
   */
  createTask: async (fields) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...fields,
        status: fields.status ?? 'todo',
        is_recurring: fields.is_recurring ?? false,
      })
      .select()
      .single()

    if (error) throw error

    set(state => ({ tasks: sortTasks([data, ...state.tasks]) }))
    return data
  },

  /**
   * Update task fields. Auto-sets completed_at when status transitions to 'done'.
   * Optimistic update — reverts on error.
   */
  updateTask: async (id, fields) => {
    const prev = get().tasks
    const existing = prev.find(t => t.id === id)
    if (!existing) return

    // Auto-set completed_at on done transition; clear it on un-done
    const updatedFields: TaskUpdate = { ...fields }
    if (fields.status === 'done' && existing.status !== 'done') {
      updatedFields.completed_at = new Date().toISOString()
    } else if (fields.status && fields.status !== 'done' && existing.status === 'done') {
      updatedFields.completed_at = null
    }

    const optimistic: Task = { ...existing, ...updatedFields }
    set(state => ({
      tasks: sortTasks(state.tasks.map(t => t.id === id ? optimistic : t)),
    }))

    try {
      const { error } = await supabase
        .from('tasks')
        .update(updatedFields)
        .eq('id', id)

      if (error) throw error
    } catch (err) {
      set({ tasks: prev })
      throw err
    }
  },

  /**
   * Delete a task and remove it from the store (subtasks are cascade-deleted in DB).
   */
  deleteTask: async (id) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) throw error

    set(state => {
      const { [id]: _removed, ...rest } = state.subtasks
      return {
        tasks: state.tasks.filter(t => t.id !== id),
        subtasks: rest,
      }
    })
  },

  /**
   * Subscribe to real-time changes on the tasks table for a household.
   * Returns an unsubscribe function.
   *
   * When a recurring task is marked done, the DB trigger inserts a new task row —
   * the INSERT event below automatically picks that up and adds it to the store.
   */
  subscribeToTasks: (householdId) => {
    let channel: RealtimeChannel | null = null

    channel = supabase
      .channel(`tasks:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as Task
            set(state => ({
              tasks: sortTasks([
                ...state.tasks.filter(t => t.id !== inserted.id),
                inserted,
              ]),
            }))
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Task
            set(state => ({
              tasks: sortTasks(state.tasks.map(t => t.id === updated.id ? updated : t)),
            }))
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            set(state => ({
              tasks: state.tasks.filter(t => t.id !== deleted.id),
            }))
          }
        }
      )
      .subscribe()

    return () => {
      channel?.unsubscribe()
    }
  },

  // ---- subtask actions ----

  /**
   * Fetch all subtasks for a household, keyed by task_id.
   */
  fetchSubtasksForHousehold: async (householdId) => {
    const { data, error } = await supabase
      .from('task_subtasks')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Group by task_id
    const grouped: Record<string, TaskSubtask[]> = {}
    for (const subtask of data ?? []) {
      if (!grouped[subtask.task_id]) grouped[subtask.task_id] = []
      grouped[subtask.task_id].push(subtask)
    }
    set({ subtasks: grouped })
  },

  /**
   * Add a subtask to a task.
   */
  addSubtask: async (fields) => {
    const { data, error } = await supabase
      .from('task_subtasks')
      .insert({ ...fields, is_done: false })
      .select()
      .single()

    if (error) throw error

    set(state => ({
      subtasks: {
        ...state.subtasks,
        [fields.task_id]: sortSubtasks([
          ...(state.subtasks[fields.task_id] ?? []),
          data,
        ]),
      },
    }))
  },

  /**
   * Toggle a subtask's done state. Optimistic update — reverts on error.
   */
  toggleSubtask: async (subtask) => {
    const taskId = subtask.task_id
    const prev = get().subtasks[taskId] ?? []
    const optimistic: TaskSubtask = { ...subtask, is_done: !subtask.is_done }

    set(state => ({
      subtasks: {
        ...state.subtasks,
        [taskId]: mergeSubtask(state.subtasks[taskId] ?? [], optimistic),
      },
    }))

    try {
      const { error } = await supabase
        .from('task_subtasks')
        .update({ is_done: !subtask.is_done })
        .eq('id', subtask.id)

      if (error) throw error
    } catch (err) {
      set(state => ({
        subtasks: {
          ...state.subtasks,
          [taskId]: mergeSubtask(state.subtasks[taskId] ?? [], subtask),
        },
      }))
      throw err
    }
  },

  /**
   * Delete a subtask.
   */
  deleteSubtask: async (id, taskId) => {
    const { error } = await supabase
      .from('task_subtasks')
      .delete()
      .eq('id', id)

    if (error) throw error

    set(state => ({
      subtasks: {
        ...state.subtasks,
        [taskId]: (state.subtasks[taskId] ?? []).filter(s => s.id !== id),
      },
    }))
  },

  /**
   * Subscribe to real-time changes on task_subtasks for a household.
   * Returns an unsubscribe function.
   */
  subscribeToSubtasks: (householdId) => {
    let channel: RealtimeChannel | null = null

    channel = supabase
      .channel(`task_subtasks:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_subtasks',
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as TaskSubtask
            set(state => ({
              subtasks: {
                ...state.subtasks,
                [inserted.task_id]: sortSubtasks([
                  ...(state.subtasks[inserted.task_id] ?? []).filter(s => s.id !== inserted.id),
                  inserted,
                ]),
              },
            }))
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as TaskSubtask
            set(state => ({
              subtasks: {
                ...state.subtasks,
                [updated.task_id]: mergeSubtask(state.subtasks[updated.task_id] ?? [], updated),
              },
            }))
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string; task_id: string }
            set(state => ({
              subtasks: {
                ...state.subtasks,
                [deleted.task_id]: (state.subtasks[deleted.task_id] ?? []).filter(s => s.id !== deleted.id),
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
   * Clear all task state on sign-out.
   */
  reset: () => set({ tasks: [], subtasks: {}, isLoading: false }),
}))

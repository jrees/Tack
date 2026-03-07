import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { theme, type ColorScheme } from '@/lib/theme'
import { useTaskStore } from '@/stores/taskStore'
import { useAuthStore } from '@/stores/authStore'
import { useHouseholdStore } from '@/stores/householdStore'
import type { Task, TaskSubtask, RecurrenceRule, TaskCategory } from '@/types/database'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RECURRENCE_RULES: Array<{ value: RecurrenceRule | null; labelKey: string }> = [
  { value: null, labelKey: 'tasks.recurrenceRules.none' },
  { value: 'daily', labelKey: 'tasks.recurrenceRules.daily' },
  { value: 'weekly', labelKey: 'tasks.recurrenceRules.weekly' },
  { value: 'monthly', labelKey: 'tasks.recurrenceRules.monthly' },
  { value: 'yearly', labelKey: 'tasks.recurrenceRules.yearly' },
]

const TASK_CATEGORIES: Array<{ value: TaskCategory; labelKey: string }> = [
  { value: 'general', labelKey: 'tasks.categories.general' },
  { value: 'home', labelKey: 'tasks.categories.home' },
  { value: 'shopping', labelKey: 'tasks.categories.shopping' },
  { value: 'health', labelKey: 'tasks.categories.health' },
  { value: 'finance', labelKey: 'tasks.categories.finance' },
  { value: 'other', labelKey: 'tasks.categories.other' },
]

const TASK_STATUSES: Array<{ value: Task['status']; labelKey: string }> = [
  { value: 'todo', labelKey: 'tasks.statuses.todo' },
  { value: 'in_progress', labelKey: 'tasks.statuses.inProgress' },
  { value: 'done', labelKey: 'tasks.statuses.done' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a due_date ISO string for display.
 * Returns: "Today", "Tomorrow", "Mon 21" (within 7 days), or "21 Mar"
 * No overdue shaming — past dates are displayed the same way as future ones.
 */
function formatDueDate(iso: string, t: (key: string) => string): string {
  const due = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (due.getTime() === today.getTime()) return t('tasks.today')
  if (due.getTime() === tomorrow.getTime()) return t('tasks.tomorrow')

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const diffMs = due.getTime() - today.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffDays >= 0 && diffDays < 7) {
    return `${dayNames[due.getDay()]} ${due.getDate()}`
  }
  return `${due.getDate()} ${monthNames[due.getMonth()]}`
}

function statusDotColor(status: Task['status'], c: typeof theme.colors.light | typeof theme.colors.dark): string {
  if (status === 'done') return c.success
  if (status === 'in_progress') return c.primary
  return c.border
}

// ---------------------------------------------------------------------------
// SelectPillRow — generic horizontal single-select chip strip
// ---------------------------------------------------------------------------

type SelectPillRowProps<T extends string> = {
  options: Array<{ value: T | null; labelKey: string }>
  value: T | null
  onChange: (v: T | null) => void
  scheme: ColorScheme
}

function SelectPillRow<T extends string>({ options, value, onChange, scheme }: SelectPillRowProps<T>) {
  const { t } = useTranslation()
  const c = theme.colors[scheme]

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
      {options.map(opt => {
        const selected = opt.value === value
        return (
          <TouchableOpacity
            key={String(opt.value ?? '__null__')}
            style={[
              styles.pill,
              {
                borderColor: selected ? c.primary : c.border,
                backgroundColor: selected ? c.primaryLight : c.surface,
              },
            ]}
            onPress={() => onChange(opt.value as T | null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, { color: selected ? c.primary : c.textSecondary, fontFamily: theme.fonts.label }]}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(t as (key: string) => string)(opt.labelKey)}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------

function SectionHeader({ label, count, scheme }: { label: string; count: number; scheme: ColorScheme }) {
  const c = theme.colors[scheme]
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: c.textSecondary, fontFamily: theme.fonts.label }]}>
        {label}
      </Text>
      <View style={[styles.countBadge, { backgroundColor: c.border }]}>
        <Text style={[styles.countText, { color: c.textSecondary, fontFamily: theme.fonts.label }]}>
          {count}
        </Text>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// TaskCard
// ---------------------------------------------------------------------------

type TaskCardProps = {
  task: Task
  subtasks: TaskSubtask[]
  onPress: () => void
  scheme: ColorScheme
}

function TaskCard({ task, subtasks, onPress, scheme }: TaskCardProps) {
  const { t } = useTranslation()
  const c = theme.colors[scheme]
  const { members } = useHouseholdStore()

  const assignee = task.assigned_to
    ? members.find(m => m.user_id === task.assigned_to)
    : null

  const doneSubs = subtasks.filter(s => s.is_done).length
  const totalSubs = subtasks.length
  const isDone = task.status === 'done'

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border },
        isDone && styles.cardDone,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.cardRow}>
        <View style={[styles.statusDot, { backgroundColor: statusDotColor(task.status, c) }]} />

        <View style={styles.cardContent}>
          <Text
            style={[
              styles.cardTitle,
              { color: isDone ? c.textMuted : c.text, fontFamily: theme.fonts.label },
              isDone && styles.cardTitleDone,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          <View style={styles.cardMeta}>
            {task.category && task.category !== 'general' && (
              <View style={[styles.badge, { backgroundColor: c.primaryLight }]}>
                <Text style={[styles.badgeText, { color: c.primary, fontFamily: theme.fonts.label }]}>
                  {t(`tasks.categories.${task.category}`)}
                </Text>
              </View>
            )}

            {task.due_date && (
              <View style={styles.metaChip}>
                <Ionicons name="calendar-outline" size={12} color={c.textSecondary} />
                <Text style={[styles.metaText, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
                  {formatDueDate(task.due_date, t as (key: string) => string)}
                </Text>
              </View>
            )}

            {assignee && (
              <View style={styles.metaChip}>
                <Ionicons name="person-outline" size={12} color={c.textSecondary} />
                <Text style={[styles.metaText, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
                  {assignee.profile.display_name ?? '?'}
                </Text>
              </View>
            )}

            {task.is_recurring && (
              <Ionicons name="repeat" size={13} color={c.textSecondary} />
            )}

            {totalSubs > 0 && (
              <View style={styles.metaChip}>
                <Ionicons name="list-outline" size={12} color={c.textSecondary} />
                <Text style={[styles.metaText, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
                  {t('tasks.subtasksProgress', { done: doneSubs, total: totalSubs })}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
      </View>
    </TouchableOpacity>
  )
}

// ---------------------------------------------------------------------------
// TaskModal — create and edit, all Phase 5 fields
// ---------------------------------------------------------------------------

type TaskModalProps = {
  visible: boolean
  mode: 'create' | 'edit'
  task?: Task
  householdId: string
  userId: string
  scheme: ColorScheme
  onClose: () => void
}

function TaskModal({ visible, mode, task, householdId, userId, scheme, onClose }: TaskModalProps) {
  const { t } = useTranslation()
  const c = theme.colors[scheme]
  const { createTask, updateTask, deleteTask, subtasks, addSubtask, toggleSubtask, deleteSubtask } = useTaskStore()
  const { members } = useHouseholdStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Task['status']>('todo')
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [category, setCategory] = useState<TaskCategory | null>(null)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(null)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [titleError, setTitleError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const taskSubtasks = task ? (subtasks[task.id] ?? []) : []

  useEffect(() => {
    if (!visible) return
    if (mode === 'edit' && task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setStatus(task.status)
      setAssignedTo(task.assigned_to)
      setDueDate(task.due_date ? new Date(task.due_date) : null)
      setCategory(task.category)
      setIsRecurring(task.is_recurring)
      setRecurrenceRule(task.recurrence_rule)
    } else {
      setTitle('')
      setDescription('')
      setStatus('todo')
      setAssignedTo(null)
      setDueDate(null)
      setCategory(null)
      setIsRecurring(false)
      setRecurrenceRule(null)
    }
    setNewSubtaskTitle('')
    setTitleError('')
    setShowDatePicker(false)
  }, [visible, mode, task?.id])

  const handleSave = async () => {
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError(t('tasks.errors.titleRequired'))
      return
    }
    setSaving(true)
    try {
      const dueDateIso = dueDate ? dueDate.toISOString().split('T')[0] : null
      if (mode === 'create') {
        await createTask({
          household_id: householdId,
          created_by: userId,
          title: trimmed,
          description: description.trim() || null,
          status,
          assigned_to: assignedTo,
          due_date: dueDateIso,
          category,
          is_recurring: isRecurring,
          recurrence_rule: isRecurring ? recurrenceRule : null,
        })
      } else if (task) {
        await updateTask(task.id, {
          title: trimmed,
          description: description.trim() || null,
          status,
          assigned_to: assignedTo,
          due_date: dueDateIso,
          category,
          is_recurring: isRecurring,
          recurrence_rule: isRecurring ? recurrenceRule : null,
        })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    setDeleting(true)
    try {
      await deleteTask(task.id)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const handleAddSubtask = async () => {
    const trimmed = newSubtaskTitle.trim()
    if (!trimmed || !task) return
    setNewSubtaskTitle('')
    await addSubtask({ task_id: task.id, household_id: householdId, title: trimmed })
  }

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    // On Android the picker closes itself; on iOS we close it manually
    if (Platform.OS !== 'ios') setShowDatePicker(false)
    if (selected) setDueDate(selected)
  }

  // Recurrence: null means "don't repeat", any rule enables recurring
  const handleRecurrenceChange = (rule: RecurrenceRule | null) => {
    if (rule === null) {
      setIsRecurring(false)
      setRecurrenceRule(null)
    } else {
      setIsRecurring(true)
      setRecurrenceRule(rule)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

          {/* Header bar */}
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.modalHeaderBtn} hitSlop={12}>
              <Text style={[styles.modalCancel, { color: c.textSecondary, fontFamily: theme.fonts.label }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>
              {mode === 'create' ? t('tasks.newTask') : t('tasks.editTask')}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.modalHeaderBtn, styles.modalSaveBtn]} hitSlop={12}>
              {saving
                ? <ActivityIndicator size="small" color={c.primary} />
                : <Text style={[styles.modalSave, { color: c.primary, fontFamily: theme.fonts.label }]}>
                    {t('common.save')}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <TextInput
              style={[
                styles.titleInput,
                { color: c.text, borderBottomColor: titleError ? c.error : c.border, fontFamily: theme.fonts.label },
              ]}
              value={title}
              onChangeText={v => { setTitle(v); if (v.trim()) setTitleError('') }}
              placeholder={t('tasks.taskTitlePlaceholder')}
              placeholderTextColor={c.textMuted}
              returnKeyType="next"
              autoFocus={mode === 'create'}
            />
            {!!titleError && (
              <Text style={[styles.fieldError, { color: c.error, fontFamily: theme.fonts.body }]}>
                {titleError}
              </Text>
            )}

            {/* Description */}
            <TextInput
              style={[styles.descInput, { color: c.text, backgroundColor: c.surface, borderColor: c.border, fontFamily: theme.fonts.body }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('tasks.descriptionPlaceholder')}
              placeholderTextColor={c.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* Status */}
            <Text style={[styles.fieldLabel, { color: c.textSecondary, fontFamily: theme.fonts.label }]}>
              Status
            </Text>
            <SelectPillRow<Task['status']>
              options={TASK_STATUSES}
              value={status}
              onChange={v => setStatus(v ?? 'todo')}
              scheme={scheme}
            />

            {/* Assignee */}
            <Text style={[styles.fieldLabel, { color: c.textSecondary, fontFamily: theme.fonts.label }]}>
              {t('tasks.assignee')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              <TouchableOpacity
                style={[styles.pill, {
                  borderColor: assignedTo === null ? c.primary : c.border,
                  backgroundColor: assignedTo === null ? c.primaryLight : c.surface,
                }]}
                onPress={() => setAssignedTo(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, { color: assignedTo === null ? c.primary : c.textSecondary, fontFamily: theme.fonts.label }]}>
                  {t('tasks.unassigned')}
                </Text>
              </TouchableOpacity>
              {members.map(member => {
                const selected = assignedTo === member.user_id
                const name = member.profile.display_name ?? member.user_id.slice(0, 8)
                return (
                  <TouchableOpacity
                    key={member.user_id}
                    style={[styles.pill, {
                      borderColor: selected ? c.primary : c.border,
                      backgroundColor: selected ? c.primaryLight : c.surface,
                    }]}
                    onPress={() => setAssignedTo(member.user_id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, { color: selected ? c.primary : c.textSecondary, fontFamily: theme.fonts.label }]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            {/* Due date */}
            <Text style={[styles.fieldLabel, { color: c.textSecondary, fontFamily: theme.fonts.label }]}>
              {t('tasks.dueDate')}
            </Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.dateBtn, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => setShowDatePicker(v => !v)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={16} color={dueDate ? c.primary : c.textMuted} />
                <Text style={[styles.dateBtnText, { color: dueDate ? c.text : c.textMuted, fontFamily: theme.fonts.body }]}>
                  {dueDate ? formatDueDate(dueDate.toISOString(), t as (key: string) => string) : t('tasks.noDueDate')}
                </Text>
              </TouchableOpacity>
              {dueDate && (
                <Pressable onPress={() => { setDueDate(null); setShowDatePicker(false) }} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={c.textMuted} />
                </Pressable>
              )}
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={dueDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {/* Category */}
            <Text style={[styles.fieldLabel, { color: c.textSecondary, fontFamily: theme.fonts.label }]}>
              {t('tasks.category')}
            </Text>
            <SelectPillRow<TaskCategory>
              options={TASK_CATEGORIES}
              value={category}
              onChange={setCategory}
              scheme={scheme}
            />

            {/* Recurrence */}
            <Text style={[styles.fieldLabel, { color: c.textSecondary, fontFamily: theme.fonts.label }]}>
              {t('tasks.recurring')}
            </Text>
            <SelectPillRow<RecurrenceRule>
              options={RECURRENCE_RULES}
              value={isRecurring ? recurrenceRule : null}
              onChange={handleRecurrenceChange}
              scheme={scheme}
            />

            {/* Subtasks — shown in edit mode only (task must exist to attach subtasks to) */}
            {mode === 'edit' && task && (
              <>
                <Text style={[styles.fieldLabel, { color: c.textSecondary, fontFamily: theme.fonts.label, marginTop: theme.spacing.md }]}>
                  {t('tasks.subtasks')}
                </Text>

                {taskSubtasks.map(subtask => (
                  <View key={subtask.id} style={[styles.subtaskRow, { borderBottomColor: c.border }]}>
                    <TouchableOpacity onPress={() => toggleSubtask(subtask)} hitSlop={8}>
                      <Ionicons
                        name={subtask.is_done ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={subtask.is_done ? c.success : c.border}
                      />
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.subtaskTitle,
                        { color: subtask.is_done ? c.textMuted : c.text, fontFamily: theme.fonts.body },
                        subtask.is_done && styles.subtaskDone,
                      ]}
                      numberOfLines={2}
                    >
                      {subtask.title}
                    </Text>
                    <TouchableOpacity onPress={() => deleteSubtask(subtask.id, subtask.task_id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={c.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={[styles.subtaskAddRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <TextInput
                    style={[styles.subtaskInput, { color: c.text, fontFamily: theme.fonts.body }]}
                    value={newSubtaskTitle}
                    onChangeText={setNewSubtaskTitle}
                    placeholder={t('tasks.subtaskPlaceholder')}
                    placeholderTextColor={c.textMuted}
                    onSubmitEditing={handleAddSubtask}
                    returnKeyType="done"
                  />
                  <Pressable onPress={handleAddSubtask} disabled={!newSubtaskTitle.trim()} hitSlop={8}>
                    <Ionicons name="add-circle" size={26} color={newSubtaskTitle.trim() ? c.primary : c.border} />
                  </Pressable>
                </View>
              </>
            )}

            {/* Delete button — edit only */}
            {mode === 'edit' && task && (
              <TouchableOpacity
                style={[styles.deleteBtn, { borderColor: c.error }]}
                onPress={handleDelete}
                disabled={deleting}
                activeOpacity={0.7}
              >
                {deleting
                  ? <ActivityIndicator size="small" color={c.error} />
                  : <>
                      <Ionicons name="trash-outline" size={18} color={c.error} />
                      <Text style={[styles.deleteBtnText, { color: c.error, fontFamily: theme.fonts.label }]}>
                        {t('tasks.deleteTask')}
                      </Text>
                    </>
                }
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// TasksScreen
// ---------------------------------------------------------------------------

export default function TasksScreen() {
  const { t } = useTranslation()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]

  const { tasks, subtasks, isLoading, fetchTasks, fetchSubtasksForHousehold, subscribeToTasks, subscribeToSubtasks } = useTaskStore()
  const { user } = useAuthStore()
  const { currentHousehold } = useHouseholdStore()

  const [modalVisible, setModalVisible] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  const householdId = currentHousehold?.id ?? ''

  useEffect(() => {
    if (!householdId) return
    fetchTasks(householdId)
    fetchSubtasksForHousehold(householdId)
    const unsubTasks = subscribeToTasks(householdId)
    const unsubSubtasks = subscribeToSubtasks(householdId)
    return () => {
      unsubTasks()
      unsubSubtasks()
    }
  }, [householdId])

  const openCreate = useCallback(() => {
    setEditingTask(undefined)
    setModalMode('create')
    setModalVisible(true)
  }, [])

  const openEdit = useCallback((task: Task) => {
    setEditingTask(task)
    setModalMode('edit')
    setModalVisible(true)
  }, [])

  const todoTasks = tasks.filter(t => t.status === 'todo')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const doneTasks = tasks.filter(t => t.status === 'done')

  const renderTask = useCallback((task: Task) => (
    <TaskCard
      key={task.id}
      task={task}
      subtasks={subtasks[task.id] ?? []}
      onPress={() => openEdit(task)}
      scheme={scheme}
    />
  ), [subtasks, scheme, openEdit])

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Text style={[styles.screenTitle, { color: c.text, fontFamily: theme.fonts.heading }]}>
          {t('tasks.title')}
        </Text>
        <TouchableOpacity
          style={[styles.addFab, { backgroundColor: c.primary }]}
          onPress={openCreate}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={c.surface} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.listContent,
            tasks.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
                {t('tasks.empty')}
              </Text>
            </View>
          ) : (
            <>
              <SectionHeader label={t('tasks.statuses.todo')} count={todoTasks.length} scheme={scheme} />
              {todoTasks.length === 0
                ? <Text style={[styles.emptySection, { color: c.textMuted, fontFamily: theme.fonts.body }]}>{t('tasks.emptyTodo')}</Text>
                : todoTasks.map(renderTask)
              }

              <SectionHeader label={t('tasks.statuses.inProgress')} count={inProgressTasks.length} scheme={scheme} />
              {inProgressTasks.length === 0
                ? <Text style={[styles.emptySection, { color: c.textMuted, fontFamily: theme.fonts.body }]}>{t('tasks.emptyInProgress')}</Text>
                : inProgressTasks.map(renderTask)
              }

              <SectionHeader label={t('tasks.statuses.done')} count={doneTasks.length} scheme={scheme} />
              {doneTasks.length === 0
                ? <Text style={[styles.emptySection, { color: c.textMuted, fontFamily: theme.fonts.body }]}>{t('tasks.emptyDone')}</Text>
                : doneTasks.map(renderTask)
              }
            </>
          )}
        </ScrollView>
      )}

      <TaskModal
        visible={modalVisible}
        mode={modalMode}
        task={editingTask}
        householdId={householdId}
        userId={user?.id ?? ''}
        scheme={scheme}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
  },
  screenTitle: { fontSize: 28 },
  addFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // List
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  listContentEmpty: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, textAlign: 'center' },
  emptySection: {
    fontSize: 13,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: { fontSize: 12 },

  // Task card
  card: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  cardDone: { opacity: 0.6 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, marginBottom: 4 },
  cardTitleDone: { textDecorationLine: 'line-through' },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: 2,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: { fontSize: 12 },

  // Modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
  },
  modalHeaderBtn: { minWidth: 60 },
  modalSaveBtn: { alignItems: 'flex-end' },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 18 },
  modalSave: { fontSize: 16 },
  modalBody: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: 60,
  },

  // Form
  fieldLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  fieldError: { fontSize: 13, marginTop: theme.spacing.xs },
  titleInput: {
    fontSize: 22,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
  },
  descInput: {
    fontSize: 15,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: theme.spacing.md,
  },

  // Pills
  pillRow: { flexDirection: 'row', gap: theme.spacing.sm },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
  },
  pillText: { fontSize: 13 },

  // Date picker trigger
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flex: 1,
  },
  dateBtnText: { fontSize: 15 },

  // Subtasks
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subtaskTitle: { flex: 1, fontSize: 15 },
  subtaskDone: { textDecorationLine: 'line-through' },
  subtaskAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  subtaskInput: { flex: 1, fontSize: 15 },

  // Delete
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  deleteBtnText: { fontSize: 16 },
})

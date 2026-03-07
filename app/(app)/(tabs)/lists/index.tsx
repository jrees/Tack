import { useEffect, useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { theme, type ColorScheme } from '@/lib/theme'
import { useListStore } from '@/stores/listStore'
import { useHouseholdStore } from '@/stores/householdStore'
import { useAuthStore } from '@/stores/authStore'
import type { List, ListCategory } from '@/types/database'

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

const CATEGORIES: ListCategory[] = ['shopping', 'gifts', 'packing', 'general']

const CATEGORY_ICONS: Record<ListCategory, string> = {
  shopping: '🛒',
  gifts: '🎁',
  packing: '🧳',
  general: '📋',
}

// ---------------------------------------------------------------------------
// Category pill
// ---------------------------------------------------------------------------

function CategoryPill({
  category,
  selected,
  onPress,
  scheme,
}: {
  category: ListCategory
  selected: boolean
  onPress: () => void
  scheme: ColorScheme
}) {
  const c = theme.colors[scheme]
  const { t } = useTranslation()
  return (
    <TouchableOpacity
      style={[
        pillStyles.pill,
        {
          backgroundColor: selected ? c.primaryLight : c.surface,
          borderColor: selected ? c.primary : c.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={pillStyles.icon}>{CATEGORY_ICONS[category]}</Text>
      <Text
        style={[
          pillStyles.label,
          { color: selected ? c.primary : c.textSecondary, fontFamily: theme.fonts.label },
        ]}
      >
        {t(`lists.categories.${category}`)}
      </Text>
    </TouchableOpacity>
  )
}

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  icon: { fontSize: 14 },
  label: { fontSize: 13 },
})

// ---------------------------------------------------------------------------
// List card
// ---------------------------------------------------------------------------

function ListCard({
  list,
  uncheckedCount,
  onPress,
  onAction,
  scheme,
}: {
  list: List
  uncheckedCount: number
  onPress: () => void
  onAction: (list: List) => void
  scheme: ColorScheme
}) {
  const c = theme.colors[scheme]
  const { t } = useTranslation()
  return (
    <TouchableOpacity
      style={[
        cardStyles.card,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          // Pinned lists get a subtle left accent border
          borderLeftColor: list.is_pinned ? c.primary : c.border,
          borderLeftWidth: list.is_pinned ? 3 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Category icon with tinted background */}
      <View style={[cardStyles.iconWrap, { backgroundColor: c.primaryLight }]}>
        <Text style={cardStyles.icon}>{CATEGORY_ICONS[list.category]}</Text>
      </View>

      <View style={cardStyles.meta}>
        <View style={cardStyles.titleRow}>
          {list.is_pinned && (
            <Ionicons
              name="pin"
              size={12}
              color={c.primary}
              style={cardStyles.pinIcon}
            />
          )}
          <Text
            style={[cardStyles.title, { color: c.text, fontFamily: theme.fonts.label }]}
            numberOfLines={1}
          >
            {list.title}
          </Text>
        </View>
        <Text style={[cardStyles.count, { color: c.textMuted, fontFamily: theme.fonts.body }]}>
          {t('lists.count', { count: uncheckedCount })}
        </Text>
      </View>

      <TouchableOpacity
        style={cardStyles.moreBtn}
        onPress={() => onAction(list)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={c.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 22 },
  meta: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  pinIcon: { marginTop: 1 },
  title: { fontSize: 16, flex: 1 },
  count: { fontSize: 13, marginTop: 2 },
  moreBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
})

// ---------------------------------------------------------------------------
// Action sheet
// ---------------------------------------------------------------------------

function ActionSheet({
  visible,
  list,
  onClose,
  onRename,
  onPin,
  onDuplicate,
  onDelete,
  scheme,
}: {
  visible: boolean
  list: List | null
  onClose: () => void
  onRename: () => void
  onPin: () => void
  onDuplicate: () => void
  onDelete: () => void
  scheme: ColorScheme
}) {
  const c = theme.colors[scheme]
  const { t } = useTranslation()
  if (!list) return null

  const isPinned = list.is_pinned

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sheetStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[sheetStyles.sheet, { backgroundColor: c.surface }]}>
        <View style={[sheetStyles.handle, { backgroundColor: c.border }]} />
        <Text style={[sheetStyles.sheetTitle, { color: c.text, fontFamily: theme.fonts.heading }]} numberOfLines={1}>
          {list.title}
        </Text>

        <TouchableOpacity style={sheetStyles.row} onPress={onRename}>
          <Ionicons name="pencil-outline" size={18} color={c.text} />
          <Text style={[sheetStyles.rowText, { color: c.text, fontFamily: theme.fonts.label }]}>
            {t('lists.rename')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={sheetStyles.row} onPress={onPin}>
          <Ionicons
            name={isPinned ? 'pin-outline' : 'pin'}
            size={18}
            color={isPinned ? c.textSecondary : c.primary}
          />
          <Text style={[sheetStyles.rowText, { color: isPinned ? c.text : c.primary, fontFamily: theme.fonts.label }]}>
            {t(isPinned ? 'lists.unpin' : 'lists.pin')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={sheetStyles.row} onPress={onDuplicate}>
          <Ionicons name="copy-outline" size={18} color={c.text} />
          <Text style={[sheetStyles.rowText, { color: c.text, fontFamily: theme.fonts.label }]}>
            {t('lists.duplicate')}
          </Text>
        </TouchableOpacity>

        <View style={[sheetStyles.divider, { backgroundColor: c.border }]} />

        <TouchableOpacity style={sheetStyles.row} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color={c.error} />
          <Text style={[sheetStyles.rowText, { color: c.error, fontFamily: theme.fonts.label }]}>
            {t('common.delete')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[sheetStyles.row, sheetStyles.cancelRow]} onPress={onClose}>
          <Text style={[sheetStyles.cancelText, { color: c.textSecondary, fontFamily: theme.fonts.label }]}>
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: theme.radius.full,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  sheetTitle: {
    fontSize: 18,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  cancelRow: {
    marginTop: theme.spacing.xs,
    justifyContent: 'center',
  },
  rowText: { fontSize: 16 },
  cancelText: { fontSize: 16 },
  divider: { height: 1, marginVertical: theme.spacing.xs },
})

// ---------------------------------------------------------------------------
// Delete confirmation
// ---------------------------------------------------------------------------

function DeleteConfirmSheet({
  visible,
  list,
  onClose,
  onConfirm,
  scheme,
}: {
  visible: boolean
  list: List | null
  onClose: () => void
  onConfirm: () => void
  scheme: ColorScheme
}) {
  const c = theme.colors[scheme]
  const { t } = useTranslation()
  if (!list) return null
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={confirmStyles.overlay}>
        <View style={[confirmStyles.dialog, { backgroundColor: c.surface }]}>
          <Text style={[confirmStyles.title, { color: c.text, fontFamily: theme.fonts.heading }]}>
            {t('common.delete')} "{list.title}"?
          </Text>
          <Text style={[confirmStyles.body, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
            {t('lists.deleteConfirmBody')}
          </Text>
          <View style={confirmStyles.actions}>
            <TouchableOpacity style={confirmStyles.btn} onPress={onClose}>
              <Text style={[confirmStyles.btnText, { color: c.textSecondary, fontFamily: theme.fonts.label }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={confirmStyles.btn} onPress={onConfirm}>
              <Text style={[confirmStyles.btnText, { color: c.error, fontFamily: theme.fonts.label }]}>
                {t('common.delete')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const confirmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  dialog: {
    width: '100%',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  title: { fontSize: 18, marginBottom: theme.spacing.sm },
  body: { fontSize: 14, lineHeight: 20, marginBottom: theme.spacing.lg },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.lg },
  btn: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.sm },
  btnText: { fontSize: 16 },
})

// ---------------------------------------------------------------------------
// Duplicate sheet
// ---------------------------------------------------------------------------

function DuplicateSheet({
  visible,
  list,
  onClose,
  onDuplicate,
  scheme,
}: {
  visible: boolean
  list: List | null
  onClose: () => void
  onDuplicate: (uncheckAll: boolean) => void
  scheme: ColorScheme
}) {
  const c = theme.colors[scheme]
  const { t } = useTranslation()
  if (!list) return null
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sheetStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[sheetStyles.sheet, { backgroundColor: c.surface }]}>
        <View style={[sheetStyles.handle, { backgroundColor: c.border }]} />
        <Text style={[sheetStyles.sheetTitle, { color: c.text, fontFamily: theme.fonts.heading }]} numberOfLines={1}>
          {t('lists.copyTitle')}
        </Text>

        <TouchableOpacity style={sheetStyles.row} onPress={() => onDuplicate(true)}>
          <Ionicons name="refresh-outline" size={18} color={c.primary} />
          <Text style={[sheetStyles.rowText, { color: c.primary, fontFamily: theme.fonts.label }]}>
            {t('lists.copyUncheck')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={sheetStyles.row} onPress={() => onDuplicate(false)}>
          <Ionicons name="copy-outline" size={18} color={c.text} />
          <Text style={[sheetStyles.rowText, { color: c.text, fontFamily: theme.fonts.label }]}>
            {t('lists.copyKeepChecked')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[sheetStyles.row, sheetStyles.cancelRow]} onPress={onClose}>
          <Text style={[sheetStyles.cancelText, { color: c.textSecondary, fontFamily: theme.fonts.label }]}>
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Rename modal
// ---------------------------------------------------------------------------

function RenameModal({
  visible,
  list,
  onClose,
  onSave,
  scheme,
}: {
  visible: boolean
  list: List | null
  onClose: () => void
  onSave: (title: string) => void
  scheme: ColorScheme
}) {
  const c = theme.colors[scheme]
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (visible && list) {
      setValue(list.title)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [visible, list])

  const handleSave = () => {
    const trimmed = value.trim()
    if (trimmed) onSave(trimmed)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={confirmStyles.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[renameStyles.dialog, { backgroundColor: c.surface }]}>
              <Text style={[renameStyles.title, { color: c.text, fontFamily: theme.fonts.heading }]}>
                {t('lists.rename')}
              </Text>
              <TextInput
                ref={inputRef}
                style={[renameStyles.input, { color: c.text, borderColor: c.primary, backgroundColor: c.background, fontFamily: theme.fonts.body }]}
                value={value}
                onChangeText={setValue}
                onSubmitEditing={handleSave}
                returnKeyType="done"
                autoCapitalize="sentences"
              />
              <View style={confirmStyles.actions}>
                <TouchableOpacity style={confirmStyles.btn} onPress={onClose}>
                  <Text style={[confirmStyles.btnText, { color: c.textSecondary, fontFamily: theme.fonts.label }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={confirmStyles.btn} onPress={handleSave}>
                  <Text style={[confirmStyles.btnText, { color: c.primary, fontFamily: theme.fonts.label }]}>
                    {t('common.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const renameStyles = StyleSheet.create({
  dialog: {
    width: 320,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  title: { fontSize: 18, marginBottom: theme.spacing.md },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    marginBottom: theme.spacing.md,
  },
})

// ---------------------------------------------------------------------------
// Create list modal
// ---------------------------------------------------------------------------

function CreateListModal({
  visible,
  onClose,
  onCreate,
  scheme,
}: {
  visible: boolean
  onClose: () => void
  onCreate: (title: string, category: ListCategory) => Promise<void>
  scheme: ColorScheme
}) {
  const c = theme.colors[scheme]
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  // Default to shopping — the most common use case
  const [category, setCategory] = useState<ListCategory>('shopping')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (visible) {
      setTitle('')
      setCategory('shopping')
      setError('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [visible])

  const handleCreate = async () => {
    const trimmed = title.trim()
    if (!trimmed) {
      setError(t('lists.errors.titleRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      await onCreate(trimmed, category)
      onClose()
    } catch {
      setError(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sheetStyles.overlay} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[createStyles.sheet, { backgroundColor: c.surface }]}>
          <View style={[sheetStyles.handle, { backgroundColor: c.border }]} />
          <Text style={[createStyles.heading, { color: c.text, fontFamily: theme.fonts.heading }]}>
            {t('lists.add')}
          </Text>

          <Text style={[createStyles.label, { color: c.textSecondary, fontFamily: theme.fonts.label }]}>
            {t('lists.listTitle')}
          </Text>
          <TextInput
            ref={inputRef}
            style={[
              createStyles.input,
              {
                color: c.text,
                borderColor: error ? c.error : c.border,
                backgroundColor: c.background,
                fontFamily: theme.fonts.body,
              },
            ]}
            value={title}
            onChangeText={v => { setTitle(v); setError('') }}
            placeholder={t('lists.listTitle')}
            placeholderTextColor={c.textMuted}
            autoCapitalize="sentences"
            onSubmitEditing={handleCreate}
            returnKeyType="done"
          />
          {!!error && (
            <Text style={[createStyles.errorText, { color: c.error, fontFamily: theme.fonts.body }]}>
              {error}
            </Text>
          )}

          <Text style={[createStyles.label, { color: c.textSecondary, fontFamily: theme.fonts.label, marginTop: theme.spacing.md }]}>
            {t('lists.category')}
          </Text>
          <View style={createStyles.pills}>
            {CATEGORIES.map(cat => (
              <CategoryPill
                key={cat}
                category={cat}
                selected={category === cat}
                onPress={() => setCategory(cat)}
                scheme={scheme}
              />
            ))}
          </View>

          <View style={createStyles.actions}>
            <TouchableOpacity style={createStyles.cancelBtn} onPress={onClose}>
              <Text style={[createStyles.cancelText, { color: c.textSecondary, fontFamily: theme.fonts.label }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[createStyles.createBtn, { backgroundColor: c.primary }]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={c.surface} />
                : <Text style={[createStyles.createText, { color: c.surface, fontFamily: theme.fonts.label }]}>
                    {t('common.create')}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const createStyles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  heading: { fontSize: 22, marginBottom: theme.spacing.lg },
  label: { fontSize: 13, marginBottom: theme.spacing.xs },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
  },
  errorText: { fontSize: 13, marginTop: theme.spacing.xs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  cancelBtn: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.sm },
  cancelText: { fontSize: 16 },
  createBtn: {
    flex: 1,
    height: 54,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: { fontSize: 16 },
})

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ListsIndexScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]

  const household = useHouseholdStore(s => s.currentHousehold)
  const user = useAuthStore(s => s.user)
  const { lists, items, isLoading, fetchLists, fetchItems, createList, renameList, pinList, deleteList, duplicateList, subscribeToLists } = useListStore()

  const [showCreate, setShowCreate] = useState(false)
  const [actionList, setActionList] = useState<List | null>(null)
  const [showAction, setShowAction] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showDuplicate, setShowDuplicate] = useState(false)

  useEffect(() => {
    if (!household) return
    fetchLists(household.id)
    const unsub = subscribeToLists(household.id)
    return unsub
  }, [household?.id])

  useEffect(() => {
    for (const list of lists) {
      if (!items[list.id]) fetchItems(list.id)
    }
  }, [lists])

  const uncheckedCount = useCallback((listId: string) => {
    return (items[listId] ?? []).filter(i => !i.is_checked).length
  }, [items])

  const handleCreate = async (title: string, category: ListCategory) => {
    if (!household || !user) return
    const created = await createList({ household_id: household.id, created_by: user.id, title, category })
    router.push(`/(app)/(tabs)/lists/${created.id}`)
  }

  const openAction = (list: List) => {
    setActionList(list)
    setShowAction(true)
  }

  const handleRename = () => {
    setShowAction(false)
    setTimeout(() => setShowRename(true), 200)
  }

  const handlePin = async () => {
    if (!actionList) return
    setShowAction(false)
    await pinList(actionList.id, !actionList.is_pinned)
    setActionList(null)
  }

  const handleDuplicatePrompt = () => {
    setShowAction(false)
    setTimeout(() => setShowDuplicate(true), 200)
  }

  const handleDuplicateConfirm = async (uncheckAll: boolean) => {
    if (!actionList) return
    setShowDuplicate(false)
    const created = await duplicateList(actionList.id, uncheckAll)
    setActionList(null)
    router.push(`/(app)/(tabs)/lists/${created.id}`)
  }

  const handleDeletePrompt = () => {
    setShowAction(false)
    setTimeout(() => setShowDelete(true), 200)
  }

  const handleDeleteConfirm = async () => {
    if (!actionList) return
    setShowDelete(false)
    await deleteList(actionList.id)
    setActionList(null)
  }

  const handleRenameSave = async (title: string) => {
    if (!actionList) return
    setShowRename(false)
    await renameList(actionList.id, title)
    setActionList(null)
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading }]}>
          {t('lists.title')}
        </Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: c.primary }]}
          onPress={() => setShowCreate(true)}
          accessibilityLabel={t('lists.add')}
        >
          <Ionicons name="add" size={24} color={c.surface} />
        </TouchableOpacity>
      </View>

      {isLoading && lists.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={l => l.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ListCard
              list={item}
              uncheckedCount={uncheckedCount(item.id)}
              onPress={() => router.push(`/(app)/(tabs)/lists/${item.id}`)}
              onAction={openAction}
              scheme={scheme}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyText, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
                {t('lists.empty')}
              </Text>
            </View>
          }
        />
      )}

      <CreateListModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        scheme={scheme}
      />
      <ActionSheet
        visible={showAction}
        list={actionList}
        onClose={() => setShowAction(false)}
        onRename={handleRename}
        onPin={handlePin}
        onDuplicate={handleDuplicatePrompt}
        onDelete={handleDeletePrompt}
        scheme={scheme}
      />
      <DuplicateSheet
        visible={showDuplicate}
        list={actionList}
        onClose={() => setShowDuplicate(false)}
        onDuplicate={handleDuplicateConfirm}
        scheme={scheme}
      />
      <RenameModal
        visible={showRename}
        list={actionList}
        onClose={() => setShowRename(false)}
        onSave={handleRenameSave}
        scheme={scheme}
      />
      <DeleteConfirmSheet
        visible={showDelete}
        list={actionList}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDeleteConfirm}
        scheme={scheme}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  title: { fontSize: 28 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', paddingTop: theme.spacing.xl * 2, paddingHorizontal: theme.spacing.lg },
  emptyIcon: { fontSize: 48, marginBottom: theme.spacing.md },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
})

import { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { Swipeable } from 'react-native-gesture-handler'
import { theme, type ColorScheme } from '@/lib/theme'
import { useListStore } from '@/stores/listStore'
import { useAuthStore } from '@/stores/authStore'
import { filterSuggestions } from '@/lib/suggestions'
import type { ListItem, List } from '@/types/database'

const CATEGORY_ICONS: Record<string, string> = {
  shopping: '🛒',
  gifts: '🎁',
  packing: '🧳',
  general: '📋',
}

// ---------------------------------------------------------------------------
// Swipeable item row
// ---------------------------------------------------------------------------

function ItemRow({
  item,
  onToggle,
  onDelete,
  scheme,
}: {
  item: ListItem
  onToggle: () => void
  onDelete: () => void
  scheme: ColorScheme
}) {
  const c = theme.colors[scheme]
  const swipeRef = useRef<Swipeable>(null)

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    })
    return (
      <TouchableOpacity
        style={[rowStyles.deleteAction, { backgroundColor: c.error }]}
        onPress={() => {
          swipeRef.current?.close()
          onDelete()
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    )
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      <View style={[rowStyles.row, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <TouchableOpacity
          style={rowStyles.checkArea}
          onPress={onToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View
            style={[
              rowStyles.checkbox,
              {
                borderColor: item.is_checked ? c.success : c.border,
                backgroundColor: item.is_checked ? c.success : 'transparent',
              },
            ]}
          >
            {item.is_checked && (
              <Ionicons name="checkmark" size={14} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
        <Text
          style={[
            rowStyles.label,
            {
              color: item.is_checked ? c.textMuted : c.text,
              fontFamily: theme.fonts.body,
              textDecorationLine: item.is_checked ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
      </View>
    </Swipeable>
  )
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm + 2,
    borderBottomWidth: 1,
    gap: theme.spacing.md,
    paddingRight: theme.spacing.md,
  },
  checkArea: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 16, lineHeight: 22 },
  deleteAction: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1, // aligns with borderBottomWidth gap
  },
})

// ---------------------------------------------------------------------------
// Suggestion chips
// ---------------------------------------------------------------------------

function SuggestionChips({
  suggestions,
  onSelect,
  scheme,
}: {
  suggestions: string[]
  onSelect: (s: string) => void
  scheme: ColorScheme
}) {
  const c = theme.colors[scheme]
  if (!suggestions.length) return null
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={chipStyles.row}
      keyboardShouldPersistTaps="handled"
    >
      {suggestions.map(s => (
        <TouchableOpacity
          key={s}
          style={[chipStyles.chip, { backgroundColor: c.primaryLight, borderColor: c.primary }]}
          onPress={() => onSelect(s)}
        >
          <Text style={[chipStyles.label, { color: c.primary, fontFamily: theme.fonts.label }]}>{s}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const chipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  label: { fontSize: 13 },
})

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ list, scheme }: { list: List | undefined; scheme: ColorScheme }) {
  const c = theme.colors[scheme]
  const { t } = useTranslation()
  const icon = list ? CATEGORY_ICONS[list.category] ?? '📋' : '📋'
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>{icon}</Text>
      <Text style={[emptyStyles.title, { color: c.text, fontFamily: theme.fonts.heading }]}>
        {t('lists.emptyTitle')}
      </Text>
      <Text style={[emptyStyles.body, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
        {t('lists.emptyBody')}
      </Text>
      {/* Arrow pointing down toward the add bar */}
      <View style={emptyStyles.arrowWrap}>
        <Ionicons name="arrow-down" size={20} color={c.textMuted} />
      </View>
    </View>
  )
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl * 2,
    paddingHorizontal: theme.spacing.lg,
  },
  icon: { fontSize: 52, marginBottom: theme.spacing.md },
  title: { fontSize: 20, marginBottom: theme.spacing.xs },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  arrowWrap: { marginTop: theme.spacing.lg },
})

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const router = useRouter()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]

  const user = useAuthStore(s => s.user)
  const {
    lists,
    items: allItems,
    fetchItems,
    addItem,
    toggleItem,
    deleteItem,
    subscribeToItems,
    renameList,
  } = useListStore()

  const list: List | undefined = lists.find(l => l.id === id)
  const items: ListItem[] = allItems[id] ?? []
  const unchecked = items.filter(i => !i.is_checked)
  const checked = items.filter(i => i.is_checked)

  const [inputText, setInputText] = useState('')
  const [addError, setAddError] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(list?.title ?? '')

  const inputRef = useRef<TextInput>(null)
  const titleRef = useRef<TextInput>(null)

  // Sync titleDraft when list changes (realtime or navigation)
  useEffect(() => {
    if (list && !isEditingTitle) setTitleDraft(list.title)
  }, [list?.title])

  useEffect(() => {
    if (!id) return
    fetchItems(id)
    const unsub = subscribeToItems(id)
    return unsub
  }, [id])

  const isShopping = list?.category === 'shopping'
  const existingTitles = items.map(i => i.title)
  const suggestions = isShopping ? filterSuggestions(inputText, existingTitles) : []

  const handleAdd = async (title?: string) => {
    const text = (title ?? inputText).trim()
    if (!text) {
      setAddError(t('lists.errors.titleRequired'))
      return
    }
    if (!user || !id) return
    setIsAdding(true)
    setAddError('')
    try {
      await addItem({ list_id: id, added_by: user.id, title: text })
      setInputText('')
      inputRef.current?.focus()
    } catch {
      setAddError(t('common.error'))
    } finally {
      setIsAdding(false)
    }
  }

  const handleSuggestionSelect = (s: string) => {
    setInputText('')
    handleAdd(s)
  }

  const handleToggle = async (item: ListItem) => {
    if (!user) return
    await toggleItem(item, user.id)
  }

  const handleDelete = async (item: ListItem) => {
    await deleteItem(item.id, item.list_id)
  }

  const handleTitleSave = async () => {
    const trimmed = titleDraft.trim()
    if (!trimmed || !id || trimmed === list?.title) {
      setIsEditingTitle(false)
      setTitleDraft(list?.title ?? '')
      return
    }
    setIsEditingTitle(false)
    await renameList(id, trimmed)
  }

  type RowData = ListItem | { __separator: true }

  const listData: RowData[] = [
    ...unchecked,
    ...(checked.length > 0 ? [{ __separator: true } as const] : []),
    ...checked,
  ]

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={c.primary} />
            <Text style={[styles.backText, { color: c.primary, fontFamily: theme.fonts.label }]}>
              {t('lists.title')}
            </Text>
          </TouchableOpacity>

          {isEditingTitle ? (
            <TextInput
              ref={titleRef}
              style={[styles.titleInput, { color: c.text, borderColor: c.primary, fontFamily: theme.fonts.heading }]}
              value={titleDraft}
              onChangeText={setTitleDraft}
              onBlur={handleTitleSave}
              onSubmitEditing={handleTitleSave}
              autoFocus
              returnKeyType="done"
            />
          ) : (
            <TouchableOpacity
              onPress={() => {
                setIsEditingTitle(true)
                setTimeout(() => titleRef.current?.focus(), 50)
              }}
            >
              <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading }]} numberOfLines={1}>
                {list?.title ?? ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Items */}
        <FlatList
          data={listData}
          keyExtractor={(item, idx) =>
            '__separator' in item ? 'separator' : (item as ListItem).id
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if ('__separator' in item) {
              return (
                <View style={styles.separatorContainer}>
                  <View style={[styles.separatorLine, { backgroundColor: c.border }]} />
                  <Text style={[styles.separatorLabel, { color: c.textMuted, fontFamily: theme.fonts.body }]}>
                    {t('common.done')}
                  </Text>
                  <View style={[styles.separatorLine, { backgroundColor: c.border }]} />
                </View>
              )
            }
            const listItem = item as ListItem
            return (
              <ItemRow
                item={listItem}
                onToggle={() => handleToggle(listItem)}
                onDelete={() => handleDelete(listItem)}
                scheme={scheme}
              />
            )
          }}
          ListEmptyComponent={<EmptyState list={list} scheme={scheme} />}
        />

        {/* Suggestion chips */}
        {suggestions.length > 0 && (
          <SuggestionChips
            suggestions={suggestions}
            onSelect={handleSuggestionSelect}
            scheme={scheme}
          />
        )}

        {/* Add bar */}
        <View style={[styles.addBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <TextInput
            ref={inputRef}
            style={[styles.addInput, { color: c.text, fontFamily: theme.fonts.body }]}
            value={inputText}
            onChangeText={v => { setInputText(v); setAddError('') }}
            placeholder={t('lists.addItem')}
            placeholderTextColor={c.textMuted}
            returnKeyType="done"
            onSubmitEditing={() => handleAdd()}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: c.primary },
              !inputText.trim() && styles.addButtonDisabled,
            ]}
            onPress={() => handleAdd()}
            disabled={isAdding}
          >
            {isAdding
              ? <ActivityIndicator color={c.surface} size="small" />
              : <Ionicons name="add" size={24} color={c.surface} />
            }
          </TouchableOpacity>
        </View>

        {!!addError && (
          <Text style={[styles.addError, { color: c.error, fontFamily: theme.fonts.body }]}>
            {addError}
          </Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.xs,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 15 },
  title: {
    fontSize: 26,
    paddingVertical: theme.spacing.xs,
  },
  titleInput: {
    fontSize: 26,
    borderBottomWidth: 2,
    paddingVertical: theme.spacing.xs,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.md,
  },
  separatorLine: { flex: 1, height: 1 },
  separatorLabel: { fontSize: 13 },
  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    gap: theme.spacing.sm,
  },
  addInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { opacity: 0.4 },
  addError: {
    fontSize: 13,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
})

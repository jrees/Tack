import { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { theme, type ColorScheme } from '@/lib/theme'
import { useHouseholdStore, type MemberWithProfile } from '@/stores/householdStore'
import { useAuthStore } from '@/stores/authStore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function MemberRow({
  member,
  currentUserId,
  isCurrentUserAdmin,
  isLastAdmin,
  isLast,
  onRemove,
  onTransferAdmin,
}: {
  member: MemberWithProfile
  currentUserId: string
  isCurrentUserAdmin: boolean
  isLastAdmin: boolean
  isLast: boolean
  onRemove: (member: MemberWithProfile) => void
  onTransferAdmin: (member: MemberWithProfile) => void
}) {
  const { t } = useTranslation()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]

  const isSelf = member.user_id === currentUserId
  const name = member.profile.display_name ?? '—'

  return (
    <View style={[styles.memberRow, isLast ? { borderBottomWidth: 0 } : { borderBottomColor: c.border }]}>
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: c.text }]}>{name}{isSelf ? ` ${t('household.you')}` : ''}</Text>
        <View style={[
          styles.roleBadge,
          { backgroundColor: member.role === 'admin' ? c.primaryLight : c.border },
        ]}>
          <Text style={[
            styles.roleBadgeText,
            { color: member.role === 'admin' ? c.primary : c.textSecondary },
          ]}>
            {t(`household.roles.${member.role}`)}
          </Text>
        </View>
      </View>

      {isCurrentUserAdmin && !isSelf && (
        <View style={styles.memberActions}>
          {member.role === 'member' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onTransferAdmin(member)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.actionButtonText, { color: c.primary }]}>
                {t('household.makeAdmin')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onRemove(member)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.actionButtonText, { color: c.error }]}>
              {t('common.remove')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Confirmation sheet (inline — no Alert.alert)
// ---------------------------------------------------------------------------

type ConfirmAction =
  | { type: 'leave' }
  | { type: 'remove'; member: MemberWithProfile }
  | { type: 'transferAdmin'; member: MemberWithProfile }
  | { type: 'delete' }

function ConfirmSheet({
  action,
  onConfirm,
  onCancel,
  isLoading,
  error,
}: {
  action: ConfirmAction
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
  error: string | null
}) {
  const { t } = useTranslation()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]

  const isDestructive = action.type === 'leave' || action.type === 'remove' || action.type === 'delete'

  const message = (() => {
    switch (action.type) {
      case 'leave':    return t('household.leaveConfirm')
      case 'remove':   return t('household.removeConfirm', { name: action.member.profile.display_name ?? '—' })
      case 'transferAdmin': return t('household.transferAdminConfirm', { name: action.member.profile.display_name ?? '—' })
      case 'delete':   return t('household.deleteConfirm')
    }
  })()

  const confirmLabel = (() => {
    switch (action.type) {
      case 'leave':         return t('household.leaveHousehold')
      case 'remove':        return t('household.removeMember')
      case 'transferAdmin': return t('household.transferAdmin')
      case 'delete':        return t('household.deleteHousehold')
    }
  })()

  return (
    <View style={styles.confirmSheet}>
      <Text style={[styles.confirmMessage, { color: c.text }]}>{message}</Text>
      {error && (
        <Text style={[styles.confirmError, { color: c.error }]}>{error}</Text>
      )}
      <View style={styles.confirmButtons}>
        <TouchableOpacity
          style={[styles.confirmBtn, { borderColor: c.border }]}
          onPress={onCancel}
          disabled={isLoading}
        >
          <Text style={[styles.confirmBtnText, { color: c.textSecondary }]}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            styles.confirmBtnPrimary,
            { backgroundColor: isDestructive ? c.error : c.primary },
          ]}
          onPress={onConfirm}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator size="small" color={c.surface} />
            : <Text style={[styles.confirmBtnText, { color: c.surface }]}>{confirmLabel}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function HouseholdScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light'
  const c = theme.colors[scheme]

  const user = useAuthStore(s => s.user)
  const { currentHousehold, members, leaveHousehold, removeMember, transferAdmin, deleteHousehold } = useHouseholdStore()

  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)

  if (!currentHousehold || !user) return null

  const userId = user.id
  const currentMember = members.find(m => m.user_id === userId)
  const isAdmin = currentMember?.role === 'admin'
  const adminCount = members.filter(m => m.role === 'admin').length
  const isLastAdmin = isAdmin && adminCount === 1

  // ---- invite code copy ----
  async function handleCopyCode() {
    await Share.share({ message: currentHousehold!.invite_code })
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  // ---- leave ----
  function handleLeavePress() {
    if (isLastAdmin && members.length > 1) {
      setError(t('household.leaveLastAdminOthers'))
      return
    }
    if (isLastAdmin && members.length === 1) {
      // Only member — surface delete option instead
      setPendingAction({ type: 'delete' })
      return
    }
    setPendingAction({ type: 'leave' })
  }

  // ---- confirm handler ----
  async function handleConfirm() {
    if (!pendingAction) return
    setActionLoading(true)
    setError(null)
    try {
      switch (pendingAction.type) {
        case 'leave':
          await leaveHousehold(userId)
          break
        case 'remove':
          await removeMember(pendingAction.member.user_id)
          break
        case 'transferAdmin':
          await transferAdmin(pendingAction.member.user_id)
          break
        case 'delete':
          await deleteHousehold()
          break
      }
      setPendingAction(null)
    } catch {
      const key = (() => {
        switch (pendingAction.type) {
          case 'leave':         return 'household.errors.leaveFailed'
          case 'remove':        return 'household.errors.removeFailed'
          case 'transferAdmin': return 'household.errors.transferFailed'
          case 'delete':        return 'household.errors.deleteFailed'
        }
      })()
      setError(t(key))
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.backLink, { color: c.primary }]}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.text }]}>{currentHousehold.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Invite code */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>
            {t('household.inviteCode')}
          </Text>
          <View style={styles.codeRow}>
            <Text style={[styles.inviteCode, { color: c.text }]}>
              {currentHousehold.invite_code}
            </Text>
            <TouchableOpacity
              style={[styles.copyChip, { backgroundColor: c.primaryLight }]}
              onPress={handleCopyCode}
            >
              <Text style={[styles.copyChipText, { color: c.primary }]}>
                {codeCopied ? t('household.codeCopied') : t('household.copyCode')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.inviteHint, { color: c.textMuted }]}>
            {t('household.invitePrompt')}
          </Text>
        </View>

        {/* Members */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>
            {t('household.members')}
          </Text>
          {members.map((member, index) => (
            <MemberRow
              key={member.id}
              member={member}
              currentUserId={userId}
              isCurrentUserAdmin={isAdmin}
              isLastAdmin={isLastAdmin}
              isLast={index === members.length - 1}
              onRemove={m => { setError(null); setPendingAction({ type: 'remove', member: m }) }}
              onTransferAdmin={m => { setError(null); setPendingAction({ type: 'transferAdmin', member: m }) }}
            />
          ))}
        </View>

        {/* Danger zone */}
        <View style={[styles.dangerSection, { backgroundColor: c.secondaryLight, borderColor: c.secondary }]}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleLeavePress}>
            <Text style={[styles.dangerText, { color: c.error }]}>
              {t('household.leaveHousehold')}
            </Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              style={[styles.dangerRow, { borderTopWidth: 1, borderTopColor: c.secondary }]}
              onPress={() => { setError(null); setPendingAction({ type: 'delete' }) }}
            >
              <Text style={[styles.dangerText, { color: c.error }]}>
                {t('household.deleteHousehold')}
              </Text>
            </TouchableOpacity>
          )}
          {/* Last-admin error lives here, contextually below the leave action */}
          {!pendingAction && error && (
            <Text style={[styles.dangerError, { color: c.error, borderTopColor: c.secondary }]}>{error}</Text>
          )}
        </View>
      </ScrollView>

      {/* Confirm sheet — fixed bottom panel, always visible regardless of scroll */}
      {pendingAction && (
        <View style={[styles.confirmOverlay, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <ConfirmSheet
            action={pendingAction}
            onConfirm={handleConfirm}
            onCancel={() => { setPendingAction(null); setError(null) }}
            isLoading={actionLoading}
            error={error}
          />
        </View>
      )}
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
  },
  backLink: {
    fontSize: 16,
    fontFamily: theme.fonts.label,
    width: 40,
  },
  title: {
    fontSize: 20,
    fontFamily: theme.fonts.heading,
    flex: 1,
    textAlign: 'center',
  },

  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },

  section: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.label,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },

  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  inviteCode: {
    fontSize: 22,
    fontFamily: theme.fonts.heading,
    letterSpacing: 3,
  },
  copyChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 44,
    justifyContent: 'center',
  },
  copyChipText: {
    fontSize: 13,
    fontFamily: theme.fonts.label,
  },
  inviteHint: {
    fontSize: 13,
    fontFamily: theme.fonts.body,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    minHeight: 44,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  memberName: {
    fontSize: 15,
    fontFamily: theme.fonts.body,
  },
  roleBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleBadgeText: {
    fontSize: 12,
    fontFamily: theme.fonts.label,
  },
  memberActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.label,
  },

  dangerSection: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dangerRow: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  dangerText: {
    fontSize: 15,
    fontFamily: theme.fonts.label,
  },
  dangerError: {
    fontSize: 13,
    fontFamily: theme.fonts.body,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
  },

  confirmOverlay: {
    borderTopWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  confirmSheet: {
    gap: theme.spacing.md,
  },
  confirmMessage: {
    fontSize: 15,
    fontFamily: theme.fonts.body,
    lineHeight: 22,
  },
  confirmError: {
    fontSize: 13,
    fontFamily: theme.fonts.body,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnPrimary: {
    borderWidth: 0,
  },
  confirmBtnText: {
    fontSize: 15,
    fontFamily: theme.fonts.label,
  },
})

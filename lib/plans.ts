/**
 * Plan limits — the single source of truth for what each subscription tier
 * is allowed to do. Never hardcode these values in components or stores.
 *
 * Usage:
 *   import { PLAN_LIMITS } from '@/lib/plans'
 *   import { useAuthStore } from '@/stores/authStore'
 *
 *   const tier = useAuthStore(s => s.tier)
 *   const canAddMember = memberCount < PLAN_LIMITS[tier].maxMembers
 *
 * A missing subscriptions row means free tier — the authStore defaults to
 * 'free' when no row exists for the current user.
 */

import type { SubscriptionTier } from '@/types/database'

export type { SubscriptionTier }

// ---------------------------------------------------------------------------
// Limits per tier
// ---------------------------------------------------------------------------

export interface PlanLimits {
  maxMembers: number
  maxLists: number
  maxTasks: number
}

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  free:   { maxMembers: 2,  maxLists: 5,  maxTasks: 20 },
  trial:  { maxMembers: 99, maxLists: 99, maxTasks: 99 },
  pro:    { maxMembers: 99, maxLists: 99, maxTasks: 99 },
  gifted: { maxMembers: 99, maxLists: 99, maxTasks: 99 },
}

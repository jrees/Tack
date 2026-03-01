// Hand-written Supabase database types.
// Update this file as tables are added in the Supabase dashboard.
// Usage: createClient<Database>(url, key) in lib/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type MemberRole = 'admin' | 'member'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type ListCategory = 'shopping' | 'gifts' | 'packing' | 'general'
export type SubscriptionTier = 'free' | 'trial' | 'pro' | 'gifted'

// ---------------------------------------------------------------------------
// Database shape (matches Supabase generated-types convention)
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string            // FK → auth.users.id
          display_name: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          display_name?: string | null
          avatar_url?: string | null
        }
      }

      households: {
        Row: {
          id: string
          name: string
          created_at: string
          invite_code: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          invite_code: string
        }
        Update: {
          name?: string
          invite_code?: string
        }
      }

      household_members: {
        Row: {
          id: string
          household_id: string
          user_id: string
          role: MemberRole
          joined_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          role?: MemberRole
          joined_at?: string
        }
        Update: {
          role?: MemberRole
        }
      }

      tasks: {
        Row: {
          id: string
          household_id: string
          title: string
          description: string | null
          created_by: string
          assigned_to: string | null
          status: TaskStatus
          due_date: string | null
          is_recurring: boolean
          recurrence_rule: string | null
          category: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          household_id: string
          title: string
          description?: string | null
          created_by: string
          assigned_to?: string | null
          status?: TaskStatus
          due_date?: string | null
          is_recurring?: boolean
          recurrence_rule?: string | null
          category?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          assigned_to?: string | null
          status?: TaskStatus
          due_date?: string | null
          is_recurring?: boolean
          recurrence_rule?: string | null
          category?: string | null
          completed_at?: string | null
        }
      }

      task_subtasks: {
        Row: {
          id: string
          task_id: string
          household_id: string
          title: string
          is_done: boolean
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          household_id: string
          title: string
          is_done?: boolean
          created_at?: string
        }
        Update: {
          title?: string
          is_done?: boolean
        }
      }

      lists: {
        Row: {
          id: string
          household_id: string
          created_by: string
          title: string
          category: ListCategory
          is_archived: boolean
          is_pinned: boolean
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          created_by: string
          title: string
          category?: ListCategory
          is_archived?: boolean
          is_pinned?: boolean
          created_at?: string
        }
        Update: {
          title?: string
          category?: ListCategory
          is_archived?: boolean
          is_pinned?: boolean
        }
      }

      list_items: {
        Row: {
          id: string
          list_id: string
          added_by: string
          title: string
          is_checked: boolean
          checked_by: string | null
          checked_at: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          list_id: string
          added_by: string
          title: string
          is_checked?: boolean
          checked_by?: string | null
          checked_at?: string | null
          sort_order?: number
        }
        Update: {
          title?: string
          is_checked?: boolean
          checked_by?: string | null
          checked_at?: string | null
          sort_order?: number
        }
      }

      subscriptions: {
        Row: {
          id: string
          user_id: string
          tier: SubscriptionTier
          trial_ends_at: string | null
          current_period_ends_at: string | null
          revenuecat_customer_id: string | null
          gifted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier?: SubscriptionTier
          trial_ends_at?: string | null
          current_period_ends_at?: string | null
          revenuecat_customer_id?: string | null
          gifted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          tier?: SubscriptionTier
          trial_ends_at?: string | null
          current_period_ends_at?: string | null
          revenuecat_customer_id?: string | null
          gifted_by?: string | null
          updated_at?: string
        }
      }

      promo_codes: {
        Row: {
          id: string
          code: string
          tier: SubscriptionTier
          duration_days: number | null   // null = lifetime
          redeemed_by: string | null
          redeemed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          tier: SubscriptionTier
          duration_days?: number | null
          redeemed_by?: string | null
          redeemed_at?: string | null
          created_at?: string
        }
        Update: {
          redeemed_by?: string | null
          redeemed_at?: string | null
        }
      }
    }

    Views: Record<string, never>

    Functions: {
      find_household_by_invite_code: {
        Args: { invite_code: string }
        Returns: { id: string; name: string } | null
      }
      redeem_promo_code: {
        Args: { code: string }
        Returns: { success: boolean; tier: SubscriptionTier } | null
      }
    }

    Enums: {
      member_role: MemberRole
      task_status: TaskStatus
      list_category: ListCategory
      subscription_tier: SubscriptionTier
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience row aliases
// Use these throughout the codebase instead of the verbose Database path.
// e.g.  `import type { Task } from '@/types/database'`
// ---------------------------------------------------------------------------

export type Profile        = Database['public']['Tables']['profiles']['Row']
export type Household      = Database['public']['Tables']['households']['Row']
export type HouseholdMember = Database['public']['Tables']['household_members']['Row']
export type Task           = Database['public']['Tables']['tasks']['Row']
export type TaskSubtask    = Database['public']['Tables']['task_subtasks']['Row']
export type List           = Database['public']['Tables']['lists']['Row']
export type ListItem       = Database['public']['Tables']['list_items']['Row']
export type Subscription   = Database['public']['Tables']['subscriptions']['Row']
export type PromoCode      = Database['public']['Tables']['promo_codes']['Row']

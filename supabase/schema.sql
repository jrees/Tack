-- =============================================================================
-- Tack — Supabase Schema, RLS & Policies
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE throughout.
-- =============================================================================


-- =============================================================================
-- SECTION 1: TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- One row per auth user. Created automatically via handle_new_user() trigger.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url   text
);

-- -----------------------------------------------------------------------------
-- households
-- A shared space. invite_code is used to join without an email invite.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.households (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  invite_code text        NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- household_members
-- Many-to-many between users and households.
-- role: 'admin' can rename household / manage members; 'member' can do everything else.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.household_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  role         text        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

-- -----------------------------------------------------------------------------
-- tasks
-- Core unit of work. assigned_to nullable (unassigned tasks are fair game).
-- recurrence_rule stores an iCal RRULE string, e.g. FREQ=WEEKLY;BYDAY=MO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  description     text,
  created_by      uuid        NOT NULL REFERENCES auth.users(id),
  assigned_to     uuid                 REFERENCES auth.users(id),
  status          text        NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date        timestamptz,
  is_recurring    boolean     NOT NULL DEFAULT false,
  recurrence_rule text,
  category        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

-- -----------------------------------------------------------------------------
-- task_subtasks
-- Checklist items within a task.
-- household_id is denormalised here to simplify RLS (avoids a join via tasks).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  is_done      boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- lists
-- Shared lists (shopping, gifts, packing, general).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by   uuid        NOT NULL REFERENCES auth.users(id),
  title        text        NOT NULL,
  category     text        NOT NULL DEFAULT 'general' CHECK (category IN ('shopping', 'gifts', 'packing', 'general')),
  is_archived  boolean     NOT NULL DEFAULT false,
  is_pinned    boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- list_items
-- Individual items within a list. sort_order for manual drag-and-drop ordering.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.list_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id     uuid        NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  added_by    uuid        NOT NULL REFERENCES auth.users(id),
  title       text        NOT NULL,
  is_checked  boolean     NOT NULL DEFAULT false,
  checked_by  uuid                 REFERENCES auth.users(id),
  checked_at  timestamptz,
  sort_order  integer     NOT NULL DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- subscriptions
-- One row per paying/trial user. Missing row = free tier.
-- gifted_by records who granted comp access.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier                    text        NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'trial', 'pro', 'gifted')),
  trial_ends_at           timestamptz,
  current_period_ends_at  timestamptz,
  revenuecat_customer_id  text,
  gifted_by               uuid                 REFERENCES auth.users(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- promo_codes
-- Single-use codes for gifting access. Generated in the Supabase dashboard.
-- duration_days null = lifetime access.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        NOT NULL UNIQUE,
  tier        text        NOT NULL CHECK (tier IN ('free', 'trial', 'pro', 'gifted')),
  duration_days integer,
  redeemed_by uuid                 REFERENCES auth.users(id),
  redeemed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 2: ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_subtasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes       ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- SECTION 3: HELPER — reusable membership check
-- =============================================================================
-- is_household_member(household_id) returns true if the calling user
-- is in household_members for that household.
-- SECURITY DEFINER so it can read household_members without recursion.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_household_member(p_household_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members
    WHERE household_id = p_household_id
      AND user_id = auth.uid()
  );
$$;


-- =============================================================================
-- SECTION 4: RLS POLICIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- Read: any member of the same household (needed to show assignee names etc.)
-- Update: own row only.
-- Insert: handled by the handle_new_user trigger (SECURITY DEFINER).
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles: household members can read" ON public.profiles;
CREATE POLICY "profiles: household members can read"
  ON public.profiles FOR SELECT
  USING (
    -- Own profile always visible
    id = auth.uid()
    OR
    -- Profiles of people in the same household
    EXISTS (
      SELECT 1
      FROM public.household_members hm1
      JOIN public.household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.user_id = auth.uid()
        AND hm2.user_id = profiles.id
    )
  );

DROP POLICY IF EXISTS "profiles: users can update own" ON public.profiles;
CREATE POLICY "profiles: users can update own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- -----------------------------------------------------------------------------
-- households
-- Read: members only.
-- Insert: anyone authenticated (they become the first admin via app logic).
-- Update: admin members only.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "households: members can read" ON public.households;
CREATE POLICY "households: members can read"
  ON public.households FOR SELECT
  USING (public.is_household_member(id));

DROP POLICY IF EXISTS "households: authenticated users can create" ON public.households;
CREATE POLICY "households: authenticated users can create"
  ON public.households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "households: admins can update" ON public.households;
CREATE POLICY "households: admins can update"
  ON public.households FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = households.id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- household_members
-- Read: members can see who else is in their household.
-- Insert: authenticated users can join (invite code verified in app / RPC).
-- Delete: admins can remove members; members can remove themselves.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "household_members: members can read" ON public.household_members;
CREATE POLICY "household_members: members can read"
  ON public.household_members FOR SELECT
  USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "household_members: authenticated users can insert" ON public.household_members;
CREATE POLICY "household_members: authenticated users can insert"
  ON public.household_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "household_members: admins or self can delete" ON public.household_members;
CREATE POLICY "household_members: admins or self can delete"
  ON public.household_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.household_members admin_check
      WHERE admin_check.household_id = household_members.household_id
        AND admin_check.user_id = auth.uid()
        AND admin_check.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- tasks — scoped to household membership
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks: household members can read" ON public.tasks;
CREATE POLICY "tasks: household members can read"
  ON public.tasks FOR SELECT
  USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "tasks: household members can insert" ON public.tasks;
CREATE POLICY "tasks: household members can insert"
  ON public.tasks FOR INSERT
  WITH CHECK (public.is_household_member(household_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "tasks: household members can update" ON public.tasks;
CREATE POLICY "tasks: household members can update"
  ON public.tasks FOR UPDATE
  USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "tasks: household members can delete" ON public.tasks;
CREATE POLICY "tasks: household members can delete"
  ON public.tasks FOR DELETE
  USING (public.is_household_member(household_id));

-- -----------------------------------------------------------------------------
-- task_subtasks — scoped to household membership (via denormalised household_id)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "task_subtasks: household members can read" ON public.task_subtasks;
CREATE POLICY "task_subtasks: household members can read"
  ON public.task_subtasks FOR SELECT
  USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "task_subtasks: household members can insert" ON public.task_subtasks;
CREATE POLICY "task_subtasks: household members can insert"
  ON public.task_subtasks FOR INSERT
  WITH CHECK (public.is_household_member(household_id));

DROP POLICY IF EXISTS "task_subtasks: household members can update" ON public.task_subtasks;
CREATE POLICY "task_subtasks: household members can update"
  ON public.task_subtasks FOR UPDATE
  USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "task_subtasks: household members can delete" ON public.task_subtasks;
CREATE POLICY "task_subtasks: household members can delete"
  ON public.task_subtasks FOR DELETE
  USING (public.is_household_member(household_id));

-- -----------------------------------------------------------------------------
-- lists — scoped to household membership
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "lists: household members can read" ON public.lists;
CREATE POLICY "lists: household members can read"
  ON public.lists FOR SELECT
  USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "lists: household members can insert" ON public.lists;
CREATE POLICY "lists: household members can insert"
  ON public.lists FOR INSERT
  WITH CHECK (public.is_household_member(household_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "lists: household members can update" ON public.lists;
CREATE POLICY "lists: household members can update"
  ON public.lists FOR UPDATE
  USING (public.is_household_member(household_id));

DROP POLICY IF EXISTS "lists: household members can delete" ON public.lists;
CREATE POLICY "lists: household members can delete"
  ON public.lists FOR DELETE
  USING (public.is_household_member(household_id));

-- -----------------------------------------------------------------------------
-- list_items — scoped via list → household membership
-- (list_items has no household_id column, so we join through lists)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "list_items: household members can read" ON public.list_items;
CREATE POLICY "list_items: household members can read"
  ON public.list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lists l
      WHERE l.id = list_items.list_id
        AND public.is_household_member(l.household_id)
    )
  );

DROP POLICY IF EXISTS "list_items: household members can insert" ON public.list_items;
CREATE POLICY "list_items: household members can insert"
  ON public.list_items FOR INSERT
  WITH CHECK (
    added_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.lists l
      WHERE l.id = list_items.list_id
        AND public.is_household_member(l.household_id)
    )
  );

DROP POLICY IF EXISTS "list_items: household members can update" ON public.list_items;
CREATE POLICY "list_items: household members can update"
  ON public.list_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.lists l
      WHERE l.id = list_items.list_id
        AND public.is_household_member(l.household_id)
    )
  );

DROP POLICY IF EXISTS "list_items: household members can delete" ON public.list_items;
CREATE POLICY "list_items: household members can delete"
  ON public.list_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.lists l
      WHERE l.id = list_items.list_id
        AND public.is_household_member(l.household_id)
    )
  );

-- -----------------------------------------------------------------------------
-- subscriptions — users can only read/update their own row
-- Inserts/updates from webhooks use the service role key (bypasses RLS).
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "subscriptions: users can read own" ON public.subscriptions;
CREATE POLICY "subscriptions: users can read own"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- No INSERT/UPDATE policies: RevenueCat webhook Edge Function uses service role.

-- -----------------------------------------------------------------------------
-- promo_codes — no direct client access; redeemed via RPC only
-- (The redeem_promo_code RPC uses SECURITY DEFINER so it can write the table.)
-- -----------------------------------------------------------------------------
-- No client-facing policies on promo_codes — all access through the RPC.


-- =============================================================================
-- SECTION 5: FUNCTIONS & TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- handle_new_user
-- Automatically creates a profiles row when a new user signs up.
-- Runs as SECURITY DEFINER so it can INSERT into profiles regardless of RLS.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- find_household_by_invite_code
-- Allows unauthenticated/pre-join lookup of a household by invite code.
-- SECURITY DEFINER bypasses RLS (users can't read households they haven't joined yet).
-- Returns null if the code doesn't exist.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_household_by_invite_code(p_code text)
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, name
  FROM public.households
  WHERE invite_code = p_code
  LIMIT 1;
$$;

-- -----------------------------------------------------------------------------
-- redeem_promo_code
-- Marks a promo code as redeemed and upserts the user's subscription row.
-- Returns the new tier on success, or null if the code is invalid/already used.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_row public.promo_codes%ROWTYPE;
  v_ends_at  timestamptz;
BEGIN
  -- Lock the row to prevent double-redemption under concurrent requests
  SELECT * INTO v_code_row
  FROM public.promo_codes
  WHERE code = p_code AND redeemed_by IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;  -- Code doesn't exist or already redeemed
  END IF;

  -- Mark as redeemed
  UPDATE public.promo_codes
  SET redeemed_by = auth.uid(),
      redeemed_at = now()
  WHERE id = v_code_row.id;

  -- Calculate expiry (null duration_days = lifetime)
  IF v_code_row.duration_days IS NOT NULL THEN
    v_ends_at := now() + (v_code_row.duration_days || ' days')::interval;
  END IF;

  -- Upsert subscription
  INSERT INTO public.subscriptions (user_id, tier, current_period_ends_at, gifted_by, updated_at)
  VALUES (auth.uid(), v_code_row.tier, v_ends_at, v_code_row.redeemed_by, now())
  ON CONFLICT (user_id) DO UPDATE
    SET tier                   = EXCLUDED.tier,
        current_period_ends_at = EXCLUDED.current_period_ends_at,
        gifted_by              = EXCLUDED.gifted_by,
        updated_at             = now();

  RETURN v_code_row.tier;
END;
$$;

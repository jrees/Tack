# Tack — Claude Context

## What This Project Is
A mobile app for couples, families, and housemates to manage shared tasks and lists together.
Think simplified Jira for household management — collaborative, not punitive.
Named after the sailing term: changing direction together as a crew.

## Developer Background
- Experienced .NET/Blazor developer, newer to React Native and the JS/TS ecosystem.
- Make Blazor/C# analogies where helpful (e.g. Zustand ≈ a service singleton, Expo Router ≈ Blazor routing).

## Environment
- OS: Linux Mint, i5, 12GB RAM
- Phone: Android (partner has iPhone — must support both)
- Editor: VS Code
- Node: managed via nvm

## Environment Variables
Required in `.env` (gitignored). See `.env.example` for the template.

| Variable | Where to get it |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API |
| `EXPO_PUBLIC_SENTRY_DSN` | sentry.io → Project → Settings → Client Keys (DSN) |

## Tech Stack
| Concern | Choice |
|---|---|
| Framework | React Native with Expo (TypeScript, SDK 55) |
| Routing | Expo Router (file-based, like Next.js / Blazor routing) |
| Backend / DB / Auth | Supabase |
| Real-time | Supabase Realtime subscriptions |
| State management | Zustand |
| Localisation | i18next + react-i18next + expo-localization |
| No separate backend | React Native → Supabase directly |

## Project Structure (target)
```
Tack/
  app/
    _layout.tsx              # Root layout, auth gate, i18n init
    (auth)/
      _layout.tsx
      login.tsx
      register.tsx
      forgot-password.tsx
      update-password.tsx
    (household)/
      _layout.tsx
      setup.tsx
    (app)/
      _layout.tsx            # Tab navigator
      index.tsx              # Dashboard
      tasks.tsx              # Task board
      settings.tsx
      lists/
        _layout.tsx
        index.tsx            # All lists
        [id].tsx             # Individual list
  components/                # Shared UI components
  lib/
    supabase.ts              # Supabase client singleton
    theme.ts                 # Design tokens (plain exported object)
    i18n.ts                  # i18next configuration
    suggestions.ts           # Shopping list suggestions
    plans.ts                 # Subscription tiers and plan limits
  stores/
    authStore.ts
    householdStore.ts
    taskStore.ts
    listStore.ts
  types/
    database.ts              # Hand-written Supabase types
  locales/
    en.json                  # English strings (source of truth)
```

## Theming
- Plain exported object — `import { theme } from '@/lib/theme'` — no hooks, no context.
- Light mode first. Dark mode added after fonts confirmed on Android (Phase 7, issue #31).
- Theme object exposes `light` and `dark` colour sets; components select by colour scheme.
- Spacing scale: `xs(4)`, `sm(8)`, `md(16)`, `lg(24)`, `xl(32)`.
- Font tokens: `display` (Lora_700Bold), `heading` (Lora_600SemiBold), `label` (Nunito_600SemiBold).

### Colour Palette — Light (Day Sailing)
Nautical identity: muted port-side blue + weathered signal red on sail-canvas parchment.

| Token | Hex | Feeling |
|---|---|---|
| `background` | `#F5F2EE` | Sail canvas / parchment |
| `surface` | `#FDFAF6` | Card / panel |
| `border` | `#E0D9D0` | Natural rope |
| `primary` | `#3A7DB5` | Port-side blue |
| `primaryLight` | `#D4E4F0` | Light sea wash |
| `secondary` | `#B8736B` | Weathered signal buoy red |
| `secondaryLight` | `#F0DADA` | Light red wash |
| `text` | `#2C3440` | Near-black navy |
| `textSecondary` | `#7A8494` | Mid nautical grey |
| `textMuted` | `#A8B0BC` | Haze |
| `success` | `#2E8B57` | Sea-green |
| `warning` | `#C4895A` | Brass / lantern amber |
| `error` | `#C0392B` | Signal red |

### Colour Palette — Dark (Night Sailing)
Deep-sea navy backgrounds; moonlit text; accents lifted for contrast against dark.

| Token | Hex | Feeling |
|---|---|---|
| `background` | `#0D1B2A` | Deep night sea |
| `surface` | `#1A2B3C` | Chart table below decks |
| `border` | `#2A3D52` | Subtle hull seam |
| `primary` | `#7BB8D4` | Moonlit blue |
| `primaryLight` | `#1A3A52` | Deep blue wash |
| `secondary` | `#C4736B` | Signal red (lifted for contrast) |
| `secondaryLight` | `#3D1E1E` | Dark red wash |
| `text` | `#E8DEC8` | Moonlit parchment |
| `textSecondary` | `#9AACBA` | Faded chart ink |
| `textMuted` | `#5A7080` | Night haze |
| `success` | `#2E8B57` | Phosphorescence |
| `warning` | `#C4895A` | Brass lantern |
| `error` | `#C0392B` | Warning red |

### Usage Pattern
```ts
import { theme } from '@/lib/theme'
import { useColorScheme } from 'react-native'

// Inside component:
const scheme = useColorScheme() ?? 'light'
const c = theme.colors[scheme]
const styles = StyleSheet.create({
  container: { backgroundColor: c.background, padding: theme.spacing.md }
})
```

## Localisation (i18n)
- **No hardcoded strings anywhere in the app** — every label, button, message goes through `t()`.
- All strings live in `locales/en.json`, namespaced by feature: `common`, `auth`, `household`, `tasks`, `lists`, `settings`.
- Device language detected automatically via `expo-localization`.
- Add a language by adding a matching JSON file (e.g. `locales/sv.json` for Swedish).
- TypeScript types generated from `locales/en.json` for autocomplete and compile-time safety.
- Usage:
  ```tsx
  const { t } = useTranslation()
  <Button title={t('common.save')} />
  <Text>{t('tasks.empty')}</Text>
  // With interpolation:
  t('common.greeting', { name: 'John' })
  // With pluralisation:
  t('tasks.count', { count: 3 })
  ```

## Data Model
### auth.users (Supabase managed)
Extended via `public.profiles` (id FK to auth.users, display_name, avatar_url).

### households
`id, name, created_at, invite_code`

### household_members
`id, household_id, user_id, role (admin|member), joined_at`

### tasks
`id, household_id, title, description, created_by, assigned_to (nullable),`
`status (todo|in_progress|done), due_date, is_recurring, recurrence_rule,`
`category, created_at, completed_at`

### task_subtasks
`id, task_id, household_id, title, is_done, created_at`

### lists
`id, household_id, created_by, title, category (shopping|gifts|packing|general),`
`is_archived, is_pinned, created_at`

### list_items
`id, list_id, added_by, title, is_checked, checked_by, checked_at, sort_order`

### subscriptions
`id, user_id (FK auth.users), tier ('free'|'trial'|'pro'|'gifted'),`
`trial_ends_at, current_period_ends_at, revenuecat_customer_id, gifted_by, created_at, updated_at`
- Missing row = free tier (no row created on signup)
- `gifted_by` records who granted comp access

### promo_codes
`id, code (unique), tier, duration_days (null = lifetime), redeemed_by, redeemed_at, created_at`
- Single-use codes for gifting access; redeemed via `redeem_promo_code(code)` RPC

## Row Level Security Principles
- Every table locked down by default.
- Users can only read/write rows belonging to their household.
- Household membership is the trust boundary — verified via `household_members`.
- `find_household_by_invite_code` RPC uses `SECURITY DEFINER` to allow pre-join lookup.

## Implementation Phases
| Phase | Focus |
|---|---|
| 1 | Foundation: scaffold, theme, Supabase client, types, schema/RLS, i18n |
| 2 | Auth: login, register, password reset, root layout |
| 3 | Household: create, join via invite code |
| 4 | Lists: shared lists, real-time item check-off |
| 5 | Tasks: task board, recurring tasks, subtasks, assignees |
| 6 | Dashboard: overview screen |
| 7 | Polish: settings, fonts, tab navigator, dark mode |
| 8 | Auth extensions: Google Sign-In, Apple Sign-In (requires dev build) |
| 9 | Future: push notifications |
| 10 | Monetization: RevenueCat IAP, paywall, promo codes, entitlement gates |

## Product Principles
- **Simple UX** — everyday household use, not power users. Fewer taps is better.
- **Real-time sync** — all users see changes instantly (Supabase subscriptions).
- **Collaborative tone** — no surveillance, no nagging. Feels like a shared whiteboard.
- **Inclusive** — designed for couples, families, housemates, any small group sharing a space.

## Key Conventions
- TypeScript strict mode throughout.
- Prefer `async/await` over `.then()` chains.
- All Supabase calls go through `lib/supabase.ts` — never import the client directly elsewhere.
- Zustand stores own remote data fetching; components just read from the store.
- Use `expo-secure-store` for sensitive local storage.
- Follow Expo Router conventions: group directories with `()`, dynamic segments with `[]`.
- **Never use `Alert.alert()`** — all feedback is inline or via bottom sheets.
- All strings go through `t()` from `react-i18next` — no hardcoded UI text.

## Known Android Gotchas (lessons from prior project)
- **Install `expo-file-system`** — required for `expo-font` to load correctly on Android.
  Without it, vector icons silently render as CJK characters.
- **Gate `SplashScreen.hideAsync()`** on both auth loading AND fonts loaded.
- **`npx expo start --clear` does NOT clear Expo Go device cache.**
  To fully reset: Settings → Apps → Expo Go → Storage → Clear Cache + Clear Data.
- **Confirm fonts and icons on physical Android device before enabling dark mode.**
- **Native auth (Google, Apple Sign-In) does not work in Expo Go** — requires a dev build.

## Monetization / Freemium

### Model
Freemium with a household **member limit** as the gate. Free tier is genuinely useful for couples;
paid unlocks unlimited members for families and housemates.

| Tier | Max members | Max lists | Max tasks |
|---|---|---|---|
| `free` | 2 | 5 | 20 |
| `trial` | unlimited | unlimited | unlimited |
| `pro` | unlimited | unlimited | unlimited |
| `gifted` | unlimited | unlimited | unlimited |

Limits live in `lib/plans.ts` (`PLAN_LIMITS`) — never hardcode them in components.

### Subscription infrastructure
- **RevenueCat** handles App Store (iOS) and Google Play billing via a single SDK
- RevenueCat webhooks → Supabase Edge Function → `subscriptions` table
- `authStore` exposes `tier: SubscriptionTier` — components read this to check entitlements

### Usage pattern
```ts
import { PLAN_LIMITS } from '@/lib/plans'
import { useAuthStore } from '@/stores/authStore'

const tier = useAuthStore(s => s.tier)
const canAddMember = memberCount < PLAN_LIMITS[tier].maxMembers
```

### Gift / comp access
- `gifted` tier granted via single-use promo codes (stored in `promo_codes` table)
- Codes are generated offline (Supabase dashboard) and shared privately
- A hidden "Enter promo code" field in Settings allows self-service redemption
- `gifted` is distinct from `pro` so comped users are identifiable in the DB

### Free trial
- Trial period configured in App Store Connect / Google Play Console
- RevenueCat webhook updates `subscriptions.tier = 'trial'` and `trial_ends_at`
- Settings screen shows a countdown banner during trial; no hard blocks

## GitHub
- Repo: https://github.com/jrees/Tack
- Project board: https://github.com/users/jrees/projects/2
- Issues use phase labels (`phase-1` through `phase-10`) and type labels
  (`setup`, `supabase`, `feature`, `auth`, `ui`, `i18n`, `store`, `realtime`, `navigation`, `billing`)

## GitHub Issues Labels
- `setup` — scaffolding and tooling
- `supabase` — database, auth, RLS
- `feature` — product functionality
- `navigation` — routing and screen structure
- `auth` — authentication flows
- `ui` — components and styling
- `i18n` — localisation
- `store` — Zustand state management
- `realtime` — Supabase realtime subscriptions
- `billing` — in-app purchases and subscription management

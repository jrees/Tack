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
| `primary` | `#4A7BA7` | Muted port-side blue |
| `primaryLight` | `#D4E4F0` | Light sea wash |
| `secondary` | `#B8736B` | Weathered signal buoy red |
| `secondaryLight` | `#F0DADA` | Light red wash |
| `text` | `#2C3440` | Near-black navy |
| `textSecondary` | `#7A8494` | Mid nautical grey |
| `textMuted` | `#A8B0BC` | Haze |
| `success` | `#5A9B7A` | Sea-green |
| `warning` | `#C4895A` | Brass / lantern amber |
| `error` | `#B8504A` | Signal red (deeper) |

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
| `success` | `#5AB87A` | Phosphorescence |
| `warning` | `#C4895A` | Brass lantern |
| `error` | `#C45A52` | Warning red |

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

## GitHub
- Repo: https://github.com/jrees/Tack
- Project board: https://github.com/users/jrees/projects/2
- Issues use phase labels (`phase-1` through `phase-9`) and type labels
  (`setup`, `supabase`, `feature`, `auth`, `ui`, `i18n`, `store`, `realtime`, `navigation`)

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

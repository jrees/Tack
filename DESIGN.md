# Tack — Design Reference

A living document for UI consistency. Update it when design decisions are made. Check it before building new screens.

---

## Brand Personality

**Nautical. Collaborative. Warm.**

Tack is not a productivity app. It's a shared whiteboard for people who live together. The tone should feel like a well-organised sailing crew — capable and calm, not clinical or corporate. Every screen should feel like it belongs to a real household, not a SaaS dashboard.

- **Warm** — parchment backgrounds, serif wordmark, friendly copy
- **Calm** — no aggressive red CTAs, no alarming empty states, no badge counts as pressure
- **Collaborative** — language is "we/us/your household", never surveillance or blame

---

## Colour Usage

Full palette in `lib/theme.ts`. Guidance on *when* to use each token:

| Token | Use for |
|---|---|
| `background` | Screen backgrounds only |
| `surface` | Cards, input fields, bottom sheets, modals |
| `border` | Input borders (unfocused), dividers, separators |
| `primary` | Primary actions (buttons), focused inputs, links, active nav |
| `primaryLight` | Subtle highlights, selected state backgrounds |
| `secondary` | Secondary actions, category badges, accents — use sparingly |
| `secondaryLight` | Secondary badge backgrounds |
| `text` | Body copy, headings |
| `textSecondary` | Form labels, supporting copy, subheadings |
| `textMuted` | Placeholder text, disabled labels, timestamps |
| `success` | Completion states (task done, item checked) |
| `warning` | Time-sensitive nudges (trial expiry) — not errors |
| `error` | Validation errors, destructive action confirmations only |

**Rules:**
- Never use `error` red for anything that isn't actually an error — not decorative, not brand
- `secondary` (red-brown) is an accent, not a second primary — one or two uses per screen maximum
- Avoid full black text — `text` (`#2C3440`) is the darkest you need

---

## Typography

Fonts loaded in root layout. Three roles:

| Token | Font | Use for |
|---|---|---|
| `display` | Lora_700Bold | App wordmark only |
| `heading` | Lora_600SemiBold | Screen titles, section headers |
| `label` | Nunito_600SemiBold | Form labels, button text, navigation, links |
| `body` | Nunito_400Regular | Body copy, supporting text, taglines, secondary UI text |

**Size scale (approximate):**
- Wordmark: 52px display
- Screen title: 24–28px heading
- Section header: 18–20px heading
- Form label: 14px label
- Body / supporting: 14–16px body
- Microcopy / caption: 12–13px body

**Rules:**
- Never use `label` (semi-bold) for long-form reading — too heavy, tiring
- Always pair a heading with a subordinate `body` weight nearby for visual rhythm
- Minimum readable size: 13px. Don't go below for any visible text

---

## Spacing

Scale from `lib/theme.ts`:

| Token | Value | Use for |
|---|---|---|
| `xs` | 4px | Icon padding, tight micro-gaps |
| `sm` | 8px | Gaps within a component (label → input) |
| `md` | 16px | Standard component margin/padding, gaps between related items |
| `lg` | 24px | Gaps between sections |
| `xl` | 32px | Screen-level padding, major section separators |

---

## Interactive Elements

### Tap Targets
- **Minimum 44×44pt** for any tappable element — Apple HIG requirement, good for everyone
- `paddingVertical` on text links must be at least `theme.spacing.sm` (8px) — preferably `md` (16px)
- Icon-only buttons need explicit width/height of 44pt minimum

### Buttons
- `PrimaryButton`: height 54, `borderRadius: theme.radius.lg` (16px), `primary` fill, `surface` text
- Future secondary button: height 48, `borderRadius: theme.radius.lg`, `border` outline, `primary` text
- Future destructive button: same as secondary but `error` outline and text
- Loading state: replace label with `ActivityIndicator` — never disable without visual feedback
- Disabled state: opacity 0.65 on the button, not on a wrapper

### Form Inputs
- Height: ~48px effective (12px vertical padding + 16px font)
- Unfocused border: `c.border`
- Focused border: `c.primary`
- Error border: `c.error`
- Background: `c.surface` (slightly lighter than page background — creates depth)
- Placeholder: `c.textMuted`
- Password fields always include a Show/Hide toggle

### Error States
- Field errors: appear below the field in `error` colour, `body` font 13px, left-aligned
- Form-level errors (e.g. wrong credentials): appear above the submit button, left-aligned
- Never use `Alert.alert()` — all errors are inline

---

## Layout Conventions

- Screen padding: `paddingHorizontal: theme.spacing.lg` (24px)
- Auth screens: vertically centred content with `justifyContent: 'center'`
- Content screens: top-aligned, scrollable
- Cards/surfaces: `borderRadius: theme.radius.lg` (16px), `backgroundColor: c.surface`
- Use `SafeAreaView` from `react-native-safe-area-context` for all screens

---

## Copy & Voice

**Write like a person, not a product.**

| Situation | Do | Don't |
|---|---|---|
| Empty state | "Nothing here yet — add your first task" | "No items found" |
| Error | "That didn't work. Give it another try?" | "Error code 500" |
| Success | "Done!" / "Saved" | "Operation successful" |
| Destructive confirm | "Yes, delete this" | "Confirm" |
| Loading | "Loading…" (with ellipsis) | "Please wait" |

- Use contractions: "Don't", "You're", "It's"
- Address the user as "you" — not "the user", not impersonal
- Avoid exclamation marks except for genuine celebrations (task completed, household created)
- Error messages should say *what happened* and *what to do* — one sentence each

---

## Screen Checklist

Before shipping any new screen, verify:

- [ ] All strings go through `t()` — no hardcoded UI text
- [ ] Colour scheme uses `useColorScheme() === 'dark' ? 'dark' : 'light'` pattern
- [ ] All tappable elements meet 44pt minimum
- [ ] Loading, error, and empty states are handled
- [ ] Form inputs have validation with inline errors (no `Alert.alert()`)
- [ ] `KeyboardAvoidingView` wraps any screen with inputs
- [ ] `SafeAreaView` is the outermost container
- [ ] `tsc --noEmit` passes clean

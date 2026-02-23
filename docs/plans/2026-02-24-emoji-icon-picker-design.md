# Emoji Icon Picker for Services & Garment Types

## Problem

When creating custom categories or garment types, users get generic auto-assigned emojis (e.g. ⚙️ for custom categories, 📝 for custom garment types). There's no way to change these icons. Users want to personalize the emoji icons, especially for custom entries.

## Decision

- Add a full emoji picker (emoji-mart library) to both category and garment type creation/edit flows
- Keep auto-assignment as the default, with an override option
- No database changes needed — `category.icon` and `garment_type.icon` columns already exist

## Design

### Emoji Picker Component

New reusable component: `src/components/ui/emoji-picker.tsx`

- Uses `@emoji-mart/react` + `@emoji-mart/data` for full emoji set with search, categories, skin tones, recents
- Renders as a tappable button showing the current emoji with a small pencil overlay
- On tap, opens the emoji-mart picker in a popover/bottom sheet
- On selection, calls `onSelect(emoji: string)` and closes
- Mobile-friendly touch targets

### Category Flow (services-step-new.tsx)

**Create form** (currently name-only):
- Add emoji button to the left of the name input
- Auto-assigns emoji when user types a name (existing keyword logic)
- User can tap the emoji to override via picker
- Selected emoji sent to API as `icon` field

**Edit form** (currently name-only):
- Show current emoji as tappable button next to name input
- Name changes auto-update emoji only if user hasn't manually overridden
- Selected emoji sent to API

### Garment Type Flow (garment-services-step.tsx)

**Custom type creation**:
- Currently hardcodes 📝 for custom types
- Add emoji button defaulting to 📝 next to the type name input
- User can tap to change via picker
- Sends icon to existing `/api/admin/garment-types` POST (already accepts `icon`)

### API Changes (categories/route.ts)

**POST** — Accept optional `icon` field. If provided, use it; otherwise fall back to `getIconForCategory()`.

**PUT** — Accept optional `icon` field. If provided, use it; otherwise auto-recalculate from name (existing behavior).

### Files Touched

1. **New**: `src/components/ui/emoji-picker.tsx`
2. **Edit**: `src/components/intake/services-step-new.tsx` — category create/edit forms
3. **Edit**: `src/components/intake/garment-services-step.tsx` — garment type create
4. **Edit**: `src/app/api/admin/categories/route.ts` — accept optional `icon` param
5. **New dep**: `@emoji-mart/react`, `@emoji-mart/data`

### No DB Changes

- `category.icon` — VARCHAR(10), already exists
- `garment_type.icon` — VARCHAR(10), already exists

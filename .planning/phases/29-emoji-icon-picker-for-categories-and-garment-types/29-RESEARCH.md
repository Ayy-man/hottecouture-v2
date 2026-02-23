# Phase 29: Emoji Icon Picker for Categories and Garment Types - Research

**Researched:** 2026-02-24
**Domain:** React emoji picker component, Next.js 14 dynamic import, Radix UI Popover integration
**Confidence:** HIGH

---

## Summary

Phase 29 adds a full emoji picker to two flows: category creation/editing in `services-step-new.tsx` and garment type creation in `garment-services-step.tsx`. The design decision is locked to `@emoji-mart/react` + `@emoji-mart/data`. No database changes are required — the `icon` columns already exist as `VARCHAR(10)` on both `category` and `garment_type` tables.

The critical technical constraint is SSR. `@emoji-mart/react` uses browser-only APIs (Shadow DOM, custom elements, IntersectionObserver). In Next.js 14, the Picker **must** be loaded with `dynamic(..., { ssr: false })` or `React.lazy()` inside a `'use client'` component. Both target components are already `'use client'`, so the wrapping boundary is already correct. The Picker just needs to be dynamically imported inside the new `EmojiPicker` wrapper component.

The project already has `@radix-ui/react-popover` installed (confirmed in `package.json`). The existing `src/components/ui/popover.tsx` wraps the Radix primitive. This means no additional popover infrastructure is needed — the `EmojiPicker` component can use the existing `Popover`, `PopoverTrigger`, and `PopoverContent` directly to host the picker panel. On mobile (iPad), the Radix popover renders in a portal and avoids viewport clipping, which is the primary UX concern given the category tabs are small touch targets.

The categories API (`route.ts`) currently does **not** accept an `icon` field in POST or PUT. The POST body only reads `name`, and PUT only reads `id` and `name`. Auto-assignment always happens via `getIconForCategory()`. These handlers need a small surgical edit to accept an optional `icon` param and skip auto-assignment when it is provided. The garment-types API already accepts `icon` in its POST body — no changes needed there.

**Primary recommendation:** Use `dynamic(() => import('@emoji-mart/react'), { ssr: false })` inside a dedicated `src/components/ui/emoji-picker.tsx` wrapper. Expose a controlled `<EmojiPicker value={emoji} onSelect={(emoji) => void} />` API. Mount it inside the existing Radix Popover. Wire it into both category and garment type forms with an `icon` state variable that tracks user-overridden vs. auto-assigned status.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@emoji-mart/react` | 1.1.1 | React wrapper for emoji-mart Picker | The only official React adapter for emoji-mart; peers require `emoji-mart ^5.2` |
| `@emoji-mart/data` | 1.2.1 | Full emoji dataset (compact JSON ~200KB) | Required by Picker; avoids network fetch; ships the full set with search/categories |
| `emoji-mart` | 5.6.0 (peer dep pulled automatically) | Core library behind the React wrapper | Peer dep of `@emoji-mart/react`; installed transitively |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-popover` | already installed (^1.1.1) | Popover container for the picker | Already in `package.json`; provides portal-based positioning that avoids z-index/overflow issues |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@emoji-mart/react` | `emoji-picker-react` | `emoji-picker-react` is more actively maintained (2024 updates) and has better TypeScript types, but the design decision is locked to `@emoji-mart/react` |
| `@emoji-mart/react` | Native textarea with OS emoji keyboard | Zero bundle cost, but no search/filtering or consistent cross-platform UX |
| Radix Popover | Fixed bottom sheet (modal overlay) | Bottom sheet is better on very small phones; Radix Popover is simpler to implement given existing infrastructure |

**Installation:**
```bash
npm install @emoji-mart/react @emoji-mart/data
```

Note: `emoji-mart` itself is a peer dep of `@emoji-mart/react` and will be installed automatically alongside it. You do not need to install it separately.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/ui/
│   └── emoji-picker.tsx       # New: reusable EmojiPicker component
├── components/intake/
│   ├── services-step-new.tsx  # Edit: add icon state to category create/edit
│   └── garment-services-step.tsx  # Edit: add icon state to custom type create
└── app/api/admin/categories/
    └── route.ts               # Edit: accept optional `icon` in POST and PUT
```

### Pattern 1: Dynamic Import (SSR Guard)
**What:** Wrap the emoji-mart Picker in a `dynamic()` call with `ssr: false` inside a `'use client'` component.
**When to use:** Any time an emoji-mart component is rendered. Without this, Next.js throws on server render because emoji-mart reads `window` and registers custom elements.
**Example:**
```typescript
// src/components/ui/emoji-picker.tsx
'use client';

import dynamic from 'next/dynamic';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import data from '@emoji-mart/data';
import { useState } from 'react';

// CRITICAL: ssr: false prevents "window is not defined" on server render
const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false });

interface EmojiPickerProps {
  value: string;           // current emoji (shown on button)
  onSelect: (emoji: string) => void;  // called with emoji.native (e.g. "✂️")
  disabled?: boolean;
}

export function EmojiPicker({ value, onSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="relative w-9 h-9 text-lg flex items-center justify-center rounded border border-border hover:border-primary-400 touch-manipulation min-h-[44px] min-w-[44px]"
          aria-label="Choisir un emoji"
        >
          {value}
          <span className="absolute bottom-0 right-0 text-[9px] bg-white rounded-full leading-none">✏️</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-0 shadow-xl" align="start">
        <Picker
          data={data}
          onEmojiSelect={(emoji: any) => {
            if (emoji?.native) {
              onSelect(emoji.native);
              setOpen(false);
            }
          }}
          theme="light"
          locale="fr"
          previewPosition="none"
          skinTonePosition="none"
        />
      </PopoverContent>
    </Popover>
  );
}
```

### Pattern 2: Icon State with Auto/Override Tracking
**What:** Track both the current emoji value AND whether the user has manually overridden it. Auto-assignment re-runs only when the user has not overridden.
**When to use:** Category create/edit forms where typing the name auto-suggests an icon.
**Example:**
```typescript
// In services-step-new.tsx — category create form
const [newCategoryName, setNewCategoryName] = useState('');
const [newCategoryIcon, setNewCategoryIcon] = useState('📦');
const [iconManuallySet, setIconManuallySet] = useState(false);

// Auto-assign icon when name changes (only if not manually overridden)
const handleNameChange = (name: string) => {
  setNewCategoryName(name);
  if (!iconManuallySet) {
    // Call the same getIconForCategory-equivalent logic client-side
    // or simply rely on server auto-assign (easier: just send icon field if set)
    setNewCategoryIcon(getIconForCategoryClient(name));
  }
};

const handleIconSelect = (emoji: string) => {
  setNewCategoryIcon(emoji);
  setIconManuallySet(true);
};

// On create: pass icon to API
body: JSON.stringify({ name: newCategoryName.trim(), icon: newCategoryIcon })
```

### Pattern 3: Categories API icon Override
**What:** Modify POST and PUT handlers to accept an optional `icon` field. If provided, use it; otherwise fall back to `getIconForCategory()`.
**When to use:** Always for this phase.
**Example:**
```typescript
// POST handler — current:
const key = generateCategoryKey(name.trim());
const icon = getIconForCategory(name.trim());

// POST handler — updated:
const { name, icon: iconOverride } = body;
const key = generateCategoryKey(name.trim());
const icon = iconOverride && iconOverride.trim() ? iconOverride.trim() : getIconForCategory(name.trim());

// PUT handler — current:
const { id, name } = body;
const icon = getIconForCategory(name.trim());  // always recalculates

// PUT handler — updated:
const { id, name, icon: iconOverride } = body;
const icon = iconOverride && iconOverride.trim() ? iconOverride.trim() : getIconForCategory(name.trim());
```

### Anti-Patterns to Avoid
- **Importing `@emoji-mart/react` at module scope without dynamic:** SSR will crash. The `'use client'` boundary alone is not enough — `dynamic(..., { ssr: false })` is required because Next.js pre-renders client components on the server during SSG/SSR passes.
- **Storing the full emoji object instead of `emoji.native`:** The `onEmojiSelect` callback receives a rich object. Only `emoji.native` (the Unicode string e.g. `"✂️"`) should be stored. The database column is `VARCHAR(10)`.
- **Bundling `@emoji-mart/data` in the same chunk as the Picker:** Since we import `data` at module scope (`import data from '@emoji-mart/data'`), it's bundled with the `emoji-picker.tsx` component. This is fine because the Picker itself is dynamically imported (separate chunk). The data (~200KB) rides with the static wrapper, but only loads when the EmojiPicker component is mounted.
- **Using the Radix Popover `className` to set width directly:** The emoji-mart Picker has its own internal width (defaults to ~352px). Set `w-auto` on `PopoverContent` and let the Picker control its own dimensions.
- **Calling `loadCategories()` after an icon-only update:** The category create/edit handlers already update state directly without a reload (`setCategories(...)` inline). Maintain this pattern — pass the returned `result.category` (which now includes the icon) into state directly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full emoji dataset with search | Custom emoji list | `@emoji-mart/data` | 3,000+ emojis, keyword search, skin tones, categories, i18n — months of work to replicate |
| Emoji picker UI | Custom grid + scroll | `@emoji-mart/react` Picker | Handles virtual scrolling, recents, search, keyboard nav, accessibility |
| Popover positioning | Custom absolute positioning | Existing `@radix-ui/react-popover` (already installed) | Handles viewport clipping, scroll containers, portal rendering — all major pain points on iPad |
| Auto-icon suggestion | New client-side keyword map | Re-use the existing `getIconForCategory()` logic already in `route.ts` | The function is already there; replicate it client-side (or just trust the API auto-assign when no override is given) |

**Key insight:** The heavy lifting (emoji data, picker UI, popover positioning) is already solved by existing or easily added dependencies. The implementation is purely integration work.

---

## Common Pitfalls

### Pitfall 1: SSR crash ("window is not defined")
**What goes wrong:** Build fails or page throws during server render because emoji-mart registers web components using `window`.
**Why it happens:** Next.js 14 pre-renders all `'use client'` components on the server. Even if `EmojiPicker` is client-only, the import graph runs on the server during pre-rendering.
**How to avoid:** Use `const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false })` — this removes the module from the server render graph entirely.
**Warning signs:** Build error containing `window is not defined` or `document is not defined` during `next build`.

### Pitfall 2: Popover clipped by overflow:hidden ancestors
**What goes wrong:** The picker opens but is cut off by the overflow-hidden containers in the category tab bar or dropdown.
**Why it happens:** Both target forms live inside components with `overflow-hidden` or `overflow-y-auto` containers. A standard `position: absolute` popover cannot escape these containers.
**How to avoid:** Radix `PopoverContent` renders inside a Portal (appended to `<body>`) via `PopoverPrimitive.Portal` — confirmed in `src/components/ui/popover.tsx` line 13. The existing `Popover`/`PopoverContent` components already handle this correctly. No extra work needed.
**Warning signs:** Picker appears but is visually cropped; viewport is not scrolled when picker opens.

### Pitfall 3: Category tab layout breaks when emoji picker button is added
**What goes wrong:** The compact category tab grid (`grid-cols-3`, `grid-cols-5`, etc.) in `services-step-new.tsx` overflows or wraps when an additional button element is added inside each tab cell.
**Why it happens:** The category tab buttons are extremely compact (px-1, py-1, text-xs). Adding a tappable emoji button increases the cell height.
**How to avoid:** In edit mode, the emoji picker button replaces the existing icon display (the `<span className='text-sm'>{category.icon}</span>`). In normal display mode (non-editing), the icon is just a static `<span>`. The picker only appears inside the inline edit form, not on the static tab button itself. This keeps the tab bar layout unchanged.
**Warning signs:** Category tab bar wraps to two rows after adding the picker.

### Pitfall 4: `emoji.native` is undefined for some emoji
**What goes wrong:** Clicking an emoji does nothing or stores undefined.
**Why it happens:** Some custom emojis or emoji variants may not have a `native` property if they are not standard Unicode emoji.
**How to avoid:** Guard with `if (emoji?.native) { onSelect(emoji.native); }`. If `native` is absent, ignore the selection. In practice, all standard emoji in `@emoji-mart/data` have `native` set.
**Warning signs:** Icon field shows blank after selection; `onSelect` is called with `undefined`.

### Pitfall 5: Stale icon in category state after edit
**What goes wrong:** After editing a category name and icon, the tab bar still shows the old icon.
**Why it happens:** The PUT response includes the updated category, but the `setCategories` state update uses the `result.category` object. If the PUT handler is not updated to persist the icon override (and instead recalculates from name), the returned `result.category.icon` will be the auto-assigned icon, not the user's choice.
**How to avoid:** Update the PUT handler to save the user-provided icon. Verify `result.category.icon` matches the selected emoji before updating state.
**Warning signs:** After saving an edit, the tab reverts to the auto-assigned emoji.

---

## Code Examples

Verified patterns from official sources and codebase analysis:

### Install and import
```bash
npm install @emoji-mart/react @emoji-mart/data
```

```typescript
// Dynamic import — confirmed working pattern for Next.js 14 App Router
// Source: https://github.com/missive/emoji-mart/discussions/736
import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';

const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false });
```

### Minimum viable Picker usage
```typescript
// Source: emoji-mart README + onEmojiSelect confirmed in search results
<Picker
  data={data}
  onEmojiSelect={(emoji: any) => console.log(emoji.native)}  // e.g. "✂️"
  theme="light"
  locale="fr"
  previewPosition="none"   // hides bottom emoji preview bar (saves vertical space)
  skinTonePosition="none"  // hides skin tone picker (simplifies UI)
/>
```

### Wiring EmojiPicker into category create form (services-step-new.tsx)
```typescript
// Add state variables alongside existing newCategoryName state:
const [newCategoryIcon, setNewCategoryIcon] = useState('📦');
const [newCategoryIconOverridden, setNewCategoryIconOverridden] = useState(false);

// In the add-category form JSX (around line 1092):
// Replace the plain text input row with:
<div className='flex items-center gap-2'>
  <EmojiPicker
    value={newCategoryIcon}
    onSelect={(emoji) => {
      setNewCategoryIcon(emoji);
      setNewCategoryIconOverridden(true);
    }}
  />
  <input
    type='text'
    value={newCategoryName}
    onChange={e => {
      setNewCategoryName(e.target.value);
      if (!newCategoryIconOverridden) {
        setNewCategoryIcon(getIconForCategoryClient(e.target.value));
      }
    }}
    // ... existing props
  />
</div>

// In handleCreateCategory, add icon to body:
body: JSON.stringify({ name: newCategoryName.trim(), icon: newCategoryIcon })
```

### Wiring EmojiPicker into category edit form (services-step-new.tsx)
```typescript
// Add to existing edit state (alongside editCategoryName):
const [editCategoryIcon, setEditCategoryIcon] = useState('');
const [editCategoryIconOverridden, setEditCategoryIconOverridden] = useState(false);

// In handleStartEditCategory, populate icon:
setEditCategoryIcon(category.icon);
setEditCategoryIconOverridden(false);  // reset override flag

// In edit mode JSX (around line 969-998):
<div className='flex items-center gap-2'>
  <EmojiPicker
    value={editCategoryIcon}
    onSelect={(emoji) => {
      setEditCategoryIcon(emoji);
      setEditCategoryIconOverridden(true);
    }}
  />
  <input ... />
</div>

// In handleSaveEditCategory:
body: JSON.stringify({ id: editingCategoryId, name: editCategoryName.trim(), icon: editCategoryIcon })
```

### Wiring EmojiPicker into garment type create form (garment-services-step.tsx)
```typescript
// Add to existing custom type state (alongside customTypeName):
const [customTypeIcon, setCustomTypeIcon] = useState('\u{1F4DD}');  // 📝

// In handleCreateCustomType (around line 344), change hardcoded icon:
// Before: icon: '\u{1F4DD}'
// After:  icon: customTypeIcon

// In the form JSX (around line 755-770), add emoji picker before name input:
<div className='flex items-center gap-2'>
  <EmojiPicker
    value={customTypeIcon}
    onSelect={(emoji) => setCustomTypeIcon(emoji)}
  />
  <input
    type='text'
    value={customTypeName}
    // ... existing props
  />
</div>

// Reset icon in form cancel/success handlers:
setCustomTypeIcon('\u{1F4DD}');
```

### Client-side auto-icon suggestion (optional — for auto-assign-on-name-type UX)
```typescript
// Replicate the server's getIconForCategory logic client-side
// (only needed if auto-assign-on-type is desired; otherwise just rely on API default)
function getIconForCategoryClient(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('alter') || lower.includes('hem') || lower.includes('sew')) return '✂️';
  if (lower.includes('accessor') || lower.includes('trim')) return '🧵';
  if (lower.includes('fabric') || lower.includes('textile')) return '🪡';
  if (lower.includes('curtain') || lower.includes('blind')) return '🪟';
  if (lower.includes('custom') || lower.includes('special') || lower.includes('other')) return '⚙️';
  if (lower.includes('home') || lower.includes('decor')) return '🏠';
  if (lower.includes('outdoor') || lower.includes('camp')) return '🏕️';
  if (lower.includes('formal') || lower.includes('wedding')) return '👔';
  if (lower.includes('active') || lower.includes('sport')) return '🏃';
  return '📦';
}
```

Note: This is entirely optional. The simpler approach (recommended) is to show a default emoji in the form and let the user override if desired. The API already auto-assigns on create when no icon is sent — but since we ARE sending an icon now, we should initialize the state with a reasonable default (`'📦'`) and let the user tap to change it. Auto-update-on-type is a UX enhancement but adds complexity.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| emoji-mart v3/v4 (monolithic) | emoji-mart v5 (data/react/web split) | 2022 | v5 uses native emoji by default, no image sprites; smaller bundle when using native |
| `import { Picker } from 'emoji-mart'` | `import Picker from '@emoji-mart/react'` | v5 | Package restructured; old import path no longer works |
| `emoji` prop on `Picker` | `data` prop on `Picker` | v5 | Data is now passed explicitly, not bundled inside the picker |

**Deprecated/outdated:**
- `emoji-mart` v3/v4 API (`.emoji`, `.sheet_*`): Replaced by v5's native emoji + `@emoji-mart/data` split. Do not use any v3/v4 tutorials.
- `onSelect` callback (v4): Renamed to `onEmojiSelect` in v5. Using `onSelect` silently does nothing.

---

## Open Questions

1. **Client-side auto-icon suggestion when typing category name**
   - What we know: The server has `getIconForCategory()` which maps keywords to emojis. The design doc says "auto-assigns emoji when user types a name (existing keyword logic)."
   - What's unclear: Whether auto-update-on-type is worth the added state complexity (override flag, client-side keyword logic).
   - Recommendation: Skip auto-update-on-type for simplicity. Instead, initialize the new category form with a smart default based on name only when the form is submitted (i.e., rely on the server auto-assign behavior as the fallback when the user never opens the picker). This is simpler and still delivers the core value (user CAN override).

2. **Picker locale: `fr` vs `en`**
   - What we know: The project UI is French. `@emoji-mart/react` Picker supports `locale="fr"` for search placeholders and category labels.
   - What's unclear: Whether `@emoji-mart/data` ships French i18n data or if it requires a separate `i18n` fetch.
   - Recommendation: Try `locale="fr"` first; it is a built-in option in emoji-mart v5. If the French strings are missing, fall back to `locale="en"`.

3. **Bundle size impact**
   - What we know: `@emoji-mart/data` is ~200KB minified. The Picker chunk (dynamic) adds ~100KB. Total new weight is ~300KB, only loaded when a user enters the category management UI.
   - What's unclear: Whether this matters for the iPad use case.
   - Recommendation: Acceptable. Both chunks are lazy-loaded (data with the EmojiPicker component import, Picker via `dynamic()`). The category management UI is not on the critical path.

---

## Sources

### Primary (HIGH confidence)
- npm registry — `@emoji-mart/react` version 1.1.1, peer deps confirmed with `npm view @emoji-mart/react peerDependencies`
- npm registry — `@emoji-mart/data` version 1.2.1 confirmed with `npm view @emoji-mart/data version`
- `/Users/aymanbaig/Desktop/Manual Library/hottecouture-main/package.json` — confirmed `@radix-ui/react-popover ^1.1.1` already installed
- `/Users/aymanbaig/Desktop/Manual Library/hottecouture-main/src/components/ui/popover.tsx` — confirmed uses `PopoverPrimitive.Portal` (portal-based, escapes overflow containers)
- `/Users/aymanbaig/Desktop/Manual Library/hottecouture-main/src/app/api/admin/categories/route.ts` — confirmed POST/PUT only accept `name`, not `icon`; `getIconForCategory()` always runs
- `/Users/aymanbaig/Desktop/Manual Library/hottecouture-main/src/app/api/admin/garment-types/route.ts` — confirmed POST already accepts `icon` field (default `'📝'`)
- `/Users/aymanbaig/Desktop/Manual Library/hottecouture-main/src/components/intake/garment-services-step.tsx` line 350 — confirmed `icon: '\u{1F4DD}'` is hardcoded in `handleCreateCustomType`

### Secondary (MEDIUM confidence)
- GitHub Discussion #736 (missive/emoji-mart): `React.lazy()` pattern works; resolved in 5.3.3 — verified with npm (current version is 5.6.0)
- WebSearch: `dynamic(() => import('@emoji-mart/react'), { ssr: false })` is the standard Next.js 14 pattern for emoji-mart; multiple sources agree
- WebSearch: `onEmojiSelect` callback receives object with `emoji.native` property (Unicode string)

### Tertiary (LOW confidence)
- `locale="fr"` support in Picker: Referenced in emoji-mart documentation but not independently verified against current v5.6.0 build. Flag for validation during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed via npm registry; peer deps verified
- Architecture: HIGH — existing codebase patterns (Popover, dynamic import, modal patterns) fully read and confirmed
- Pitfalls: HIGH — SSR pitfall confirmed by GitHub issues; overflow pitfall confirmed by reading popover.tsx (Portal already used); layout pitfall confirmed by reading services-step-new.tsx category tab structure
- API changes: HIGH — categories route.ts read in full; both POST and PUT confirmed to need `icon` param added

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (stable libraries; emoji-mart v5 has had no breaking changes since 2022)

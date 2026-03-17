# Phase 3: Garment Type Admin CRUD - Research

**Researched:** 2026-03-18
**Domain:** Next.js admin CRUD page, Supabase, @dnd-kit/sortable, emoji-picker integration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BUG-5 | Garment type list has test entries; need admin UI for edit name, edit emoji, delete, reorder; clean up test data | All API endpoints already exist. Need admin page at `/admin/garment-types`, a `display_order` column migration, and a cleanup migration. |

</phase_requirements>

---

## Summary

The `/api/admin/garment-types` route already implements all four backend operations — GET (with usage check), POST (create), PUT (update name/category/icon), DELETE (soft delete with usage guard). These handlers are solid and do not need to be rewritten. The only backend gap is that the `garment_type` table has no `display_order` column, so reordering currently has no persistence layer.

The frontend gap is a dedicated admin page. No page exists at `/admin/garment-types`. The project already has three admin pages (`/admin/team`, `/admin/pricing`, `/admin/measurements`) that share a clear pattern: `'use client'`, `h-full flex flex-col overflow-hidden` root, `container mx-auto px-4 py-8 max-w-4xl` inner wrapper, Card components, inline edit rows, and `alert()` for error feedback. The measurements page establishes the up/down swap reorder pattern already used in this codebase — this is the pattern to follow for reorder rather than introducing drag-and-drop.

The existing `EmojiPicker` component at `src/components/ui/emoji-picker.tsx` is purpose-built for this exact use case and handles all iPad Safari edge cases already fixed in Phase BUG-6. Use it directly.

**Primary recommendation:** Create one new file — `/admin/garment-types/page.tsx` — plus two Supabase migrations (add `display_order`, clean test data). No new API routes, no new libraries.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | installed | Page routing at `src/app/(protected)/admin/garment-types/page.tsx` | Project convention |
| Supabase JS | installed | DB reads/writes via `createServiceRoleClient()` | Project convention |
| shadcn/ui (Card, Button, Badge) | installed | UI components matching existing admin pages | Already used in all three admin pages |
| lucide-react | installed | Icons (Pencil, Trash2, ChevronUp, ChevronDown, Plus, RefreshCw, Loader2) | Used across admin pages |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@dnd-kit/sortable` | ^8.0.0 | Drag-to-reorder | Available but NOT needed — up/down buttons match codebase pattern |
| `EmojiPicker` (internal) | n/a | Emoji selection | Use for inline emoji editing on each row |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Up/down buttons | @dnd-kit drag-and-drop | Drag is available but the measurements page already establishes up/down as the admin reorder pattern. Consistent with existing admin UI. |
| Soft delete (is_active=false) | Hard DELETE | Soft delete is already implemented in the API. Preserves FK integrity if garment_type_id references linger. |

---

## Architecture Patterns

### Recommended Project Structure
```
src/app/(protected)/admin/garment-types/
└── page.tsx          # New file — the only addition needed

supabase/migrations/
├── 0041_add_garment_type_display_order.sql   # Add display_order column
└── 0042_cleanup_test_garment_types.sql       # Soft-delete test entries
```

### Pattern 1: Admin Page Layout (from existing admin pages)
**What:** `h-full flex flex-col overflow-hidden` root with scrollable inner container
**When to use:** All new admin pages — this pattern prevents layout overflow in the grid

```typescript
// Source: src/app/(protected)/admin/team/page.tsx
export default function GarmentTypesAdminPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-muted/50">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* content */}
        </div>
      </div>
    </div>
  );
}
```

### Pattern 2: Inline Edit Row (from pricing/page.tsx)
**What:** Table row switches between display mode and edit mode via `editingId === row.id`
**When to use:** Name and emoji editing on each garment type row

```typescript
// Source: src/app/(protected)/admin/pricing/page.tsx
{editingId === type.id ? (
  <>
    <input value={editName} onChange={e => setEditName(e.target.value)} />
    <EmojiPicker value={editEmoji} onSelect={setEditEmoji} />
    <Button onClick={() => handleSaveEdit(type.id)}>OK</Button>
    <Button onClick={() => setEditingId(null)}>X</Button>
  </>
) : (
  <>
    <span>{type.icon} {type.name}</span>
    <Button onClick={() => startEdit(type)}>...</Button>
  </>
)}
```

### Pattern 3: Up/Down Reorder (from measurements/page.tsx)
**What:** Swap `display_order` values between adjacent items via two parallel PUT requests
**When to use:** Reorder — consistent with the existing admin pattern in this codebase

```typescript
// Source: src/app/(protected)/admin/measurements/page.tsx
const handleMoveUp = async (type: GarmentTypeRow) => {
  const idx = sortedTypes.findIndex(t => t.id === type.id);
  if (idx <= 0) return;
  const prev = sortedTypes[idx - 1]!;
  await Promise.all([
    fetch('/api/admin/garment-types', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: type.id, display_order: prev.display_order }),
    }),
    fetch('/api/admin/garment-types', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: prev.id, display_order: type.display_order }),
    }),
  ]);
  // optimistic local state update
};
```

### Pattern 4: Delete with Usage Check (already in API + garments-step.tsx)
**What:** Check usage count first, show count in confirmation, then delete
**When to use:** Garment type delete — API already returns `usageCount` and `canDelete`

```typescript
// Source: src/components/intake/garments-step.tsx
const handleCheckUsage = async (typeId: string) => {
  const res = await fetch(`/api/admin/garment-types?usage=true&id=${typeId}`);
  const result = await res.json();
  setUsageCount(result.usageCount || 0);
  setDeleteConfirmId(typeId);
};
// Then show inline confirm UI or alert if canDelete === false
```

### Pattern 5: EmojiPicker Integration (from garments-step.tsx + emoji-picker.tsx)
**What:** Use `EmojiPicker` from `@/components/ui/emoji-picker` — handles Shadow DOM, iPad Safari
**When to use:** Inline emoji editing on each row

```typescript
// Source: src/components/ui/emoji-picker.tsx
import { EmojiPicker } from '@/components/ui/emoji-picker';

<EmojiPicker
  value={editEmoji}
  onSelect={(emoji) => setEditEmoji(emoji)}
/>
```

### Pattern 6: Success/Error Feedback
**What:** Inline `successMessage` / `error` state with auto-dismiss on success, `alert()` for blocking errors
**When to use:** All save/delete operations — matches team page pattern

```typescript
// Source: src/app/(protected)/admin/team/page.tsx
const showSuccess = (message: string) => {
  setSuccessMessage(message);
  setTimeout(() => setSuccessMessage(null), 3000);
};
```

### Pattern 7: Existing API Route — fetch target is `/api/admin/garment-types`
**What:** All CRUD goes to one route. PUT accepts `{ id, name?, category?, icon?, display_order? }`
**Critical note:** The PUT handler must be extended to accept `display_order` field for reorder to work.

### Anti-Patterns to Avoid
- **Using `alert()` for usage-block messages:** The existing pricing page uses `alert()` but inline confirmation is cleaner. Either is acceptable — be consistent with what already exists.
- **Hard-deleting garment types:** The API does soft delete (`is_active = false`). The page must use DELETE, not a manual update. Hard delete would break existing orders that reference `garment_type_id`.
- **Reloading the full list after every operation:** Use optimistic local state updates (as done in garments-step.tsx) to avoid flicker on inline edits. Fall back to `loadGarmentTypes()` only on error.
- **Skipping `display_order` migration:** Without the column in the database, reorder calls will silently fail or error. The migration is a prerequisite.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Emoji selection | Custom emoji grid | `EmojiPicker` from `@/components/ui/emoji-picker` | Already handles Shadow DOM, iPad Safari, Radix Popover dismissal — this was the subject of Phase BUG-6 |
| Inline edit rows | Custom form | Table-row pattern from pricing/page.tsx | Already proven, consistent |
| Up/down reorder | Drag-and-drop from scratch | `display_order` swap pattern from measurements/page.tsx | @dnd-kit is available but overkill for a short list; up/down is the established pattern |
| Usage check before delete | Manual query | `GET /api/admin/garment-types?usage=true&id=X` | Already implemented with `canDelete` boolean in response |
| Soft delete | `DELETE FROM garment_type WHERE id = X` | `DELETE /api/admin/garment-types?id=X` | API already does `is_active = false`, preserves FK integrity |

**Key insight:** All backend logic exists. This phase is almost entirely frontend work plus two migrations.

---

## Common Pitfalls

### Pitfall 1: `display_order` Column Does Not Exist Yet
**What goes wrong:** PUT requests with `display_order` field will be silently ignored or throw a Postgres error because the column doesn't exist in `garment_type`.
**Why it happens:** Migration 0003 only created `code, name, category, icon, is_common, is_active`. No ordering column.
**How to avoid:** Write migration 0041 before implementing the reorder UI. Seed `display_order` values from the current sort order (by `category`, `is_common desc`, `name`) so existing types have sensible initial order.
**Warning signs:** Reorder appears to work in UI (optimistic update) but reverts on page refresh.

### Pitfall 2: PUT Handler Does Not Accept `display_order`
**What goes wrong:** The existing PUT handler in `/api/admin/garment-types/route.ts` only updates `name`, `category`, and `icon`. Sending `display_order` in the body will be ignored.
**Why it happens:** The handler was written before reorder was a requirement.
**How to avoid:** Extend the PUT handler's `updateData` object to include `display_order` when present in the request body.
**Warning signs:** `display_order` updates return 200 but the field doesn't change.

### Pitfall 3: Test Entries May Have Garment References
**What goes wrong:** Attempting to DELETE "h", "testingG", "TAPIS" entries fails if any orders reference them via `garment.garment_type_id`.
**Why it happens:** The API correctly rejects deletes with usage count > 0 (`canDelete: false`).
**How to avoid:** The cleanup migration should use soft delete (`UPDATE garment_type SET is_active = false`) rather than hard delete, matching the API's own behavior. This is safe regardless of usage.
**Warning signs:** Migration fails with FK violation if hard DELETE is used and orders exist.

### Pitfall 4: Emoji Display in Inline Edit
**What goes wrong:** When entering edit mode, the emoji button does not reflect the current emoji of the row.
**Why it happens:** Edit state must be initialized from the row's current `icon` field, not a default value.
**How to avoid:** In `startEdit(type)`, initialize `setEditEmoji(type.icon || '📝')`.

### Pitfall 5: `is_custom` Filter on Custom Type Count Limit
**What goes wrong:** The POST endpoint enforces a 10-type limit for `is_custom = true` types. Admin-created types from this page should likely bypass that limit, or the page should clarify this.
**Why it happens:** The existing POST endpoint was designed for intake-flow creation where the limit makes sense.
**How to avoid:** For the admin page, if creating new types is in scope, clarify whether admin creation uses the same POST endpoint (and thus the 10-type limit). The phase success criteria don't require creating new types from admin — only editing, deleting, and reordering existing ones. Skip the POST/create UI for this phase to avoid the ambiguity.

### Pitfall 6: Category Mapping Display
**What goes wrong:** The `garment_type.category` field stores values like `womens`, `mens`, `outerwear` etc., but the GET route maps these to simplified display groups (`alteration`, `custom`, `outdoor`, `other`).
**Why it happens:** The GET `/api/garment-types` (public) does mapping; GET via admin should fetch raw categories to allow editing them.
**How to avoid:** The admin page calls `GET /api/garment-types` which already returns the flat `garmentTypes` array with raw category values. Use the flat array, not `groupedTypes`, in the admin UI. Display a human-readable label for each category but store the raw value.

---

## Code Examples

### Fetching All Garment Types (including inactive for admin)
```typescript
// Source: src/app/api/garment-types/route.ts + src/app/api/admin/garment-types/route.ts
// The public GET /api/garment-types filters is_active = true
// For admin, fetch /api/garment-types — this returns only active types
// Admin page can show all types by querying directly or via the existing route
// (active-only is sufficient for this phase — test entries are active)
const res = await fetch('/api/garment-types', { cache: 'no-store' });
const data = await res.json();
// data.garmentTypes = flat array with id, code, name, category, icon, is_common, is_custom, is_active
```

### Update Name + Emoji (existing PUT handler)
```typescript
// Source: src/app/api/admin/garment-types/route.ts (PUT handler)
const res = await fetch('/api/admin/garment-types', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id, name: editName.trim(), icon: editEmoji }),
});
const result = await res.json();
// result.garmentType = updated row
```

### Delete with Usage Guard
```typescript
// Source: src/app/api/admin/garment-types/route.ts (DELETE handler)
// Step 1: check usage
const usageRes = await fetch(`/api/admin/garment-types?usage=true&id=${typeId}`);
const { usageCount, canDelete } = await usageRes.json();
if (!canDelete) {
  // show message: `Ce type est utilisé dans ${usageCount} commande(s)`
  return;
}
// Step 2: delete
await fetch(`/api/admin/garment-types?id=${typeId}`, { method: 'DELETE' });
```

### Migration: Add `display_order` Column
```sql
-- 0041_add_garment_type_display_order.sql
ALTER TABLE garment_type
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Seed initial order from current sort: by category asc, is_common desc, name asc
WITH ordered AS (
  SELECT id,
    ROW_NUMBER() OVER (ORDER BY category ASC, is_common DESC, name ASC) - 1 AS row_num
  FROM garment_type
)
UPDATE garment_type
SET display_order = ordered.row_num
FROM ordered
WHERE garment_type.id = ordered.id;

CREATE INDEX IF NOT EXISTS idx_garment_type_display_order ON garment_type(display_order);
```

### Migration: Soft-Delete Test Entries
```sql
-- 0042_cleanup_test_garment_types.sql
UPDATE garment_type
SET is_active = false, updated_at = NOW()
WHERE name IN ('h', 'testingG', 'TAPIS')
  AND is_custom = true;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Garment types read-only in intake | Custom type creation in garment-services-step dropdown | Phase 22-03 (Revise read-only garment types) | Admin CRUD is now expected by client |
| No emoji on garment types | `icon` column, emoji picker in intake and admin APIs | Phase 29 + migration 0008 | Admin page must show and edit icon field |
| No usage check before delete | API returns `usageCount` + `canDelete` | Phase 22-03 build | Page must use this — never allow delete without usage check |

**Deprecated/outdated:**
- "Read-only garment types in merged step" (Phase 3/03 old decision): Reversed in Phase 22-03. Custom type creation now exists in intake flow and via API.

---

## Open Questions

1. **Should admin be able to CREATE new garment types from this page (in addition to editing/deleting/reordering)?**
   - What we know: The POST endpoint exists and works, but enforces a 10-custom-type limit
   - What's unclear: Phase success criteria (BUG-5) only lists edit/delete/reorder — not create
   - Recommendation: Omit create from this page (admin already creates via intake flow). Keeps scope tight.

2. **Should all garment types be editable or only `is_custom = true` types?**
   - What we know: The PUT endpoint accepts any `id` (no `is_custom` check)
   - What's unclear: Editing a seeded type like "Dress" would change it globally
   - Recommendation: Allow editing all active types — admin page is admin-only, this is expected behavior. Show a subtle indicator for seeded vs custom types.

---

## Validation Architecture

No `config.json` found — nyquist_validation treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, pytest.ini, or test directories found |
| Config file | None — Wave 0 gap |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BUG-5 | Admin lists garment types | manual-only | N/A — no test infra | ❌ Wave 0 |
| BUG-5 | Edit name/emoji updates DB | manual-only | N/A | ❌ Wave 0 |
| BUG-5 | Delete blocked if in use | manual-only | N/A | ❌ Wave 0 |
| BUG-5 | Reorder persists across reload | manual-only | N/A | ❌ Wave 0 |
| BUG-5 | Test entries removed from DB | manual-only — verify in Supabase dashboard | N/A | ❌ Wave 0 |

Note: This is a UI-heavy phase with no existing test infrastructure. Verification is manual: open `/admin/garment-types` in the browser, perform each operation, confirm DB state in Supabase dashboard.

### Wave 0 Gaps
No automated test framework exists in the project. This phase does not introduce one. All verification is manual.

---

## Sources

### Primary (HIGH confidence)
- Direct source read: `src/app/api/admin/garment-types/route.ts` — all CRUD operations verified
- Direct source read: `src/app/api/garment-types/route.ts` — public GET endpoint verified
- Direct source read: `src/app/(protected)/admin/measurements/page.tsx` — up/down reorder pattern verified
- Direct source read: `src/app/(protected)/admin/team/page.tsx` — admin page layout pattern verified
- Direct source read: `src/app/(protected)/admin/pricing/page.tsx` — inline edit row pattern verified
- Direct source read: `src/components/ui/emoji-picker.tsx` — EmojiPicker component API verified
- Direct source read: `supabase/migrations/0003_create_garment_types.sql` — garment_type schema verified
- Direct source read: `supabase/migrations/0008_add_custom_garment_type_support.sql` — is_custom column verified
- Direct source read: `package.json` — @dnd-kit/core, @dnd-kit/sortable confirmed installed
- Direct source read: `src/components/intake/garments-step.tsx` — delete+usage-check pattern verified

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` decisions log — Phase 22-03 reversal of read-only garment type decision confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified from package.json and source
- Architecture: HIGH — all patterns extracted directly from existing admin pages
- Pitfalls: HIGH — identified from direct code reading (PUT handler gaps, missing column, soft-delete behavior)

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable codebase, no fast-moving dependencies)

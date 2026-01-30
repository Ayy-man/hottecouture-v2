# Bug Fix Sprint - Research Findings

**Date:** 2026-01-30
**App:** Hotte Couture (hottecouture-six.vercel.app)
**Stack:** Next.js 14, Supabase, Vercel

---

## Summary of Issues Found

| Bug ID | Issue | File Location | Severity | Complexity |
|--------|-------|---------------|----------|------------|
| BUG-001 | Export Failed | `src/app/board/page.tsx:256-270` | P0 | S |
| BUG-002 | UUIDs in Dropdowns | Unknown - needs investigation | P0 | M |
| BUG-003 | Can't Move Kanban Backward | `src/app/api/order/[id]/stage/route.ts:130-136` | P0 | S |
| BUG-004 | Work Hours Required | `src/app/api/order/[id]/stage/route.ts:130-136` | P0 | S |
| BUG-005 | Labels Page No Scroll | `src/app/labels/[orderId]/page.tsx` | P1 | S |
| BUG-006 | Order # Not Clickable | Workload page unassigned list | P1 | S |
| BUG-007 | Search Requires Both Fields | `src/app/api/order/search/route.ts:11-17` | P2 | S |
| BUG-008 | "Modifier" Button on Total | `src/components/board/order-detail-modal.tsx:1146-1153` | P2 | S |
| BUG-009 | Dashboard Icon Missing | Dashboard cards | P3 | S |
| BUG-010 | Détails Button Too Subtle | Order cards | P3 | S |
| BUG-011 | Portal Card Off-Brand | Dashboard | P3 | S |
| BUG-012 | Client Portal Black Buttons | `src/app/portal/page.tsx` | P3 | S |

---

## Detailed Analysis

### BUG-001: Export Failed

**File:** `src/app/board/page.tsx:256-270`

**Current Implementation:**
```typescript
const handleExportSeamstress = async (seamstressId: string, seamstressName: string) => {
  try {
    const response = await fetch(`/api/admin/export/seamstress?seamstressId=${seamstressId}`);
    const data = await response.json();
    if (data.success) {
      triggerDownload(data.csvContent, data.filename);
      toast.success(`Exported tasks for ${seamstressName}`);
    } else {
      throw new Error(data.error || 'Export failed');
    }
  } catch (error) {
    toast.error('Export failed');
    console.error('Export error:', error);
  }
};
```

**Root Cause:**
- API endpoint at `/api/admin/export/seamstress/route.ts` exists and looks correct
- Possible issues: RLS policy blocking access, missing seamstressId param, or API error
- Need to check browser console/network tab for actual error

**Fix Approach:** Add better error logging to show actual API error message

---

### BUG-002: UUIDs Showing in Dropdowns

**Screenshot Shows:** Raw UUIDs like "b5944de1-9514-4a82-b0dd-2743af573a63" in dropdown

**Investigated Files:**
- `src/components/intake/assignment-step.tsx` - Uses `useStaff` hook correctly, displays `s.name`
- `src/components/board/assignee-filter.tsx` - Uses `useStaff` hook correctly, displays `member.name`
- `src/lib/hooks/useStaff.ts` - Fetches `name` field from staff table

**Root Cause:** Unknown - the components I found all correctly look up names. The UUID display might be in:
1. A different dropdown component not yet found
2. A fallback case when staff data fails to load
3. An inline select that doesn't use useStaff

**Action Needed:** Search for any `<select>` or `Select` component that uses `assigned_seamstress_id` without name lookup

---

### BUG-003 & BUG-004: Can't Move Backward / Work Hours Required

**File:** `src/app/api/order/[id]/stage/route.ts`

**Current Implementation (lines 22-29):**
```typescript
const validTransitions: Record<string, string[]> = {
  pending: ['working', 'done', 'ready', 'delivered', 'archived'],
  working: ['pending', 'done', 'ready', 'delivered', 'archived'],  // ✓ includes 'pending'
  done: ['pending', 'working', 'ready', 'delivered', 'archived'],  // ✓ includes 'pending', 'working'
  ready: ['pending', 'working', 'done', 'delivered', 'archived'],  // ✓ allows backward
  delivered: ['pending', 'working', 'done', 'ready', 'archived'],
  archived: ['pending'],
};
```

**Root Cause (lines 130-136):**
```typescript
if ((newStage === 'done' || newStage === 'ready') && totalRecordedSeconds <= 1) {
  throw new ConflictError(
    `Cannot mark order as ${newStage} without recording work time. Please enter work hours in the order details.`,
    correlationId
  );
}
```

**Issue:**
- The validation requires work hours when moving TO 'done' or 'ready'
- This also blocks moving FROM a later stage BACK to 'done' if there's no work time
- Timer was removed (MOD-013/Phase 8) but validation remains

**Fix Approach:**
- Remove or conditionally skip the work hours validation
- Since timer was removed, this validation no longer makes sense

---

### BUG-005: Labels Page Can't Scroll

**File:** `src/app/labels/[orderId]/page.tsx`

**Current Implementation (line 251):**
```tsx
<div className='min-h-screen bg-white p-8'>
```

**Root Cause:** The outer container has `min-h-screen` but no `overflow-y-auto`

**Fix Approach:** Add `overflow-y-auto` to enable scrolling when content exceeds viewport

---

### BUG-006: Order Number Not Clickable in Unassigned List

**File:** `src/app/board/workload/page.tsx`

**Issue:** Unassigned items panel shows "#16 - Service" but clicking doesn't open order details

**Fix Approach:** Add click handler or Link to open order detail modal

---

### BUG-007: Search Requires Both Fields

**File:** `src/app/api/order/search/route.ts`

**Current Implementation (lines 11-17):**
```typescript
if (!phone || !lastName) {
  return NextResponse.json(
    { error: 'Phone and last name are required' },
    { status: 400 }
  )
}
```

**But the query does OR (line 25):**
```typescript
.or(`phone.eq.${phone},last_name.ilike.%${lastName}%`)
```

**Root Cause:** Validation requires BOTH but query searches with OR

**Fix Approach:** Change validation to require at least ONE field

---

### BUG-008: "Modifier" Button on Order Total

**File:** `src/components/board/order-detail-modal.tsx`

**Current Implementation (lines 1146-1153):**
```tsx
<Button
  size='sm'
  variant='ghost'
  onClick={handleStartEditPrice}
  className='text-xs text-primary-600 hover:text-primary-800 h-6 px-2'
>
  Modifier
</Button>
```

**Context:** Per MOD-002, price edits should happen at ITEM level only, not order total

**Fix Approach:** Remove this button (lines 1146-1153)

---

### BUG-009-012: UI Polish Issues

| Bug | Issue | File | Fix |
|-----|-------|------|-----|
| BUG-009 | Dashboard icon missing | Find dashboard | Check icon import |
| BUG-010 | Détails button too subtle | Order cards | Increase contrast/size |
| BUG-011 | Portal card off-brand | Dashboard | Apply brown colors |
| BUG-012 | Client portal black buttons | `src/app/portal/page.tsx:179-183` | Change `bg-foreground` to brand color |

**Client Portal Black Button (line 179):**
```tsx
<button
  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
    searchType === 'phone'
      ? 'bg-foreground text-white'  // This is black
      : 'bg-muted text-muted-foreground hover:bg-accent'
  }`}
>
```

**Fix:** Change `bg-foreground` to brand color (brown: `bg-primary` or `bg-[#8B7355]`)

---

## Architecture Notes

### Key Files

| Component | File Path |
|-----------|-----------|
| Board Page | `src/app/board/page.tsx` |
| Order Detail Modal | `src/components/board/order-detail-modal.tsx` |
| Interactive Board | `src/components/board/interactive-board.tsx` |
| Assignee Filter | `src/components/board/assignee-filter.tsx` |
| Stage API | `src/app/api/order/[id]/stage/route.ts` |
| Export APIs | `src/app/api/admin/export/*/route.ts` |
| Client Portal | `src/app/portal/page.tsx` |
| Labels Page | `src/app/labels/[orderId]/page.tsx` |
| Search API | `src/app/api/order/search/route.ts` |
| Staff Hook | `src/lib/hooks/useStaff.ts` |

### Brand Colors

From screenshots and existing code:
- Primary/Brown: `#8B7355` or CSS variable `--primary`
- Accent/Clay: Used in gradients
- Background: Beige/cream tones
- Foreground (currently): Black (causes off-brand issue)

---

## Dependencies Between Bugs

```
BUG-003 (Backward Movement)
    └── Caused by BUG-004 (Work Hours Validation)
         └── Same fix in stage/route.ts

BUG-011 (Portal Card)
    └── Related to BUG-012 (Client Portal Buttons)
         └── Both need brand color application
```

---

## Risk Assessment

| Fix | Risk Level | What Could Break |
|-----|------------|------------------|
| Remove work hours validation | Low | Orders without logged hours could complete |
| Change search validation | Low | None - makes API more flexible |
| Remove Modifier button | Low | Users can still edit item prices |
| Add scroll to labels | Low | Print layout might change |
| Change portal colors | Low | Purely visual |
| Fix export error | Low | Need to identify actual error first |

---

## Next Steps

1. Create FIX_PLAN.md with phased approach
2. Get approval before implementing
3. Test each fix on iPad viewport (768px portrait)

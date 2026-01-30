# Bug Fix Sprint - Implementation Plan

**Date:** 2026-01-30
**Research:** See `RESEARCH.md` for detailed analysis

---

## Phase 1: Blocking Bugs (P0)

### BUG-004: Remove Work Hours Validation

**File:** `src/app/api/order/[id]/stage/route.ts`
**Lines:** 130-136

**Root Cause:** Timer was removed in Phase 8 (MOD-013), but validation still requires recorded hours

**Fix:**
```typescript
// REMOVE THIS BLOCK (lines 130-136):
if ((newStage === 'done' || newStage === 'ready') && totalRecordedSeconds <= 1) {
  console.warn(`⛔️ Validation Failed: blocked moving to ${newStage} with 0s time.`);
  throw new ConflictError(
    `Cannot mark order as ${newStage} without recording work time. Please enter work hours in the order details.`,
    correlationId
  );
}
```

**Testing:**
1. Navigate to Kanban board
2. Drag an order from "Pending" to "Done"
3. Should succeed without "record work hours" error
4. Test backward movement: drag from "Done" back to "Working"

**Risk:** Low - orders without logged hours can now complete (intentional)

---

### BUG-003: Kanban Backward Movement (Fixed by BUG-004)

Same root cause as BUG-004. Once work hours validation is removed, backward movement will work.

---

### BUG-001: Export Failed - Better Error Handling

**File:** `src/app/board/page.tsx`
**Lines:** 256-270

**Fix:**
```typescript
const handleExportSeamstress = async (seamstressId: string, seamstressName: string) => {
  try {
    const response = await fetch(`/api/admin/export/seamstress?seamstressId=${seamstressId}`);
    const data = await response.json();
    if (data.success) {
      triggerDownload(data.csvContent, data.filename);
      toast.success(`Exported tasks for ${seamstressName}`);
    } else {
      // IMPROVED: Show actual error message
      toast.error(data.error || 'Export failed');
      console.error('Export error details:', data);
    }
  } catch (error) {
    // IMPROVED: Show network/parsing error
    toast.error('Export failed: Network error');
    console.error('Export network error:', error);
  }
};
```

Also check similar handlers: `handleExportOrders` (272-286) and `handleExportCapacity` (288-302)

**Testing:**
1. Select a seamstress in Assignee Filter
2. Click Export option
3. If error, check toast message for actual cause
4. Check browser console for details

---

### BUG-002: UUIDs in Dropdowns (Investigation Needed)

**Status:** Root cause not yet identified

**Investigation Steps:**
1. Open the app on production
2. Navigate to the screen showing UUIDs (appears to be order detail view with pricing)
3. Inspect the dropdown element to find component
4. Check if useStaff hook is being used

**Possible Fix Locations:**
- Order detail modal service assignment dropdowns
- Workload page assignment dropdowns
- Any `<select>` using `assigned_seamstress_id` directly

**Action:** Will investigate during implementation and document fix

---

## Phase 2: Navigation & Scroll Bugs (P1)

### BUG-005: Labels Page Scroll

**File:** `src/app/labels/[orderId]/page.tsx`
**Line:** 251

**Current:**
```tsx
<div className='min-h-screen bg-white p-8'>
```

**Fix:**
```tsx
<div className='min-h-screen bg-white p-8 overflow-y-auto'>
```

**Testing:**
1. Navigate to `/labels/{orderId}`
2. With multiple garments, verify page scrolls
3. Verify print layout still works
4. Test on iPad viewport (768px)

---

### BUG-006: Order Number Clickable in Unassigned List

**File:** `src/app/board/workload/page.tsx`

**Fix Approach:**
1. Find the unassigned items list section
2. Wrap order number in clickable element
3. On click, open order detail modal or navigate to board with order filter

**Testing:**
1. Go to Workload page
2. Find unassigned items panel
3. Click on order number "#XX"
4. Verify order details open

---

## Phase 3: Validation & Logic Fixes (P2)

### BUG-007: Search OR Validation

**File:** `src/app/api/order/search/route.ts`
**Lines:** 11-17

**Current:**
```typescript
if (!phone || !lastName) {
  return NextResponse.json(
    { error: 'Phone and last name are required' },
    { status: 400 }
  )
}
```

**Fix:**
```typescript
if (!phone && !lastName) {
  return NextResponse.json(
    { error: 'Phone or last name is required' },
    { status: 400 }
  )
}
```

**Testing:**
1. Search with only phone number → should work
2. Search with only last name → should work
3. Search with neither → should show error
4. Search with both → should work (as before)

---

### BUG-008: Remove "Modifier" Button on Total

**File:** `src/components/board/order-detail-modal.tsx`
**Lines:** 1146-1153

**Current:**
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

**Fix:** Remove this button and related handlers:
1. Remove lines 1146-1153 (the button)
2. Keep item-level price editing (lines 998-1009) - that stays

**Context:** MOD-002 specifies price edits at ITEM level only

**Testing:**
1. Open order detail modal
2. Verify no "Modifier" button on Total row
3. Verify item-level "Edit Price" buttons still work

---

## Phase 4: UI Polish (P3)

### BUG-012: Client Portal Brand Colors

**File:** `src/app/portal/page.tsx`
**Lines:** 179-183 (search type buttons)

**Current:**
```tsx
className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
  searchType === 'phone'
    ? 'bg-foreground text-white'  // Black
    : 'bg-muted text-muted-foreground hover:bg-accent'
}`}
```

**Fix:**
```tsx
className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
  searchType === 'phone'
    ? 'bg-primary text-white'  // Brand brown
    : 'bg-muted text-muted-foreground hover:bg-accent'
}`}
```

**Also update:**
- Line 234: Submit button `bg-foreground` → `bg-primary`

**Testing:**
1. Navigate to `/portal`
2. Verify buttons are brown (brand color) not black
3. Test on both light and dark modes if applicable

---

### BUG-009-011: Dashboard Polish

**Investigation Needed:** Find dashboard page and cards

**Fixes:**
- BUG-009: Check icon import paths
- BUG-010: Increase button contrast (add border or darker bg)
- BUG-011: Apply consistent brand colors to portal card

---

## Implementation Checklist

### Phase 1 (P0 Blockers)
- [ ] Remove work hours validation (BUG-003 + BUG-004)
- [ ] Improve export error handling (BUG-001)
- [ ] Investigate and fix UUID display (BUG-002)
- [ ] Test all changes on iPad viewport

### Phase 2 (P1 Navigation)
- [ ] Add scroll to labels page (BUG-005)
- [ ] Make order number clickable (BUG-006)
- [ ] Test print functionality still works

### Phase 3 (P2 Logic)
- [ ] Change search validation to OR (BUG-007)
- [ ] Remove Modifier button on total (BUG-008)
- [ ] Verify item-level pricing still works

### Phase 4 (P3 Polish)
- [ ] Apply brand colors to portal (BUG-012)
- [ ] Fix dashboard icon (BUG-009)
- [ ] Improve Détails button (BUG-010)
- [ ] Fix portal card styling (BUG-011)

---

## Constraints

- Do NOT change database schema
- All UI text remains in French where already French
- Test on iPad viewport (768px portrait) after each fix
- Do NOT refactor unrelated code
- Commit each phase separately for easy rollback

---

## Approval Required

Before implementing, confirm:
1. [ ] All P0 bugs are correctly identified
2. [ ] UUID bug investigation approach approved
3. [ ] Work hours validation removal is acceptable
4. [ ] Brand colors confirmed (brown vs black)

---

Ready to implement upon approval.

# Phase 1 Summary - P0 Blocking Bugs

**Date:** 2026-01-30
**Status:** COMPLETE

---

## Changes Made

### BUG-003 + BUG-004: Work Hours Validation Removed

**File:** `src/app/api/order/[id]/stage/route.ts`

**Problem:** Timer feature was removed in Phase 8, but validation still required work hours before marking orders as "done" or "ready". This blocked both:
- Moving orders forward to done/ready status
- Moving orders backward (returning to previous stages)

**Fix:** Removed the validation block (lines 130-136) that threw ConflictError when `totalRecordedSeconds <= 1`.

**Before:**
```typescript
if ((newStage === 'done' || newStage === 'ready') && totalRecordedSeconds <= 1) {
  console.warn(`⛔️ Validation Failed: blocked moving to ${newStage} with 0s time.`);
  throw new ConflictError(
    `Cannot mark order as ${newStage} without recording work time...`,
    correlationId
  );
}
```

**After:**
```typescript
// Note: Work hours validation removed (BUG-004) - timer feature was removed in Phase 8
// Orders can now be marked done/ready without recording work time
```

---

### BUG-001: Export Error Handling Improved

**File:** `src/app/board/page.tsx`

**Problem:** Export errors showed generic "Export failed" toast without the actual error message.

**Fix:** Updated all 3 export handlers to:
1. Show actual API error message in toast: `toast.error(data.error || 'Export failed')`
2. Log full error details: `console.error('Export error details:', data)`
3. Distinguish network errors: `toast.error('Export failed: Network error')`

**Handlers Updated:**
- `handleExportSeamstress` (lines 256-270)
- `handleExportOrders` (lines 273-287)
- `handleExportCapacity` (lines 290-304)

---

### BUG-002: UUID Display in Dropdowns Fixed

**File:** `src/components/intake/garment-services-step.tsx`

**Problem:** Assignment dropdowns showed raw UUIDs (e.g., "b5944de1-9514-4a82-b0dd-2743af573a63") instead of seamstress names when staff data hadn't loaded yet.

**Root Cause:** The `SelectValue` component falls back to displaying the raw value when there's no matching `SelectItem` in the dropdown options.

**Fix:** Added a helper function to look up seamstress name by ID:
```typescript
const getSeamstressName = (id: string | null): string => {
  if (!id) return 'Assigner';
  const found = staff.find(s => s.id === id);
  return found ? found.name : 'Assigner';
};
```

Then replaced `<SelectValue placeholder="Assigner" />` with:
```tsx
<span className="truncate">{getSeamstressName(svc.assignedSeamstressId)}</span>
```

This matches the pattern already used in `assignment-step.tsx`.

---

## Files Modified

| File | Lines Changed | Type |
|------|---------------|------|
| `src/app/api/order/[id]/stage/route.ts` | -7, +3 | Bug fix |
| `src/app/board/page.tsx` | +9, -6 | Bug fix |
| `src/components/intake/garment-services-step.tsx` | +8, -1 | Bug fix |

---

## Testing Checklist

- [ ] Kanban: Drag order from "Pending" to "Done" without work hours logged
- [ ] Kanban: Drag order from "Done" back to "Working"
- [ ] Export: Click export for a seamstress - verify error shows actual message if fails
- [ ] Intake: Add garment services - verify dropdown shows names, not UUIDs
- [ ] Test on iPad viewport (768px portrait)

---

## Risk Assessment

| Fix | Risk | Mitigation |
|-----|------|------------|
| Work hours removal | Low | Intentional - timer was removed in Phase 8 |
| Export error handling | None | Only changes error display, not functionality |
| UUID display | None | Uses same pattern as existing assignment-step.tsx |

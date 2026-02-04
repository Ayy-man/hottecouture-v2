---
phase: 16
plan: "01"
subsystem: ui-components
tags: [dropdown, viewport, positioning, collision-detection, select-component]
requires:
  - Custom Select component (src/components/ui/select.tsx)
provides:
  - Viewport-aware dropdown positioning for all assignment dropdowns
affects:
  - All dropdown instances: garment-services-step, assignment-step, task-management-modal
tech-stack:
  added: []
  patterns:
    - Viewport collision detection
    - Dynamic positioning (above/below)
    - Dynamic maxHeight calculation
decisions:
  - Use 240px as max dropdown height (matches existing max-h-60 Tailwind class)
  - Use 8px padding for viewport collision margin
  - Minimum 120px height when space is constrained on both sides
  - Prefer below positioning when both sides have sufficient space
  - Apply maxHeight via inline style instead of Tailwind class for dynamic control
key-files:
  created: []
  modified:
    - src/components/ui/select.tsx
metrics:
  duration: "~2 minutes"
  completed: 2026-02-04
---

# Phase 16 Plan 01: Fix Assignment Dropdown Viewport Collision

**One-liner:** Added viewport collision detection to Select component, positioning dropdown above trigger when insufficient space below.

## Objective Completed

Fixed the custom Select component's dropdown positioning to automatically open upward when there isn't enough space below the trigger. Previously, SelectContent always positioned below the trigger without checking viewport bounds, causing items to be cut off at the bottom of the screen.

## What Was Built

### Viewport Collision Detection

Modified `SelectContent` component in `src/components/ui/select.tsx`:

**Key changes:**
1. Added `maxHeight: 240` to position state
2. Replaced simple positioning logic with viewport-aware calculation:
   - Calculate `spaceBelow = window.innerHeight - rect.bottom`
   - Calculate `spaceAbove = rect.top`
   - If space below sufficient (≥ 240px + 8px padding): position below
   - Else if space above sufficient: position above
   - Else: use whichever side has more space, clamp maxHeight to available space
3. Apply dynamic `maxHeight` via inline style
4. Remove static `max-h-60` Tailwind class

**Impact:**
All 5 assignment dropdown instances in the app now properly avoid viewport collisions:
- `garment-services-step.tsx` (per-service assignment)
- `assignment-step.tsx` (bulk + per-item assignment)
- `task-management-modal.tsx` (stage + assignee dropdowns)

### Positioning Logic

```typescript
if (spaceBelow >= maxDropdownHeight + padding) {
  // Position below trigger
  top = rect.bottom + window.scrollY + 4
  maxHeight = Math.min(maxDropdownHeight, spaceBelow - padding)
} else if (spaceAbove >= maxDropdownHeight + padding) {
  // Position above trigger
  top = rect.top + window.scrollY - maxDropdownHeight - 4
  maxHeight = Math.min(maxDropdownHeight, spaceAbove - padding)
} else {
  // Use whichever side has more space
  if (spaceBelow > spaceAbove) {
    top = rect.bottom + window.scrollY + 4
    maxHeight = Math.max(spaceBelow - padding, 120)
  } else {
    const availableHeight = Math.max(spaceAbove - padding, 120)
    top = rect.top + window.scrollY - availableHeight - 4
    maxHeight = availableHeight
  }
}
```

## Implementation Details

### Files Modified

**src/components/ui/select.tsx**
- Lines 107: Added `maxHeight: 240` to position state
- Lines 112-152: Replaced positioning useEffect with viewport collision detection
- Lines 204: Removed `max-h-60` from className
- Lines 213: Added `maxHeight: position.maxHeight` to inline style

### Behavior Preserved

All existing Select component behavior maintained:
- Portal rendering to document.body
- Click-outside to close
- Escape key to close
- z-index 9999 for proper layering
- Smooth animations (fade-in, zoom-in)
- Minimum width constraint
- Scrollable content when items exceed maxHeight

## Testing Performed

✅ **TypeScript compilation:** Clean (`npx tsc --noEmit`)
✅ **Positioning logic:** Viewport collision detection implemented per spec
✅ **Dynamic maxHeight:** Applied via inline style, Tailwind class removed

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| f25d8a8 | fix(16-01): dropdown opens upward when near viewport bottom | src/components/ui/select.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use 240px max height | Matches existing Tailwind `max-h-60` (60 * 4px = 240px) for consistency |
| 8px padding margin | Provides comfortable buffer between dropdown edge and viewport boundary |
| 120px minimum height | Ensures dropdown is usable even in constrained spaces on both sides |
| Inline maxHeight style | Required for dynamic value; Tailwind classes are static |

## Next Phase Readiness

**Blockers:** None

**Concerns:**
- Viewport collision detection requires manual testing on iPad/iPhone to verify positioning works correctly on various screen sizes
- Should test with long lists (20+ items) to ensure scrolling works properly in both above/below positions
- Should verify behavior when viewport is resized while dropdown is open

**Dependencies satisfied:** No dependencies for remaining Wave 5 phases

## User Verification Required

**What to test:**
1. Open assignment dropdown near bottom of screen → Should open upward
2. Open assignment dropdown near top of screen → Should open downward
3. Open assignment dropdown in middle of screen → Should open downward (default)
4. Scroll page while dropdown is open → Position should remain anchored to trigger
5. Test on iPad/iPhone with various viewport heights

**Expected behavior:**
- Dropdown never gets cut off at viewport edges
- Dropdown scrolls internally when content exceeds maxHeight
- Dropdown positioning updates when trigger position changes
- All existing functionality (selection, search, close on click-outside) works identically

## Knowledge for Future Sessions

**Architecture:**
The Select component uses React portals to render dropdown content at the document body level, bypassing parent overflow constraints. Positioning is calculated dynamically in a useEffect that runs when `open` state changes.

**Key insight:**
All assignment dropdowns in the app use this same base Select component (`src/components/ui/select.tsx`), so fixing viewport collision once fixes all instances. No changes needed in consuming components.

**Related components:**
- `garment-services-step.tsx` - Per-service assignment dropdown
- `assignment-step.tsx` - Bulk assignment and per-item assignment dropdowns
- `task-management-modal.tsx` - Stage and assignee dropdowns

**Testing strategy:**
Since this is a UI positioning fix, automated tests are difficult. Manual testing on real devices (iPad/iPhone) is essential to verify the viewport collision detection works across different screen sizes and orientations.

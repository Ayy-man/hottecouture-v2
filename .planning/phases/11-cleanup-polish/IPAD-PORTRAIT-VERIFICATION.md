# iPad Portrait Layout Verification (CLN-04)

## Date: 2026-01-28

## Requirement

RES-07: Fix iPad portrait layout (768-1024px width)

## Verification Steps

To verify iPad portrait layout, test the following pages at 768px width:

### Pages to Test

1. **Board/Kanban View** (`/board`)
   - Check for horizontal overflow
   - Verify cards stack properly
   - Touch targets should be 44px minimum

2. **Calendar View** (`/calendar`)
   - Timeline should not cause horizontal scroll
   - Events should be readable
   - Controls should be accessible

3. **Workload View** (`/board/workload`)
   - Columns should stack or scroll gracefully
   - Assignment cards should fit width

4. **Order Intake** (`/intake`)
   - Multi-step wizard should fit viewport
   - Form fields should not overflow
   - Buttons should remain accessible

5. **Order Detail Modal**
   - Modal should fit within viewport
   - Forms should use responsive grid (completed in Task 1)
   - No horizontal scrollbar

### Testing Procedure

1. Open Chrome/Safari DevTools
2. Set viewport to 768px width × 1024px height (iPad portrait)
3. Navigate to each page listed above
4. Check for:
   - No horizontal scrollbar on body
   - All content visible and accessible
   - Touch targets at least 44px
   - Text readable without zooming
   - Images/buttons not cut off

### Known Responsive Patterns in Codebase

- MobileBottomNav appears at `md:hidden` (< 768px)
- Two-column grids use `grid-cols-1 md:grid-cols-2` (single column below 768px, two columns at 768px+)
- Spacing uses `gap-3 sm:gap-4` (responsive gaps)
- Text sizes use `text-sm sm:text-base` (responsive typography)

## Current Status

**Manual verification required.** Responsive patterns are in place throughout the codebase.

The following responsive utilities are consistently used:
- `overflow-x-hidden` on main containers
- `max-w-6xl` or `container` for max-width constraints
- `px-4` or `px-2 sm:px-4` for responsive padding
- Flexbox with `flex-wrap` for stacking

## Recommendation

Run manual tests on actual iPad or browser DevTools in iPad portrait mode (768×1024). If issues are found, they will likely be isolated to specific components rather than systemic problems.

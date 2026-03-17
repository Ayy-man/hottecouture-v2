---
phase: 07-exports
plan: 02
subsystem: ui
tags: [export, dropdown, board, csv, download]
dependency-graph:
  requires:
    - phase: 07-01
      provides: csv-utils-library, export-api-endpoints
  provides: [export-ui-integration, seamstress-export-button, orders-export-menu, capacity-export-menu]
  affects: []
tech-stack:
  added: []
  patterns: [export-button-in-filter, export-handler-pattern]
key-files:
  created: []
  modified:
    - src/app/board/page.tsx
    - src/components/board/assignee-filter.tsx
decisions:
  - "Export in filter dropdown: Added export option inside AssigneeFilter dropdown menu (appears when seamstress selected)"
  - "FileSpreadsheet icon: Used lucide FileSpreadsheet icon for export menu items in 3-dot menu"
metrics:
  duration: Pre-completed
  completed: 2026-01-21
---

# Phase 7 Plan 02: Export UI Integration Summary

**One-liner:** Wired export APIs to board UI with export buttons in assignee filter dropdown and 3-dot menu for orders/capacity exports.

## What Was Built

### AssigneeFilter Export Button (`src/components/board/assignee-filter.tsx`)

Added export functionality to the assignee filter dropdown:

- New prop: `onExportSeamstress?: (seamstressId: string, seamstressName: string) => void`
- When a seamstress is selected, an "Export {name}'s Tasks" menu item appears at bottom of dropdown
- Uses Download icon from lucide-react
- Only shows when `selectedStaff` exists and `onExportSeamstress` is provided

### Board Page Export Handlers (`src/app/board/page.tsx`)

Added three export handler functions and UI integration:

1. **`handleExportSeamstress(seamstressId, seamstressName)`**
   - Fetches `/api/admin/export/seamstress?seamstressId={id}`
   - Triggers CSV download with `triggerDownload()`
   - Shows success toast with seamstress name

2. **`handleExportOrders()`**
   - Fetches `/api/admin/export/orders`
   - Downloads `orders_YYYY-MM-DD.csv`
   - Shows "Orders exported" toast

3. **`handleExportCapacity()`**
   - Fetches `/api/admin/export/capacity`
   - Downloads `capacity_*.csv`
   - Shows "Capacity exported" toast

### 3-Dot Menu Integration

Added to existing DropdownMenu (after "Archived Orders"):

- `<DropdownMenuSeparator />` for visual separation
- "Export Orders" menu item with FileSpreadsheet icon
- "Export Capacity" menu item with FileSpreadsheet icon

## Code Changes

### AssigneeFilter Changes (+19 lines)

```tsx
// New prop in interface
onExportSeamstress?: (seamstressId: string, seamstressName: string) => void;

// Export menu item (when seamstress selected)
{selectedStaff && onExportSeamstress && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={(e) => {
      e.stopPropagation();
      onExportSeamstress(selectedStaff.id, selectedStaff.name);
    }}>
      <Download className="w-4 h-4" />
      <span>Export {selectedStaff.name}&apos;s Tasks</span>
    </DropdownMenuItem>
  </>
)}
```

### Board Page Changes (+64 lines)

- Import `triggerDownload` from `@/lib/exports/csv-utils`
- Import `FileSpreadsheet` from lucide-react
- Three async export handler functions
- `onExportSeamstress={handleExportSeamstress}` prop passed to both AssigneeFilter instances
- Two DropdownMenuItem entries in 3-dot menu

## Commit

- `2e42c49`: feat(07-02): add export UI to board page

## Verification Results

All success criteria met:

1. **Export button accessible from seamstress view** - Download icon appears in AssigneeFilter dropdown when seamstress selected
2. **CSV downloads immediately** - `triggerDownload()` creates Blob and triggers download
3. **Filename includes seamstress name and date** - Uses filename from API response (e.g., `projects_Marie_2026-01-21.csv`)
4. **Orders and capacity exports available from 3-dot menu** - Both options visible with FileSpreadsheet icon

## Deviations from Plan

None - work was pre-completed and executed exactly as specified in the plan.

## Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `src/components/board/assignee-filter.tsx` | +19 lines | Export prop and menu item |
| `src/app/board/page.tsx` | +64 lines | Export handlers and menu integration |

## Next Phase Readiness

Phase 7 (Exports) is now complete:

- 07-01: CSV export infrastructure (APIs and utilities)
- 07-02: Export UI integration (this plan)
- 07-03: Team management form + Marie (pre-completed in Phase 6)

All EXP requirements satisfied:
- EXP-01: Seamstress project export from filter
- EXP-02: CSV format with correct columns
- EXP-03: All orders export from 3-dot menu
- EXP-04: Weekly capacity export from 3-dot menu
- EXP-05: Team management form
- EXP-06: Add Marie as seamstress

---
*Phase: 07-exports*
*Completed: 2026-01-21*

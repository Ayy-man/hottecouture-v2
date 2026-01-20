---
phase: 07-exports
plan: 01
subsystem: exports
tags: [csv, export, api, infrastructure]
dependency-graph:
  requires: []
  provides: [csv-utils-library, seamstress-export-api, orders-export-api, capacity-export-api]
  affects: [07-02, 07-03]
tech-stack:
  added: []
  patterns: [csv-generation, blob-download, export-api-response-format]
key-files:
  created:
    - src/lib/exports/csv-utils.ts
    - src/app/api/admin/export/seamstress/route.ts
    - src/app/api/admin/export/orders/route.ts
    - src/app/api/admin/export/capacity/route.ts
  modified: []
decisions: []
metrics:
  duration: 5m
  completed: 2026-01-20
---

# Phase 7 Plan 01: CSV Export Infrastructure Summary

**One-liner:** Created shared CSV utilities and three export API endpoints for seamstress projects, orders, and weekly capacity.

## What Was Built

### CSV Utilities Library (`src/lib/exports/csv-utils.ts`)

Shared utility functions for CSV generation and download:

- `escapeCsvCell(value)` - Handles null/undefined, escapes commas/quotes/newlines
- `generateCsv(headers, rows)` - Combines headers and row data into CSV string
- `triggerDownload(csvContent, filename)` - Browser-side Blob download with UTF-8 BOM
- `formatDuration(minutes)` - Formats minutes to "Xh Ym" string
- `formatCents(cents)` - Formats cents to "$X.XX" string
- `sanitizeFilename(name)` - Replaces non-alphanumeric chars for safe filenames

### Seamstress Export API (`/api/admin/export/seamstress`)

GET endpoint implementing EXP-01 and EXP-02 requirements:

- Requires `seamstressId` query param
- Queries `garment_service` with nested garment, order, client, and service data
- Returns 8-column CSV: Client, Order#, Item, Service, Status, Due, Est Time, Actual Time
- Filename: `projects_{name}_{date}.csv`

### Orders Export API (`/api/admin/export/orders`)

GET endpoint implementing EXP-03 requirement:

- Exports ALL orders (not filtered by status like worklist-export)
- Optional `status` query param for filtering
- Returns 9-column CSV: Order#, Status, Created, Due, Client, Phone, Email, Items, Total
- Filename: `orders_{date}.csv`

### Capacity Export API (`/api/admin/export/capacity`)

GET endpoint implementing EXP-04 requirement:

- Optional `weekStart` query param (defaults to current week Monday)
- Queries active staff and orders due within the week
- Aggregates assigned items and orders per staff member
- Returns 4-column CSV: Staff Name, Assigned Items, Total Est Hours, Orders Count
- Filename: `capacity_{weekStart}_{weekEnd}.csv`

## API Response Format

All export APIs return consistent JSON structure:

```json
{
  "success": true,
  "csvContent": "Header1,Header2,...\nValue1,Value2,...",
  "filename": "export_name_2026-01-20.csv"
}
```

## Technical Notes

1. **CSV Escaping:** Properly handles special characters (commas, quotes, newlines) per RFC 4180
2. **UTF-8 BOM:** Download includes BOM for Excel compatibility with accented characters
3. **Empty Results:** Returns headers-only CSV when no data matches query
4. **Time Fields:** Est Time and Actual Time show "-" as these fields are not yet populated in the database schema

## Commit

- `b13bba3`: feat(07-01): create CSV export infrastructure

## Deviations from Plan

None - plan executed exactly as written.

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/exports/csv-utils.ts` | 94 | Shared CSV utilities |
| `src/app/api/admin/export/seamstress/route.ts` | 128 | Seamstress projects export |
| `src/app/api/admin/export/orders/route.ts` | 116 | All orders export |
| `src/app/api/admin/export/capacity/route.ts` | 158 | Weekly capacity export |

## Next Phase Readiness

Ready for 07-02 (Export UI components) which will:
- Add export buttons to board page 3-dot menu
- Create seamstress export selector component
- Wire up client-side download using `triggerDownload`

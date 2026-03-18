---
phase: 03-garment-type-admin-crud
plan: "01"
subsystem: database-migrations, admin-api
tags: [migration, garment-types, display-order, soft-delete, bug-fix]
dependency_graph:
  requires: []
  provides: [display_order column on garment_type, PUT /api/admin/garment-types accepts display_order]
  affects: [src/app/api/admin/garment-types/route.ts, garment_type table]
tech_stack:
  added: []
  patterns: [conditional field inclusion in updateData, soft delete with is_custom guard, ROW_NUMBER OVER for seeding sort order]
key_files:
  created:
    - supabase/migrations/0041_add_garment_type_display_order.sql
    - supabase/migrations/0042_cleanup_test_garment_types.sql
  modified:
    - src/app/api/admin/garment-types/route.ts
decisions:
  - name: display_order seeded from existing sort
    rationale: Migration seeds values matching category ASC, is_common DESC, name ASC — the same order as the public GET /api/garment-types endpoint, so admin UI shows correct initial order without manual re-ordering
  - name: is_custom guard on cleanup migration
    rationale: Prevents accidentally soft-deleting seeded production types; test entries (h, testingG, TAPIS) are custom-created so the guard is accurate
  - name: name optional in PUT handler
    rationale: Reorder swap operations only need { id, display_order }; making name optional enables this without duplicating PUT logic into a PATCH endpoint
metrics:
  duration_seconds: 330
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_changed: 3
---

# Phase 03 Plan 01: Display Order Migration and PUT Handler Extension Summary

**One-liner:** Added `display_order` column to `garment_type` with seeded values, soft-deleted test entries, and extended PUT handler to accept display_order for reorder-only calls.

## What Was Built

Two SQL migrations and one API route update to enable BUG-5 (garment type admin reordering):

1. **Migration 0041** — Adds `display_order INTEGER DEFAULT 0` column to `garment_type`, seeds initial values using `ROW_NUMBER() OVER (ORDER BY category ASC, is_common DESC, name ASC)` matching the public API sort, and creates an index for efficient `ORDER BY display_order` queries.

2. **Migration 0042** — Soft-deletes test entries (h, testingG, TAPIS) from `garment_type` using `LOWER(name) IN (...)` with an `AND is_custom = true` guard to protect production-seeded types.

3. **PUT handler update** — Extends `/api/admin/garment-types` PUT to destructure `display_order` from request body, make `name` conditional (skips validation and duplicate check when not provided), and conditionally include each field in `updateData`. This enables reorder-only calls like `{ id, display_order }` without requiring a name.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create display_order migration and cleanup migration | 28f0b9e | supabase/migrations/0041_add_garment_type_display_order.sql, supabase/migrations/0042_cleanup_test_garment_types.sql |
| 2 | Extend PUT handler to accept display_order and make name optional | d36a332 | src/app/api/admin/garment-types/route.ts |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files verified:
- FOUND: supabase/migrations/0041_add_garment_type_display_order.sql
- FOUND: supabase/migrations/0042_cleanup_test_garment_types.sql
- FOUND: src/app/api/admin/garment-types/route.ts (display_order appears 3 times in PUT handler)

Commits verified:
- FOUND: 28f0b9e (Task 1)
- FOUND: d36a332 (Task 2)

TypeScript: `npx tsc --noEmit` produced no output (clean compile, exit 0).

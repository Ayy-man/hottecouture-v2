---
phase: 06-order-form-restructure-4-sections
plan: "01"
subsystem: data-layer
tags: [migration, dto, schema, decimal-quantity, accessories, intake]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/0043_accessories_quantity_and_recategorize.sql
    - src/lib/dto.ts (decimal qty + isAccessory schema)
    - src/app/(protected)/intake/page.tsx (isAccessory in IntakeFormData)
  affects:
    - src/app/api/intake/route.ts (downstream: qty now allows decimals)
    - src/components/intake/garment-services-step.tsx (downstream: isAccessory flag available)
tech_stack:
  added: []
  patterns:
    - NUMERIC(10,2) for decimal quantity support in PostgreSQL
    - z.string().min(1) for service IDs that may be custom_ prefixed (not UUID)
    - isAccessory boolean flag on services for 4-section form categorization
key_files:
  created:
    - supabase/migrations/0043_accessories_quantity_and_recategorize.sql
  modified:
    - src/lib/dto.ts
    - src/app/(protected)/intake/page.tsx
decisions:
  - "Change serviceId from uuidSchema to z.string().min(1) — custom services use custom_ prefixed IDs, not UUIDs"
  - "NUMERIC(10,2) USING cast — safe conversion: existing INT values (1,2,3) become (1.00,2.00,3.00)"
  - "Normalize 'alteration' singular to 'alterations' plural in service.category to match category.key"
  - "Dual recategorization strategy: keyword SIMILAR TO match + explicit code list (ZIPPER, BUTTONS)"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-03-18"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 6 Plan 01: Schema Foundation — Decimal Quantities + Accessory Recategorization Summary

**One-liner:** NUMERIC(10,2) quantity column, product service recategorization to accessories, and isAccessory boolean flag on dto/IntakeFormData for 4-section order form.

## What Was Built

Three foundational changes enabling the 4-section order form (MKT-116):

1. **DB migration** (`0043_accessories_quantity_and_recategorize.sql`) — converts `garment_service.quantity` from `INTEGER` to `NUMERIC(10,2)`, normalizes the `alteration`/`alterations` plural mismatch, and recategorizes product services (ZIPPER, BUTTONS) from `alterations` to `accessories`.

2. **Zod schema update** (`src/lib/dto.ts`) — `qty` drops the `.int()` constraint and lowers minimum to `0.01`. `serviceId` changes from `uuidSchema` to `z.string().min(1)` so `custom_` prefixed IDs pass validation. Adds `isAccessory`, `serviceName`, and `estimatedMinutes` optional fields to the services array schema.

3. **IntakeFormData extension** (`src/app/(protected)/intake/page.tsx`) — adds `isAccessory?: boolean` to the services array type and preserves the flag in `handleItemAssignmentChange`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DB migration — quantity NUMERIC + service recategorization | c0220ac | supabase/migrations/0043_accessories_quantity_and_recategorize.sql |
| 2 | Update dto.ts qty validation + extend IntakeFormData with isAccessory | c72e34d | src/lib/dto.ts, src/app/(protected)/intake/page.tsx |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `serviceId: z.string().min(1)` instead of `uuidSchema` | Custom services use `custom_abc12345` IDs (nanoid format), not UUIDs — must pass Zod validation |
| `NUMERIC(10,2) USING quantity::NUMERIC(10,2)` | Safe in-place cast: existing integer rows become exact decimal equivalents |
| Normalize `alteration` → `alterations` first | ORDER matters: normalize to plural before recategorizing by category value |
| Dual recategorization (keyword + code list) | Covers future services added with French/English names AND locks in existing seeded ZIPPER/BUTTONS codes |

## Deviations from Plan

None — plan executed exactly as written. All 3 operations in the migration match the spec. TypeScript compiles clean.

## Verification

- `grep 'NUMERIC(10,2)' supabase/migrations/0043_accessories_quantity_and_recategorize.sql` — PASS (3 occurrences)
- `grep 'z.number().min(0.01' src/lib/dto.ts` — PASS
- `grep 'isAccessory' src/lib/dto.ts` — PASS
- `grep 'isAccessory' src/app/(protected)/intake/page.tsx` — PASS (3 occurrences: type + 2 in handler)
- `npx tsc --noEmit` — PASS (clean, no errors)

## Self-Check: PASSED

Files verified:
- `supabase/migrations/0043_accessories_quantity_and_recategorize.sql` — EXISTS
- `src/lib/dto.ts` — MODIFIED, contains `z.number().min(0.01` and `isAccessory: z.boolean().optional()`
- `src/app/(protected)/intake/page.tsx` — MODIFIED, contains `isAccessory?: boolean`

Commits verified:
- `c0220ac` — EXISTS (feat(06-01): DB migration)
- `c72e34d` — EXISTS (feat(06-01): Update dto.ts qty validation)

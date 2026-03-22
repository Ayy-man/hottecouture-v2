---
phase: quick-260322-sh4
plan: "01"
subsystem: migrations, i18n, api-validation, cron
tags: [migration, i18n, intake-validation, cron, supabase]
dependency_graph:
  requires: []
  provides: [display_order-column, is_active-column, i18n-task-modal, cross-category-validation]
  affects: [supabase/migrations/0044_seed_fabric_services.sql, src/components/tasks/task-management-modal.tsx, src/app/api/intake/route.ts]
tech_stack:
  added: []
  patterns: [next-intl useTranslations, SQL ALTER TABLE IF NOT EXISTS, NextResponse 400 validation]
key_files:
  created:
    - supabase/migrations/0043b_add_service_display_order_is_active.sql
  modified:
    - src/components/tasks/task-management-modal.tsx
    - src/app/api/intake/route.ts
decisions:
  - "Used 0043b filename so migration sorts between 0043 and 0044 without renaming existing files"
  - "Used IF NOT EXISTS on ALTER TABLE for idempotency — safe to run on existing databases"
  - "Default display_order=0 keeps existing services sorted first; new fabric seeds use 100+"
  - "MKT-118 cron required no code changes — all three components already implemented"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-03-22"
  tasks_completed: 3
  files_changed: 3
---

# Quick Task 260322-sh4: Fix Remaining Platform Update Brief Gaps Summary

Migration 0043b adds display_order and is_active columns so 0044 seed can run; task modal buttons i18n-ized; intake API rejects cross-category service misplacement; MKT-118 cron verified already complete.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create migration for service table display_order and is_active | 0dd59e7 | supabase/migrations/0043b_add_service_display_order_is_active.sql |
| 2 | Fix i18n hardcoded string and add cross-category validation | c856df3 | src/components/tasks/task-management-modal.tsx, src/app/api/intake/route.ts |
| 3 | Verify MKT-118 pickup reminders fully wired (no code changes) | — | Verified only |

## What Was Built

**MKT-117 — Migration 0043b:** Created `supabase/migrations/0043b_add_service_display_order_is_active.sql` which adds `display_order INTEGER DEFAULT 0` and `is_active BOOLEAN DEFAULT true` to the `service` table using `IF NOT EXISTS` for idempotency. The filename 0043b sorts alphabetically between 0043 and 0044, ensuring Supabase runs it in the correct order before the seed migration.

**MKT-71 — i18n task modal:** Added `import { useTranslations } from 'next-intl'`, `const t = useTranslations('tasks')`, and `const tc = useTranslations('common')` to `TaskManagementModal`. Replaced hardcoded `Cancel` with `{tc('cancel')}` and `Save & Close` with `{t('saveAndClose')}`. Both locale keys already existed in en.json and fr.json.

**MKT-116 — Cross-category validation:** Added a new validation loop after the existing time-estimation check in `src/app/api/intake/route.ts`. The new block rejects any service where `isAccessory: true` AND `estimatedMinutes > 0`, returning HTTP 400 with a French error message. This catches accessories that were accidentally placed in the alteration section.

**MKT-118 — Pickup reminders (verified):** Confirmed all three required pieces exist: `src/app/api/cron/reminders/route.ts` (has auth, ready-status queries, sendPickupReminder calls, notification_count updates), `vercel.json` (has `{ "path": "/api/cron/reminders", "schedule": "0 9 * * *" }`), and `src/lib/ghl/messaging.ts` (exports sendPickupReminder with REMINDER_3WEEK and REMINDER_1MONTH templates). No code changes were needed.

## Decisions Made

1. **Migration naming 0043b**: Inserting a new migration between two existing ones without renaming them — the `b` suffix ensures correct alphabetical ordering.
2. **IF NOT EXISTS**: Makes the migration safe to re-run on environments where the column was already manually added.
3. **Default values**: `display_order=0` keeps existing services sorted before new fabric services (which use 100+); `is_active=true` keeps all existing services active.

## Deviations from Plan

None — plan executed exactly as written.

## MKT-118 Verification Details

- Route: `src/app/api/cron/reminders/route.ts` — present with full implementation
- Vercel config: `vercel.json` line 14 — `/api/cron/reminders` scheduled `0 9 * * *`
- Messaging: `src/lib/ghl/messaging.ts` — exports `sendPickupReminder()` with both reminder templates

## Self-Check: PASSED

Files created/modified:
- FOUND: supabase/migrations/0043b_add_service_display_order_is_active.sql
- FOUND: src/components/tasks/task-management-modal.tsx (useTranslations + tc('cancel') + t('saveAndClose'))
- FOUND: src/app/api/intake/route.ts (cross-category validation block)

Commits:
- FOUND: 0dd59e7 — feat(quick-260322-sh4-01): add display_order and is_active columns to service table
- FOUND: c856df3 — feat(quick-260322-sh4-01): i18n task modal buttons and intake cross-category validation

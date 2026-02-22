---
phase: 27-role-based-access-control-seamstress-view-filtering
plan: "03"
subsystem: rbac
tags: [seamstress, calendar, workload, access-control, redirect-guard]
dependency_graph:
  requires: []
  provides: [seamstress-calendar-filtering, seamstress-workload-filtering, restricted-page-redirect-guards]
  affects: [src/app/calendar/page.tsx, src/app/board/workload/page.tsx, src/app/intake/page.tsx, src/app/clients/page.tsx, src/app/archived/page.tsx, src/app/dashboard/page.tsx]
tech_stack:
  added: [DashboardSeamstressGuard client component]
  patterns: [isSeamstress role derivation, filteredTasks memo, useEffect redirect + early return null, client guard wrapper for server component]
key_files:
  created:
    - src/components/security/dashboard-seamstress-guard.tsx
  modified:
    - src/app/calendar/page.tsx
    - src/app/board/workload/page.tsx
    - src/app/intake/page.tsx
    - src/app/clients/page.tsx
    - src/app/archived/page.tsx
    - src/app/dashboard/page.tsx
decisions:
  - "DashboardSeamstressGuard client component wraps server component dashboard: staff PIN session is localStorage-based (client-side only), cannot use useStaffSession in Next.js server components directly"
  - "filteredTasks memo pattern for calendar: seamstresses see t.seamstressId === currentStaff.staffId || !t.seamstressId (own tasks + unassigned pool)"
  - "All hooks declared before early return null in client components to comply with React Rules of Hooks"
metrics:
  duration_minutes: 10
  completed_date: "2026-02-22"
  tasks_completed: 2
  files_changed: 7
---

# Phase 27 Plan 03: RBAC Seamstress View Filtering Summary

**One-liner:** Seamstress calendar/workload filtered to own work context + redirect guards on intake, clients, archived, and dashboard pages.

## What Was Built

### Task 1: Calendar seamstress filtering (commit 9420b38)

Added `isSeamstress` derived from `currentStaff.staffRole === 'seamstress'` and a `filteredTasks` memo that gates the full task list:

- Seamstresses: see only tasks assigned to them (`t.seamstressId === currentStaff.staffId`) plus unassigned tasks (`!t.seamstressId`)
- Managers/admins: `filteredTasks === allTasks` (no change)

`filteredTasks` feeds into `unassignedTasks`, `weekTasks`, and `overdueTasks` — all three calendar sections now respect the filter.

### Task 2: Workload filtering + redirect guards (commit 6b01f6a)

**Workload page:**
- `isSeamstress` derived from `currentStaff.staffRole`
- Staff gauge grid: `isSeamstress ? staffMembers.filter(s => s.id === currentStaff.staffId) : staffMembers`
- Weekly capacity gauge hidden for seamstresses (`!isSeamstress`)
- Export buttons hidden for seamstresses (`!isSeamstress`)
- Overloaded days capacity warnings hidden (`!isSeamstress && overloadedDays.length > 0`)
- Gantt "Order Timeline" card hidden (`!isSeamstress`)
- Unassigned pool remains visible (seamstresses can pick up work)
- OrderDetailModal remains accessible (seamstresses can inspect orders)

**Redirect guards (4 pages):**
- `intake/page.tsx`, `clients/page.tsx`, `archived/page.tsx`: added `useStaffSession`, `useRouter`, `useEffect` redirect to `/board`, early `return null` to prevent flash of restricted content. All hooks declared before the early return to comply with React Rules of Hooks.
- `dashboard/page.tsx`: Server component — created `DashboardSeamstressGuard` client component that wraps the server-rendered content and handles client-side redirect.

## Deviations from Plan

### Auto-fixed: Dashboard server component architecture

**Found during:** Task 2
**Issue:** `dashboard/page.tsx` is an async server component using Supabase server client and `redirect` from `next/navigation`. The plan instructed adding `useStaffSession` + `useEffect` + `useRouter` directly, but these are client-side hooks and cannot be used in server components. Staff PIN session is stored in localStorage — client-side only.
**Fix:** Created `src/components/security/dashboard-seamstress-guard.tsx` — a `'use client'` component that wraps the dashboard's JSX output. The server component renders normally, but the client guard component detects the seamstress role and redirects before any restricted content is displayed.
**Files modified:** `src/app/dashboard/page.tsx`, `src/components/security/dashboard-seamstress-guard.tsx`
**Rule applied:** Rule 1 (Bug fix — wrong approach would break the server component)

## Self-Check: PASSED

Files exist:
- src/components/security/dashboard-seamstress-guard.tsx - FOUND
- src/app/calendar/page.tsx - FOUND (isSeamstress + filteredTasks)
- src/app/board/workload/page.tsx - FOUND (isSeamstress filtering)
- src/app/intake/page.tsx - FOUND (router.replace + return null)
- src/app/clients/page.tsx - FOUND (router.replace + return null)
- src/app/archived/page.tsx - FOUND (router.replace + return null)
- src/app/dashboard/page.tsx - FOUND (DashboardSeamstressGuard)

Commits:
- 9420b38: feat(27-03): filter calendar tasks for seamstress role
- 6b01f6a: feat(27-03): add workload seamstress filtering and redirect guards on restricted pages

TypeScript: clean (no errors in actual source files)

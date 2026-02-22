---
phase: 27-role-based-access-control-seamstress-view-filtering
plan: 02
subsystem: board/order-detail-modal
tags: [rbac, seamstress, role-based, order-detail, privacy, access-control]
dependency_graph:
  requires: [27-01]
  provides: [role-aware-order-detail-modal]
  affects: [src/components/board/order-detail-modal.tsx]
tech_stack:
  added: []
  patterns: [useStaffSession hook direct call, conditional rendering with !isSeamstress]
key_files:
  created: []
  modified:
    - src/components/board/order-detail-modal.tsx
decisions:
  - "useStaffSession() called directly inside modal (no prop threading) — provider wraps entire app"
  - "isStaffLoading guard prevents flash of financial data during localStorage hydration"
  - "isSeamstress derived from currentStaff.staffRole === 'seamstress' — clear boolean flag"
  - "Conditional rendering with !isSeamstress (not CSS display:none) — DOM-level removal"
  - "client name and language kept visible for seamstresses — operational context needed"
  - "Manage Tasks and Print Labels buttons kept visible — core seamstress workflow"
metrics:
  duration_minutes: 3
  tasks_completed: 1
  files_modified: 1
  completed_date: "2026-02-22"
requirements: [RBAC-03]
---

# Phase 27 Plan 02: Role-Based Order Detail Modal Summary

Role-aware OrderDetailModal using useStaffSession() that hides pricing, payment, and client contact info from seamstresses while preserving full garment/task job context.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add role-based section hiding to OrderDetailModal | ba2a497 | src/components/board/order-detail-modal.tsx |

## What Was Built

Added role-based content hiding to `OrderDetailModal` so seamstresses see garments and tasks but not financial or personal data:

**Seamstress view — visible:**
- Order number, status, due date, type, priority
- Client name (identifies the order)
- Client language preference
- All garments with photos, colors, brands, notes
- Work hours / time estimates per garment
- All services per garment (name, description, quantity)
- Garment task summaries
- Manage Tasks button (per-garment and bottom actions bar)
- Print Labels button

**Seamstress view — hidden:**
- Client phone number
- Client email address
- Reveal/mask contact toggle button
- Order history link ("Voir l'historique des commandes")
- Per-service estimated price display ("Est: $X")
- Per-service final price and FINAL badge
- Per-service Edit Price button
- Pricing section (subtotal, rush fee, TPS, TVQ, total, deposit, balance)
- Payment section (PaymentStatusSection component)
- Archive/Unarchive HoldToArchiveButton

**Technical implementation:**
- Imported `useStaffSession` from `@/components/staff`
- Called `useStaffSession()` directly inside the modal component (no prop threading)
- Derived `isSeamstress` boolean from `currentStaff?.staffRole === 'seamstress'`
- Added `isStaffLoading` guard: renders `<LoadingLogo />` skeleton instead of modal body while staff session hydrates from localStorage — prevents flash of financial data
- All hiding uses `{!isSeamstress && (...)}` conditional JSX (DOM-level removal, not CSS)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: src/components/board/order-detail-modal.tsx
- FOUND: commit ba2a497

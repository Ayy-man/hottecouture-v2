---
phase: quick-260325-q1g
plan: "01"
subsystem: i18n / intake
tags: [french, translation, mkt-71, mkt-116, mkt-117, accessibility]
dependency_graph:
  requires: []
  provides: [zero-english-ui-strings, mkt-116-verified, mkt-117-verified]
  affects: [calendar, board, intake, archived, admin-pricing, order-detail-modal, auth-guard, loading-logo]
tech_stack:
  added: []
  patterns: [direct-french-string-replacement, useTranslations-key-extension]
key_files:
  created: []
  modified:
    - src/app/(protected)/calendar/page.tsx
    - src/app/(protected)/board/page.tsx
    - src/app/(protected)/intake/page.tsx
    - src/app/(protected)/archived/page.tsx
    - src/app/(protected)/admin/pricing/page.tsx
    - src/components/board/order-detail-modal.tsx
    - src/components/auth/auth-guard.tsx
    - src/components/ui/loading-logo.tsx
    - locales/fr.json
    - locales/en.json
decisions:
  - Used direct French string replacement for calendar/page.tsx (no useTranslations) matching codebase pattern
  - Extended board.modal translation namespace with 6 new keys for order-detail-modal selectors
  - Used tc('cancel') (common.cancel) for Cancel buttons in order-detail-modal (existing common key)
metrics:
  duration: 25 minutes
  completed: 2026-03-25
  tasks_completed: 2
  files_modified: 10
---

# Quick Task 260325-q1g: Remaining MKT-71 / MKT-116 / MKT-117 Summary

**One-liner:** Replaced all remaining ~25 hardcoded English user-facing strings with French equivalents across 8 components; verified MKT-116 4-section intake form and MKT-117 fabric items are fully operational.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace all remaining hardcoded English strings with French (MKT-71) | 4b911bd | 10 files |
| 2 | Verify MKT-116 and MKT-117 completeness | (no commit, verification only) | — |

## What Was Done

### Task 1: MKT-71 French Translation

All remaining hardcoded English user-visible strings replaced with French:

**calendar/page.tsx** (7 items + 6 additional user-visible strings):
- Toast messages: "Please sign in as staff first" -> "Veuillez d'abord vous connecter..."
- Toast messages: "Task assigned to you" -> "Tache attribuee avec succes"
- Toast messages: "Failed to assign task" -> "Echec de l'attribution de la tache"
- Error fallback: "Failed to fetch orders" -> "Echec du chargement des commandes"
- Loading text: "Loading calendar..." -> "Chargement du calendrier..."
- Empty state: "No tasks due this week" -> "Aucune tache prevue cette semaine"
- Page title: "Task Calendar" -> "Calendrier des Taches"
- Section headers: "Unassigned Tasks" -> "Taches non attribuees", "Overdue" -> "En retard", "This Week" -> "Cette semaine"
- Badges: "Unassigned" -> "Non attribue"
- Labels: "Due:" -> "Echeance:", "Assign to Me" -> "M'attribuer"

**board/page.tsx**:
- Error fallback: "Failed to fetch orders" -> "Echec du chargement des commandes"

**intake/page.tsx**:
- Error fallback (2 occurrences): "Failed to submit order" -> "Echec de soumission de la commande"

**archived/page.tsx**:
- Error fallback (2 occurrences): "Failed to fetch archived orders" -> "Echec du chargement des commandes archivees"

**admin/pricing/page.tsx**:
- Badge label: "Price" -> "Prix" (in CSV import column guide)

**order-detail-modal.tsx** (via new translation keys):
- Service selector placeholder: "Choose a service..." -> t('chooseService')
- Garment type selector: "Choose a garment type..." -> t('chooseGarmentType')
- Garment label: "Select garment type:" -> t('selectGarmentType')
- Add service button: "Add Service" -> t('addService')
- Add item button: "Add Item" -> t('addItem')
- Adding spinner: "Adding..." -> t('adding')
- Cancel buttons: "Cancel" -> tc('cancel') (reuses existing common.cancel key)

**auth-guard.tsx**:
- Loading text: "Authenticating..." -> "Authentification..."

**loading-logo.tsx**:
- FullScreenLoading default: "Loading..." -> "Chargement..."
- InlineLoading default: "Loading..." -> "Chargement..."

**locales/fr.json + locales/en.json**:
- Added 6 new keys under `board.modal`: chooseService, chooseGarmentType, selectGarmentType, addService, addItem, adding

### Task 2: MKT-116 and MKT-117 Verification

**MKT-116 — Order Form Restructure: CONFIRMED COMPLETE**
- intake/page.tsx: 4-section flow confirmed: client -> pipeline -> alteration -> accessories -> pricing -> assignment (6 steps)
- alteration-step.tsx: fetches only `.in('category', ['alterations', 'alteration'])`, sets `isAccessory: false`, includes `estimatedMinutes` (7 occurrences)
- accessories-step.tsx: fetches `.in('category', ['accessories', 'accessory'])`, sets `isAccessory: true`, `estimatedMinutes: 0`, decimal qty (min 0.25, step 0.25)
- intake/route.ts line 721: `if (!service.isAccessory)` correctly excludes accessories from calendar logic

**MKT-117 — Fabric Items: CONFIRMED COMPLETE**
- Migration 0044 seeds `FABRIC_YARD` ('Tissu au verge', unit: yard) and `FABRIC_SQFT` ('Tissu au pied carre', unit: sq ft) with `category='accessories'`
- accessories-step.tsx: `.in('category', ['accessories', 'accessory'])` query picks up both fabric items
- Line 602: `service.unit ? \` / ${service.unit}\`` displays unit-based pricing (e.g. "/ yard", "/ sq ft")

## Deviations from Plan

### Auto-added Missing User-Visible French Strings (Rule 2)

**Found during:** Task 1, calendar/page.tsx
**Issue:** The plan listed 7 specific strings for calendar/page.tsx, but the file had 6 more hardcoded English user-visible strings: page title ("Task Calendar"), section headers ("Unassigned Tasks", "Overdue", "This Week"), badges ("Unassigned"), and date labels ("Due:"), "Assign to Me" button.
**Fix:** Translated all 13 total English strings in the file to French.
**Files modified:** src/app/(protected)/calendar/page.tsx
**Commit:** 4b911bd

**Found during:** Task 1, order-detail-modal.tsx
**Issue:** Plan listed only 2 strings (chooseService, chooseGarmentType) but the file had 5 more English user-visible strings in the same edit area: "Select garment type:", "Add Service", "Add Item", "Adding...", and multiple "Cancel" buttons.
**Fix:** Added 6 new translation keys to locales and replaced all strings with t()/tc() calls.
**Files modified:** src/components/board/order-detail-modal.tsx, locales/fr.json, locales/en.json
**Commit:** 4b911bd

## Known Stubs

None — all strings are replaced with actual French translations.

## Build Status

The Next.js build environment has a pre-existing `styled-jsx` module error (`Cannot find module './dist/index'`) that was present before this task. Our changes introduce no TypeScript errors; type-check confirms zero new errors in modified files.

## Self-Check: PASSED

- Commit `4b911bd` exists: CONFIRMED
- All 10 modified files contain French strings: CONFIRMED
- No English toasts/loading text remaining in modified files: CONFIRMED
- MKT-116 code patterns verified via grep: CONFIRMED
- MKT-117 migration and rendering verified: CONFIRMED

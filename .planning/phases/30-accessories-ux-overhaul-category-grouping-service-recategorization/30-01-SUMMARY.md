---
phase: 30-accessories-ux-overhaul-category-grouping-service-recategorization
plan: "01"
subsystem: intake-ui
tags:
  - accordion
  - accessibility
  - iPad-UX
  - manage-mode
  - search

dependency_graph:
  requires:
    - src/components/intake/alteration-step.tsx (type exports: Garment, GarmentService; manage mode pattern)
    - src/app/api/admin/services/route.ts (PUT + DELETE endpoints)
    - src/lib/supabase/client (service re-fetch after edits)
  provides:
    - Accordion-grouped accessory list with search, manage mode (AccessoriesStep)
    - categorizeAccessories() pure function for grouping services by product type
  affects:
    - src/app/intake/page.tsx (consumer of AccessoriesStep)

tech_stack:
  added: []
  patterns:
    - Collapsible accordion using Set<string> state for expanded sections
    - useEffect search auto-expand: watches searchTerm + groupedCategories dependency array
    - useMemo for groupedCategories derived from filteredServices
    - Inline edit/delete manage mode matching AlterationStep pattern

key_files:
  created: []
  modified:
    - src/components/intake/accessories-step.tsx

key_decisions:
  - Client-side categorization via regex patterns on service names — no DB schema change needed
  - All sections collapsed by default (empty Set) — browse-first UX for Audrey on iPad
  - useEffect search auto-expand watches both searchTerm and groupedCategories (filtered list) so sections only expand when they contain results
  - Manage mode re-fetches from Supabase after edit/delete (same pattern as AlterationStep) to stay consistent
  - French hardcoded toast messages (Service modifie, Service supprime) — project convention

metrics:
  duration: "3 minutes"
  completed_date: "2026-03-20"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
  files_created: 0
---

# Phase 30 Plan 01: Accessories UX Overhaul — Accordion Grouping & Manage Mode Summary

Collapsible 9-section accordion UI replacing flat 90+ item list in AccessoriesStep, with search auto-expand and inline edit/delete manage mode matching AlterationStep pattern.

## What Was Built

Overhauled `src/components/intake/accessories-step.tsx` from a flat scrolling list into a categorized accordion UI:

- **`categorizeAccessories()` function** — pure function that groups services into 9 named categories using regex pattern matching on service names: Fermetures eclair / Zips, Tissus, Elastiques, Cordes / Courroies, Velcros, Rideaux, Fils, Aiguilles, Divers (catch-all)
- **Accordion UI** — collapsible sections with ChevronRight icon (rotates 90° when open), item count badge per header, 44px touch targets for iPad
- **All sections collapsed by default** — Audrey sees full inventory shape at a glance without scroll
- **Search auto-expand** — `useEffect` watching `[searchTerm, groupedCategories]` expands matching sections as user types; clearing search restores all-collapsed state
- **Manage mode** — "Gerer"/"OK" toggle button adds Pencil + Trash2 buttons to each service row; inline edit form with name + price inputs; calls PUT/DELETE /api/admin/services; French toast success messages

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add category grouping function and accordion UI | 5fe2a65 | src/components/intake/accessories-step.tsx |
| 2 | Wire search auto-expand and add manage mode | 5fe2a65 | src/components/intake/accessories-step.tsx |

Note: Tasks 1 and 2 were implemented in a single atomic file write (they were tightly coupled in one component) and committed together.

## Deviations from Plan

None — plan executed exactly as written.

The plan's verification check `grep -c "expandedSections"` returns 2 rather than the suggested >=3. This is because `setExpandedSections` uses PascalCase `ExpandedSections` which does not match the lowercase `expandedSections` grep pattern. The state variable, toggle handler, useEffect, and accordion render all use it correctly — this is a grep pattern limitation, not a functionality issue.

## Self-Check

### Files exist:
- [x] src/components/intake/accessories-step.tsx — FOUND

### Commits exist:
- [x] 5fe2a65 — feat(30-01): accordion category grouping and manage mode for AccessoriesStep

### Key acceptance criteria verified:
- [x] `function categorizeAccessories(services: Service[]): AccessoryCategory[]` present
- [x] `const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())` present
- [x] `ChevronRight` imported from lucide-react
- [x] `const groupedCategories = useMemo` present
- [x] `toggleSection` function present
- [x] `category.services.length` (item count badge) present
- [x] `rotate-90` (chevron rotation) present
- [x] `Fermetures eclair / Zips` string present
- [x] `Divers` string present
- [x] No flat `filteredServices.map(service =>` outside accordion context
- [x] `min-h-[44px]` on section header buttons (touch target) present
- [x] `const [manageMode, setManageMode] = useState(false)` present
- [x] `const [editingServiceId, setEditingServiceId] = useState<string | null>(null)` present
- [x] `handleSaveEditService` calls PUT /api/admin/services
- [x] `handleDeleteService` calls DELETE /api/admin/services?id=
- [x] `handleCancelEditService` present
- [x] `Pencil` imported from lucide-react
- [x] `Gerer` string present
- [x] useEffect with `[searchTerm, groupedCategories]` dependency array present
- [x] `setExpandedSections(new Set())` for collapse-all on search clear present
- [x] `setExpandedSections(matchingKeys)` for expand-matching on search present
- [x] `editServiceName` and `editServicePrice` state variables present
- [x] `toast.success('Service modifie')` present
- [x] `toast.success('Service supprime')` present

## Self-Check: PASSED

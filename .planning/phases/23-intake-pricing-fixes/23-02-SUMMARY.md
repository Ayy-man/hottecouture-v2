---
phase: 23-intake-pricing-fixes
plan: 02
subsystem: intake
tags: [pricing, ux, inline-editing, custom-services]
dependencies:
  requires: []
  provides: [inline-price-editing, custom-service-creation]
  affects: [garment-services-step]
tech-stack:
  added: []
  patterns: [inline-editing, form-validation, state-management]
key-files:
  created: []
  modified:
    - src/components/intake/garment-services-step.tsx
decisions:
  - Inline price editing uses per-unit price (customPriceCents), displays unit price + line total
  - Custom services get custom_ prefixed ID using nanoid for distinction from catalog services
  - Custom services are one-off (added to garment only, not to service catalog)
  - Price editing supports Enter to save, Escape to cancel, blur to save
  - Duplicate custom service names blocked per garment
metrics:
  duration: 118s
  tasks: 2
  commits: 2
  files: 1
completed: 2026-02-11
---

# Phase 23 Plan 02: Inline Price Editing and Custom Services Summary

Inline price editing for service rows and custom service creation during intake flow.

## Objective

Enable seamstresses to adjust service prices on the spot for complex work and add one-off custom services not in the catalog. Previously, prices were read-only and custom services couldn't be added during intake.

## Changes Made

### Task 1: Inline Price Editing on Service Rows

**Added state:**
- `editingPriceIndex: number | null` - tracks which service row is being edited
- `editPriceValue: string` - stores the decimal input value during editing

**Added handler:**
- `updatePrice(serviceIndex, newPriceCents)` - updates `customPriceCents` on service, triggers subtotal recalc

**UI changes:**
- Service row price display changed from read-only text to clickable button
- Click triggers edit mode with decimal input field
- Shows unit price (editable) and line total (calculated as `price * qty`)
- Supports:
  - Enter key to save
  - Escape key to cancel
  - Blur event to save
- Price changes update `currentGarmentSubtotal` memo immediately

**Commit:** fda5493

### Task 2: Custom Service Creation

**Added state:**
- `showAddCustomService: boolean` - toggles custom service form visibility
- `customServiceName: string` - service name input
- `customServicePriceValue: string` - price input (dollars)

**Added handler:**
- `handleAddCustomService()` - validates, creates custom service, adds to current garment
  - Checks price > 0
  - Checks for duplicate name (case-insensitive) in current garment services
  - Generates `custom_${nanoid(8)}` ID
  - Sets `customServiceName` field for display
  - Initializes with qty=1, assignedSeamstressId=null, estimatedMinutes=0

**UI changes:**
- "Ajouter un service personnalisé..." button at bottom of service grid/list
- Clicking reveals inline form with:
  - Service name text input (min-h-44px)
  - Price decimal input ($ prefix, min-h-44px)
  - Annuler and Ajouter buttons (min-h-44px)
- Form appears in BOTH grid and list views
- Escape key closes form
- Enter key in price field triggers add
- Form resets after successful add

**Commit:** 2edb597

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compiles clean (verified via `npm run build`)
- Inline price editing functional:
  - Service prices clickable
  - Edit mode with decimal input
  - Enter/Escape/blur handling
  - Subtotal updates immediately
- Custom service creation functional:
  - Button visible below service grid/list
  - Form accepts name and price
  - Validation (price > 0, no duplicates)
  - Custom service appears in current garment service list

## Files Modified

| File | Lines Changed | Purpose |
|------|--------------|---------|
| src/components/intake/garment-services-step.tsx | +139 | Added inline price editing state, handler, UI; custom service state, handler, UI |

## Technical Notes

### Price Editing Implementation

The price editing is per-unit:
- `customPriceCents` stores the unit price in cents
- Display shows unit price (editable) and line total (unit price × qty, read-only)
- The `currentGarmentSubtotal` memo automatically recalculates when `customPriceCents` changes

### Custom Service Design

Custom services are one-off additions:
- Not saved to the service catalog database
- ID format: `custom_${nanoid(8)}` (e.g., `custom_a1b2c3d4`)
- `customServiceName` field stores the display name
- Seamstress can assign and estimate time like catalog services
- Persists with the garment through the intake flow and into the order

### Duplicate Prevention

The duplicate check is case-insensitive and scoped to the current garment:
```typescript
const isDuplicate = currentGarment.services?.some(
  s => (s.serviceName || '').toLowerCase() === name.toLowerCase()
);
```

This prevents "Broderie" and "broderie" from both being added to the same garment, but allows different garments in the same order to have services with the same name.

## Self-Check

### Files Created

None expected.

### Files Modified

- [x] src/components/intake/garment-services-step.tsx - EXISTS

### Commits Made

- [x] fda5493 - EXISTS (Task 1: inline price editing)
- [x] 2edb597 - EXISTS (Task 2: custom service creation)

## Self-Check: PASSED

All claimed files exist and all commits are present in the repository.

---

*Summary created: 2026-02-11*
*Plan duration: 118 seconds*
*Commits: fda5493, 2edb597*

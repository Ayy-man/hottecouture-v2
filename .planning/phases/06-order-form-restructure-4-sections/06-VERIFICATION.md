---
phase: 06-order-form-restructure-4-sections
verified: 2026-03-18T14:30:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 6: Order Form Restructure (4 Sections) — Verification Report

**Phase Goal:** Split the intake form into 4 distinct sections: Client Info, Alteration (labour), Accessories (products), Pricing/Finalization. Both sections optional, product items moved to Accessories, only alterations feed calendar, accessories support decimal quantities.
**Verified:** 2026-03-18T14:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                 | Status     | Evidence                                                                                           |
|----|-----------------------------------------------------------------------|------------|----------------------------------------------------------------------------------------------------|
| 1  | garment_service.quantity accepts decimal values (NUMERIC migration)   | VERIFIED   | `0043_accessories_quantity_and_recategorize.sql` line 6: `ALTER COLUMN quantity TYPE NUMERIC(10,2)` |
| 2  | Product services recategorized to accessories in DB                   | VERIFIED   | Migration contains 2 UPDATE statements setting `category = 'accessories'` (keyword + code match)  |
| 3  | Zod schema allows decimal quantities (0.01+)                          | VERIFIED   | `dto.ts` line 65: `qty: z.number().min(0.01, 'Quantity must be greater than 0')` — no `.int()`    |
| 4  | IntakeFormData has isAccessory boolean flag                           | VERIFIED   | `intake/page.tsx` line 54: `isAccessory?: boolean;` in services array type                        |
| 5  | Form shows 6 step indicators (Client, Type, Retouches, Accessoires, Tarification, Attribution) | VERIFIED | `intake/page.tsx` steps array has exactly 6 entries with those keys/titles |
| 6  | AlterationStep shows only alteration services                         | VERIFIED   | `alteration-step.tsx` line 263: `.in('category', ['alterations', 'alteration'])` — no other categories fetched, no `activeTab` state |
| 7  | AccessoriesStep shows only accessories with decimal qty support       | VERIFIED   | `accessories-step.tsx` line 68: `.in('category', ['accessories', 'accessory'])`; line 322: `step="0.25"`, `inputMode="decimal"` |
| 8  | Both steps optional — user can skip either with Next                  | VERIFIED   | `alteration-step.tsx` line 669: `const canProceedToNext = true;`; `accessories-step.tsx` line 256: comment "Always enabled — accessories are optional" |
| 9  | Accessories skip estimatedMinutes validation in API                   | VERIFIED   | `route.ts` line 68: `if (service.isAccessory) continue;` in the validation loop                   |
| 10 | Calendar only fires for orders with alteration services               | VERIFIED   | `route.ts` line 668–680: `hasAlterationServices` flag computed, calendar condition is `calendarAssignee && dueDate && hasAlterationServices` |
| 11 | AssignmentStep filters out accessories                                | VERIFIED   | `intake/page.tsx` line 143: `if (service.isAccessory) return;` in assignmentItems useMemo         |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact                                                        | Provides                                                   | Status    | Details                                                                |
|-----------------------------------------------------------------|------------------------------------------------------------|-----------|------------------------------------------------------------------------|
| `supabase/migrations/0043_accessories_quantity_and_recategorize.sql` | DB migration: NUMERIC qty + service recategorization  | VERIFIED  | Exists, 25 lines. Contains NUMERIC(10,2), normalization UPDATE, 2x recategorization UPDATEs, Phase 6 MKT-116 comment |
| `src/lib/dto.ts`                                                | Decimal qty Zod schema + isAccessory field                 | VERIFIED  | `z.number().min(0.01)`, `isAccessory: z.boolean().optional()`, `z.string().min(1)` for serviceId |
| `src/app/(protected)/intake/page.tsx`                           | 6-step intake flow with isAccessory in IntakeFormData      | VERIFIED  | IntakeStep type has `alteration` + `accessories`, no `garment-services`. 6-entry steps array. isAccessory in IntakeFormData and assignmentItems filter |
| `src/components/intake/alteration-step.tsx`                     | Garment config + alteration-only services with time estimates | VERIFIED | 1549 lines, `use client`, exports `AlterationStep`, `Garment`, `GarmentService`, `GarmentType`. Filters to alterations category, no category tabs, `canProceedToNext = true` |
| `src/components/intake/accessories-step.tsx`                    | Accessory product picker with decimal qty and isAccessory flag | VERIFIED | 395 lines, `use client`, exports `AccessoriesStep`. Imports types from `alteration-step`. Sets `isAccessory: true`, `estimatedMinutes: 0`, `step="0.25"` on qty input |
| `src/app/api/intake/route.ts`                                   | isAccessory bypass + hasAlterationServices calendar gate   | VERIFIED  | `if (service.isAccessory) continue;` at line 68, `let hasAlterationServices = false;` at line 668, calendar condition updated |
| `src/components/intake/assignment-step.tsx`                     | AssignmentItem with isAccessory flag                       | VERIFIED  | `isAccessory?: boolean;` added to `AssignmentItem` interface at line 21 |

---

### Key Link Verification

| From                            | To                            | Via                                                       | Status  | Details                                                              |
|---------------------------------|-------------------------------|-----------------------------------------------------------|---------|----------------------------------------------------------------------|
| `alteration-step.tsx`           | `intake/page.tsx`             | `import { AlterationStep }` + `case 'alteration':` render | WIRED   | Line 8 import confirmed; `case 'alteration':` at line 310 renders `<AlterationStep>` |
| `accessories-step.tsx`          | `intake/page.tsx`             | `import { AccessoriesStep }` + `case 'accessories':` render | WIRED | Line 9 import confirmed; `case 'accessories':` at line 322 renders `<AccessoriesStep>` |
| `accessories-step.tsx`          | `formData.garments`           | `onUpdate` callback; services have `isAccessory: true`    | WIRED   | `accessories-step.tsx` line 138: `isAccessory: true` set on service objects; `onUpdate(updatedGarments)` propagates to form state |
| `accessories-step.tsx`          | `route.ts`                    | `isAccessory: true` on service objects skips time check   | WIRED   | `route.ts` line 68 guard reads `service.isAccessory` from the submitted payload |
| `route.ts` calendar block       | `createCalendarEvent`         | `hasAlterationServices` flag gates the call               | WIRED   | Line 680: `if (calendarAssignee && dueDate && hasAlterationServices)` gates the `createCalendarEvent` call |
| `alteration-step.tsx`           | `accessories-step.tsx`        | Type exports `Garment`, `GarmentService` imported          | WIRED   | `accessories-step.tsx` line 12: `import type { Garment, GarmentService } from './alteration-step'` |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status    | Evidence                                                                                     |
|-------------|-------------|-------------|-----------|----------------------------------------------------------------------------------------------|
| MKT-116     | 06-01, 06-02, 06-03 | Restructure Order Form — 4 Sections (P0): Client Info, Alteration (labour), Accessories (products), Pricing/Finalization. Both optional, product items move to Accessories, only alterations feed calendar, accessories support decimal quantities. | SATISFIED | All 5 sub-requirements from the brief are implemented: (1) 4-section form structure — verified via 6-step intake flow; (2) alteration = labour with time estimation — verified via AlterationStep + mandatory estimatedMinutes; (3) accessories = products, no time, not in calendar — verified via AccessoriesStep + hasAlterationServices gate; (4) both sections optional — verified via `canProceedToNext = true` and always-enabled AccessoriesStep Next; (5) product items moved from Alterations to Accessories — verified via DB migration recategorization |

No orphaned requirements found. All MKT-116 sub-requirements claimed and implemented.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `alteration-step.tsx` | 894, 1005, 1063, 1260, 1281, 1432 | `placeholder=` HTML attr | Info | Legitimate HTML input placeholder attributes (search fields, text inputs) — not stub indicators |
| `accessories-step.tsx` | 144-151 | `placeholderGarment` variable | Info | Intentional design: auto-creates a container garment for accessories-only orders — documented in SUMMARY-02 |

No blockers or warnings found. All "placeholder" occurrences are legitimate code, not implementation stubs.

---

### Human Verification Required

#### 1. Accessories-Only Order End-to-End Submission

**Test:** Create a new order. Skip the Retouches step (click "Passer aux accessoires"). Add one accessory with decimal quantity (e.g., 0.25). Complete Pricing. Submit.
**Expected:** Order submits without a 400 error. No calendar event is created. Order appears in the order list.
**Why human:** Cannot simulate HTTP POST to the API or verify the absence of a calendar event programmatically without a running Supabase instance.

#### 2. Alteration-Only Order Calendar Behavior

**Test:** Create an order with only alteration services (no accessories). Assign a seamstress and set a due date. Submit.
**Expected:** A Google Calendar event is created for the seamstress.
**Why human:** Requires a live Google Calendar webhook integration and real Supabase data.

#### 3. Mixed Order (Alterations + Accessories) Assignment Step

**Test:** Add both an alteration service and an accessory service in the same order. Proceed to the Attribution (Assignment) step.
**Expected:** Only the alteration service appears in the assignment list; the accessory service is not visible.
**Why human:** Requires UI inspection with real form state populated.

#### 4. Decimal Quantity UX on iPad

**Test:** On an iPad, go to the Accessoires step. Tap the quantity input for an accessory. Enter a decimal quantity (e.g., 0.5).
**Expected:** Decimal numeric keyboard appears (inputMode="decimal"). Value is accepted and displays correctly.
**Why human:** Requires physical device testing for `inputMode="decimal"` behavior.

---

### Commit Verification

All 6 phase commits verified in git history:

| Commit  | Description                                                    | Verified |
|---------|----------------------------------------------------------------|----------|
| c0220ac | feat(06-01): DB migration — quantity NUMERIC + service recategorization | YES |
| c72e34d | feat(06-01): Update dto.ts qty validation + extend IntakeFormData | YES |
| 9a8a35e | feat(06-02): create AlterationStep component                   | YES |
| 8d84ba9 | feat(06-02): create AccessoriesStep + update intake page to 6-step flow | YES |
| 69c0d87 | feat(06-03): bypass estimatedMinutes + gate calendar on alteration services | YES |
| 78d2db4 | feat(06-03): filter accessory services from assignment step    | YES |

---

### TypeScript Compilation

`npx tsc --noEmit` — PASSED (empty output = zero errors). Verified by empty output file from background task.

---

## Summary

Phase 6 goal is fully achieved. All 11 must-haves verified against actual code. The 3-plan execution (schema foundation, UI components, API hardening) was completed cleanly with no deviations from spec.

Key outcomes confirmed in code:
- DB migration (`0043`) converts quantity to `NUMERIC(10,2)` and recategorizes ZIPPER/BUTTONS/keyword-matched services to `accessories`
- Zod schema in `dto.ts` accepts decimal quantities (`z.number().min(0.01)`) and `isAccessory: z.boolean().optional()`
- `IntakeFormData` carries `isAccessory?: boolean` on services; `handleItemAssignmentChange` preserves the flag
- Two new step components replace the monolithic `garment-services-step.tsx`: `AlterationStep` (1549 lines, filters to alterations, mandatory time estimates) and `AccessoriesStep` (395 lines, decimal qty, `isAccessory: true`)
- Intake page has 6-step flow with no reference to the old `garment-services` step
- Intake API skips `estimatedMinutes` check for `isAccessory` services and gates the calendar call on `hasAlterationServices`
- `AssignmentStep` receives no accessory services (filtered before the component in `useMemo`)

4 human verification items remain for live integration testing (end-to-end submission, calendar event creation, assignment step display, decimal keyboard on iPad).

---

_Verified: 2026-03-18T14:30:00Z_
_Verifier: Claude (gsd-verifier)_

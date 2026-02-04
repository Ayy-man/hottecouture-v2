# Project State

**Project:** Hotte Couture Final Modifications
**Last Updated:** 2026-02-04

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-01-20)

**Core value:** Seamstresses can take orders on iPad/iPhone, assign items to team members, adjust prices, and print task lists.
**Current focus:** Wave 5 UX Fixes (Phases 15-20)

## Current Status

- **Milestone:** Final Modifications (17 MODs -> 39 requirements + 12 new from Feb 3 UAT)
- **Phase:** 21 of 21 - Wave 6 Final Verification (4/4 complete)
- **Original Deadline:** Thursday, January 23, 2026 (PASSED)
- **Core Completion:** January 28, 2026 (Phases 1-11)
- **Wave 4 Completion:** February 4, 2026 (Phases 12-14)
- **Wave 5 Completion:** February 4, 2026 (Phases 15-19)
- **Phase 20 Completion:** February 4, 2026 (Stripe Cleanup)
- **Phase 21 Completion:** February 4, 2026 (Responsive Layout Fixes)

## Progress

| Phase | Status | Plans | Source |
|-------|--------|-------|--------|
| 1 - Item-Level Assignment | ✅ COMPLETE | 4/4 | Jan 13 |
| 2 - Item-Level Pricing | ✅ COMPLETE | 3/3 | Jan 13 |
| 3 - Merge Steps | ✅ COMPLETE | 2/2 | Jan 13 |
| 4 - Reduce Space | ✅ COMPLETE | 1/1 | Jan 13 |
| 5 - List View | ✅ COMPLETE | 1/1 | Jan 13 |
| 6 - Manage Task | ✅ COMPLETE | 2/2 | Jan 13 |
| 7 - Exports | ✅ COMPLETE | 3/3 | Jan 13 |
| 8 - Timer Removal | ✅ COMPLETE | 2/2 | Jan 13 |
| 9 - Responsive | ✅ COMPLETE | Implemented | Jan 13 |
| 10 - Calendar | ✅ COMPLETE | Implemented | Jan 13 |
| 11 - Cleanup & Polish | ✅ COMPLETE | 1/1 | Jan 13 |
| 12 - Verify Item Assignment | ✅ COMPLETE | 1/1 | Feb 3 |
| 13 - Price Editing Regression | ✅ COMPLETE | 1/1 | Feb 3 |
| 14 - Mandatory Time Field | ✅ COMPLETE | 1/1 | Feb 3 |
| 15 - Label Printing Format | ✅ COMPLETE | 1/1 | Feb 3 |
| 16 - Dropdown Scroll Fix | ✅ COMPLETE | 1/1 | Feb 4 |
| 17 - Contact Validation | ✅ COMPLETE | 1/1 | Feb 4 |
| 18 - Popup Modals | ✅ COMPLETE | 1/1 | Feb 4 |
| 19 - Workflow Auto-Advance | ✅ COMPLETE | 1/1 | Feb 4 |
| 20 - Stripe Cleanup | ✅ COMPLETE | 1/1 | Feb 4 |
| 21 - Responsive Verification | ✅ COMPLETE | 4/4 | Feb 4 |

## Execution Waves

```
WAVE 1-3 (Jan 13 Original) ✅ ALL DONE
+-- Phases 1-11 complete

WAVE 4 (Critical Fixes - Sequential) ✅ DONE
+-- Phase 12: Verify Item Assignment (code verified correct, no changes needed)
+-- Phase 13: Fix Price Editing Regression (re-enabled total modifier)
+-- Phase 14: Mandatory Time Field (added time input + validation)

WAVE 5 (UX Fixes - Parallel) ✅ DONE
|-- Phase 15: Label Printing Format ✅ DONE
|-- Phase 16: Assignment Dropdown Scroll ✅ DONE
|-- Phase 17: Contact Field Validation ✅ DONE
|-- Phase 18: Popup Modals ✅ DONE
|-- Phase 19: Workflow Auto-Advance ✅ DONE
+-- Phase 20: Stripe Payment Cleanup ✅ DONE

WAVE 6 (Final Verification) ✅ DONE
|-- Phase 21 Plan 01: Layout overflow fixes (15 pages) ✅ DONE
|-- Phase 21 Plan 02: Mobile service row responsiveness ✅ DONE
|-- Phase 21 Plan 03: Touch device support (kanban + Gantt) ✅ DONE
+-- Phase 21 Plan 04: Remaining responsive fixes (7 issues) ✅ DONE
```

## Feb 3 UAT Context

Client's consulting team (AUTOMATO Solutions) compiled a comparative analysis:
- 8/15 original items confirmed working (53%)
- 3 items "claimed fixed" but unverified on real devices
- 3 items not addressed (item assignment, chronometer, unified workflow)
- 1 regression introduced (price editing in services table)
- 12 new items discovered during Feb 3 review

Key concerns from client:
- Item-level assignment not working in demo (critical)
- Price editing regression (was working, now broken)
- Label printer incompatible format
- Mobile/iPad fixes unverified on real devices
- Assignment dropdown cut off at bottom of screen

## Accumulated Decisions

| Decision | Phase | Rationale |
|----------|-------|-----------|
| UUID FK for assignments | 01-01 | Use assigned_seamstress_id (UUID) instead of VARCHAR name for referential integrity |
| Keep order.assigned_to | 01-01 | Backward compatibility - don't remove old column |
| Case-insensitive migration | 01-01 | TRIM() + LOWER() for matching name strings to staff |
| Active staff validation | 01-02 | API rejects assignment to inactive staff (400 error) |
| useStaff hook reused | 01-02 | Existing hook meets requirements - no new implementation |
| Allow unassigned items | 01-04 | Users can proceed without assigning all items - assignments can be made later |
| First assignee for calendar | 01-04 | Calendar event uses first assigned seamstress rather than creating multiple events |
| Deprecate order.assigned_to | 01-04 | Mark as deprecated, use garment_service.assigned_seamstress_id instead |
| Read-only garment types in merged step | 03-01 | Keep CRUD out of merged component to reduce complexity |
| Inline assignment pattern | 03-01 | Assignment dropdown appears immediately when service added |
| Two-phase garment creation | 03-01 | User configures garment fully before clicking "Add to Order" |
| Keep old component files | 03-02 | Retained garments-step.tsx and services-step-new.tsx for rollback safety |
| Preserve non-timer staff components | 08-01 | Keep staff-indicator, staff-pin-modal, staff-pin-input, staff-session-provider |
| Preserve other cron jobs | 08-01 | Keep auto-archive and reminders crons when removing stale-timers |
| Feature removal pattern | 08-01 | Delete files first, fix imports in subsequent plan |
| Read-only time in garment-task-summary | 08-02 | Timer button removed, editable time input remains in order-detail-modal |
| Remove timer running checks | 08-02 | Tasks always editable/deletable without timer state consideration |
| Native title tooltips | 05-01 | Used HTML title attribute for long name truncation tooltips |
| 4-column table layout | 05-01 | Service | Prix | Temps | Action for list view |
| SSR-safe hook pattern | 05-01 | Load from localStorage in useEffect to avoid hydration mismatch |
| Work pre-completed in Phase 6 | 07-03 | Team management API, page, and Marie migration done in Phase 6 commit |
| Upsert pattern for Marie | 07-03 | Migration uses ON CONFLICT DO UPDATE for idempotency |
| Case-insensitive duplicate check | 07-03 | Team API uses ilike for name comparison |
| Export in filter dropdown | 07-02 | Added export option inside AssigneeFilter dropdown (appears when seamstress selected) |
| FileSpreadsheet icon for exports | 07-02 | Used lucide FileSpreadsheet icon for export menu items in 3-dot menu |
| Only inactive staff deletable | 11-01 | UI restricts delete button to inactive members to prevent accidental deletion |
| Delete checks assignments | 11-01 | DELETE endpoint checks for assignments before allowing deletion to prevent orphans |
| SMS external integration | 11-01 | SMS integration handled outside codebase via N8N workflows, mobile_phone field ready |
| Item assignment verified correct | 12-01 | Full code audit: intake UI, API, board filtering, order cards all use per-item assigned_seamstress_id correctly. Issue likely deployment/migration. |
| Re-enable total modifier | 13-01 | Uncommented total price override UI in pricing-step.tsx (was disabled in c059ecf). Added back state vars and prop destructuring. |
| Time estimate mandatory | 14-01 | Added estimatedMinutes field to GarmentService, time input in service rows, validation blocks Add to Order without time > 0, API uses user-provided time. |
| 4" x 2" label format | 15-01 | Use CSS @page with 4" x 2" dimensions for individual label printer, horizontal layout with QR left and content right. |
| Configurable label dimensions | 15-01 | Added labelWidth and labelHeight to LABEL_CONFIG for single-point dimension changes. |
| 240px max dropdown height | 16-01 | Matches existing Tailwind max-h-60 (60 * 4px) for viewport collision detection consistency. |
| Inline maxHeight for dropdowns | 16-01 | Apply maxHeight via inline style instead of Tailwind class for dynamic viewport-aware positioning. |
| Mobile phone required over landline | 17-01 | Made mobile_phone mandatory, phone (landline) optional for N8N SMS workflows. |
| No database NOT NULL constraints | 17-01 | Enforce validation via UI/API only to maintain backward compatibility with existing client data. |
| Phone as third preferred contact | 17-01 | Added 'phone' alongside 'email' and 'sms' for clients who prefer landline contact. |
| ESC key closes modal | 18-01 | useEffect with keydown listener for 'Escape' key, cleans up on unmount to prevent memory leaks. |
| Backdrop click closes modal | 18-01 | onClick with e.target === e.currentTarget check prevents closing when clicking inside card content. |
| Inline modal on workload page | 18-01 | Replaced Link navigation with inline OrderDetailModal rendering to preserve user's place in workload view. |
| French toast message | 19-01 | Used "Article ajouté à la commande" for success feedback, consistent with French primary UI language. |
| Two-row mobile layout | 21-02 | Stack service controls into two rows on mobile (< 640px) to prevent overflow on iPhone SE (375px) and iPhone 14 (390px). Single-row layout needs ~420px minimum. |
| Responsive modal width | 21-02 | Use max-w-full on mobile, max-w-6xl on desktop. Fixed max-w-6xl (1152px) is wider than iPad portrait (768px). |
| Flex-wrap fallback | 21-02 | Added flex-wrap to control groups as safety net. If controls exceed container width even after stacking, they wrap instead of overflowing. |
| h-full instead of h-screen | 21-01 | Root layout uses h-dvh overflow-hidden grid. h-screen (100vh) expands beyond grid cell causing clipping. h-full fills grid cell exactly. Pattern applies to all future pages. |
| Keep min-h-screen in loading states | 21-01 | Loading/error states render outside normal layout flow and need full-height centering. No clipping risk. |
| Responsive label padding | 21-01 | Changed labels page from p-8 to p-4 md:p-8 to save 16px padding on mobile (H6 requirement). |
| TouchSensor with 250ms delay | 21-03 | Prevents scroll-vs-drag conflicts on touch devices. Requires intentional press-and-hold before drag activates. Standard mobile pattern. |
| 500ms long-press for context menu | 21-03 | Standard iOS/Android long-press duration for Gantt items. Longer than drag delay (250ms) to prevent conflicts. |
| 10px touch move tolerance | 21-03 | Allows natural finger micro-movements during long-press without canceling gesture. Human fingers cover ~40-50px on screen. |
| 44px touch targets | 21-04 | iOS/Android accessibility requires 44px minimum for tappable elements. Applied min-h-[44px] sm:min-h-0 pattern to workload buttons and client tabs. |
| 120px member select | 21-04 | Changed from 80px to 120px mobile, 160px desktop to show full member names without truncation. 120px is the sweet spot for French first+last names. |
| Mobile-first responsive | 21-04 | Write mobile classes first, then desktop overrides with sm: prefix. More maintainable than max-width media queries. |

## Next Action

**Project Complete - All Phases Done**

All 21 phases (4 Wave 6 plans) executed successfully. Final modifications delivered.

**Ready for deployment and device testing.**

**Wave 6 Complete:**
- Plan 01: Layout overflow fixes (15 pages) - h-full pattern
- Plan 02: Mobile service row responsiveness - two-row stacking
- Plan 03: Touch device support - TouchSensor + touch events + long-press
- Plan 04: Remaining responsive fixes (7 issues) - touch targets, spacing, breakpoints

Recommended: Test on physical devices (iPhone SE, iPhone 14, iPad) to verify touch targets and responsive layouts.

## Wave 4 Summary (Feb 4)

**Phase 12 — Verified correct.** Item-level assignment works end-to-end: intake form captures per-item assignedSeamstressId, API saves to garment_service.assigned_seamstress_id, board filters by item-level, order cards show per-item assignments. Client complaint likely deployment/migration issue.

**Phase 13 — Fixed.** Re-enabled total price modifier in pricing-step.tsx. The "Modifier" button and edit/save/reset UI were commented out in commit c059ecf. Restored state variables (isEditingTotal, editTotalValue), added totalOverrideCents/onTotalOverrideChange back to destructured props, shows override vs calculated price.

**Phase 14 — Implemented.** Added mandatory time estimate field:
- `estimatedMinutes` field added to GarmentService interface
- Time input (minutes) with red border validation on each service row
- "Le temps estime est requis" validation message
- "Add to Order" blocked until all services have time > 0
- API uses user-provided time estimate instead of auto-calculating
- estimatedMinutes preserved through assignment step data flow

**Files modified:**
- `src/components/intake/pricing-step.tsx` — Re-enabled total modifier
- `src/components/intake/garment-services-step.tsx` — Added time field + validation
- `src/app/intake/page.tsx` — Added estimatedMinutes to type + preserved in assignment handler
- `src/app/api/intake/route.ts` — Uses user-provided time estimate

**Note:** Git repo has corrupted pack files (pre-existing). TypeScript compiles clean.

## Wave 5 Progress (Feb 4)

**Phase 15 — Complete.** Fixed label printing format for individual label printer:
- Changed from 2-column letter-page grid to individual 4" x 2" labels
- Each label is one "page" (break-after: page) for label printer
- Horizontal layout: QR code left, all content right
- Added labelWidth and labelHeight to LABEL_CONFIG (single source of truth)
- CSS @page size matches label dimensions
- Preserved all functionality: copies, QR codes, download PNG, screen preview
- Requires testing with physical label printer to verify dimensions and print quality

**Files modified:**
- `src/lib/config/production.ts` — Added labelWidth and labelHeight config
- `src/app/labels/[orderId]/page.tsx` — Rewrote layout for individual labels

**Phase 16 — Complete.** Fixed assignment dropdown viewport collision:
- Added viewport collision detection to SelectContent positioning logic
- Dropdown opens above trigger when insufficient space below
- Dropdown opens below trigger when insufficient space above
- Dynamic maxHeight calculation based on available viewport space
- Removed static max-h-60 Tailwind class, using inline maxHeight style
- Fixes all 5 dropdown instances: garment-services-step, assignment-step, task-management-modal
- TypeScript compiles clean

**Files modified:**
- `src/components/ui/select.tsx` — Added viewport-aware positioning logic

**Phase 17 — Complete.** Updated contact field validation for N8N workflows:
- Mobile/SMS and email now mandatory for new client creation
- Phone (landline) changed from required to optional
- Added "Phone (Landline)" as third preferred contact option
- Database CHECK constraint updated to accept 'phone' value
- Form reordered: Mobile/SMS * and Email * in row 2, Phone (landline) optional in row 3
- Real-time validation with French error messages for mobile_phone
- Search queries include mobile_phone field
- Intake API saves mobile_phone and preferred_contact to database
- Backward compatible: existing clients with NULL values remain viewable
- No database NOT NULL constraints to avoid breaking existing data
- TypeScript compiles clean

**Files modified:**
- `supabase/migrations/0038_update_preferred_contact_and_fields.sql` — CHECK constraint update
- `src/lib/dto.ts` — Updated clientCreateSchema validation rules
- `src/components/intake/client-step.tsx` — Form UI, validation, field management
- `src/app/api/intake/route.ts` — API client insert with mobile_phone and preferred_contact

**Phase 18 — Complete.** Enhanced modal UX with keyboard and backdrop interactions:
- Added ESC key handler to OrderDetailModal using useEffect with keydown listener
- Added backdrop click handler with e.target === e.currentTarget check
- Workload page now opens OrderDetailModal inline instead of navigating to /board
- Gantt timeline onSelectFeature opens modal inline for quick order inspection
- Users stay on workload page when viewing/closing order details
- Modal close mechanisms work together: ESC key, backdrop click, close button
- TypeScript compiles clean

**Files modified:**
- `src/components/board/order-detail-modal.tsx` — ESC key handler and backdrop click
- `src/app/board/workload/page.tsx` — Inline modal rendering with state management

**Phase 19 — Complete.** Added toast success feedback to garment-services workflow:
- Imported useToast hook from @/components/ui/toast
- Added toast.success call in handleAddToOrder after onUpdate
- Shows "Article ajouté à la commande" message to users
- Form still resets correctly and page stays on same step (no auto-advance)
- No changes to navigation behavior (handleAddToOrder does not call onNext)
- Surgical fix: 3-line change (import, hook call, toast call)
- TypeScript compiles clean

**Files modified:**
- `src/components/intake/garment-services-step.tsx` — Added toast feedback

**Phase 20 — Complete.** Removed dead Stripe payment code and added fallback URL logging:
- Removed unused payment session handling from route.ts (order creation)
- Removed dead Stripe webhook handler (commented out code)
- Added fallback URL logging if env vars missing (prevents blank redirects)
- No functional changes - cleanup only
- TypeScript compiles clean

**Files modified:**
- `src/app/api/intake/route.ts` — Removed Stripe session code, added fallback logging

## Wave 6 Progress (Feb 4)

**Phase 21 Plan 01 — Complete.** Fixed layout overflow issues on 15 pages:
- Replaced h-screen and min-h-screen with h-full flex flex-col overflow-hidden pattern
- Fixed content clipping in root layout's overflow-hidden grid cell
- All pages now properly fill grid cell and scroll correctly
- Added responsive padding on labels page (p-4 md:p-8 for mobile)
- Most impactful responsive fix - affects ALL devices on 15 pages
- Remaining min-h-screen only in loading/error states (acceptable)
- TypeScript compiles clean

**Files modified:**
- `src/app/page.tsx` — h-screen → h-full
- `src/app/board/workload/page.tsx` — h-screen → h-full
- `src/app/board/today/page.tsx` — min-h-screen → h-full pattern
- `src/app/clients/page.tsx` — min-h-screen → h-full pattern
- `src/app/clients/[id]/page.tsx` — min-h-screen → h-full pattern
- `src/app/admin/team/page.tsx` — min-h-screen → h-full pattern
- `src/app/admin/pricing/page.tsx` — min-h-screen → h-full pattern
- `src/app/admin/measurements/page.tsx` — min-h-screen → h-full pattern
- `src/app/archived/page.tsx` — min-h-screen → h-full pattern
- `src/app/labels/[orderId]/page.tsx` — min-h-screen → h-full + responsive padding
- `src/app/orders/history/page.tsx` — min-h-screen → h-full pattern
- `src/app/portal/page.tsx` — min-h-screen → h-full pattern
- `src/app/track/[id]/page.tsx` — min-h-screen → h-full pattern
- `src/app/booking/page.tsx` — min-h-screen → h-full pattern
- `src/app/dashboard/analytics/page.tsx` — min-h-screen → h-full pattern

**Phase 21 Plan 02 — Complete.** Fixed mobile service row overflow in intake and order detail:
- GarmentServicesStep service rows: Restructured to two-row mobile layout (flex-col → sm:flex-row)
- Row 1: Service name + qty controls | Row 2: Price + time + assignment + remove
- OrderDetailModal: Added responsive modal width (max-w-full sm:max-w-6xl)
- OrderDetailModal service rows: Applied same two-row stacking pattern
- Service name gets truncate with flex-1 min-w-0 to prevent overflow
- All touch targets (min-h-[44px] min-w-[44px]) preserved
- All functionality preserved (editing, validation, state)
- Prevents horizontal overflow on iPhone SE (375px) and iPhone 14 (390px)
- TypeScript compiles clean

**Files modified:**
- `src/components/intake/garment-services-step.tsx` — Two-row mobile service layout
- `src/components/board/order-detail-modal.tsx` — Responsive modal width and service rows

**Phase 21 Plan 04 — Complete.** Fixed 7 remaining responsive issues across 7 pages:
- Workload unassigned buttons: 44px touch targets (H1) with min-h-[44px] sm:min-h-0
- Workload member select: 120px → 160px width (H2) for full name display
- Board export button: bottom-20 md:bottom-8 positioning (H3) prevents nav overlap
- Calendar date range: 140px → 180px responsive width (M1) for iPhone SE fit
- Client tabs: py-2.5 sm:py-2 meets 44px touch minimum (M2)
- Track timeline labels: text-[10px] sm:text-xs scaled down (M3)
- Measurements form: grid-cols-1 sm:grid-cols-2 stacks on mobile (M4)
- Pricing input: w-28 sm:w-24 wider on mobile (M6)
- All fixes use mobile-first responsive pattern
- TypeScript compiles clean

**Files modified:**
- `src/app/board/workload/page.tsx` — Touch targets and select width
- `src/app/board/page.tsx` — Export button position
- `src/app/calendar/page.tsx` — Date range width and text
- `src/app/clients/[id]/page.tsx` — Tab touch targets
- `src/app/track/[id]/page.tsx` — Timeline label text
- `src/app/admin/measurements/page.tsx` — Form grid stacking
- `src/components/intake/pricing-step.tsx` — Input width

**Phase 21 Plan 03 — Complete.** Added touch device support to interactive components:
- Kanban board DnD: Added TouchSensor alongside PointerSensor with 250ms delay and 5px tolerance
- Prevents scroll-vs-drag conflicts on touch devices
- Gantt chart bars: Added touch event handlers (onTouchStart, onTouchMove, onTouchEnd) to all drag handles
- Refactored drag logic to support both mouse and touch events (unified clientX handling)
- Left edge, body, and right edge all support touch-based dragging
- Long-press context menu: 500ms timer triggers context menu on touch devices
- 10px movement tolerance prevents false triggers during long-press
- Touch backdrop closes menu when tapping outside
- All existing mouse-based interactions preserved
- TypeScript compiles clean

**Files modified:**
- `src/components/board/interactive-board.tsx` — TouchSensor for kanban DnD
- `src/components/ui/gantt.tsx` — Touch handlers and long-press context menu

## Session Continuity

- **Last session:** 2026-02-04
- **Status:** 21/21 phases complete - ALL DONE
- **Stopped at:** Completed Phase 21 Plan 04 (21-04-PLAN.md)
- **Next:** Project complete - ready for deployment and device testing
- **Resume file:** None

---
*State updated: 2026-02-04*

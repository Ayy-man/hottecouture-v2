# Hotte Couture - Final Modifications

## What This Is

Internal SaaS application for Hotte Design, a high-end couture and alterations business. Manages order intake, task assignment, time tracking, and billing. Currently ~90% complete — this milestone delivers 17 critical modifications identified during user testing with the seamstress team.

## Core Value

Seamstresses can take orders smoothly on iPad/iPhone, assign items to the correct team members, adjust prices based on actual work time, and print their task lists.

## Requirements

### Validated

*Existing functionality that works and must be preserved:*

- ✓ Order intake workflow (multi-step wizard) — existing
- ✓ Kanban board with drag-and-drop — existing
- ✓ Service management with categories and pricing — existing
- ✓ Client management with GHL sync — existing
- ✓ Label printing with QR codes — existing
- ✓ Order archive with restore — existing
- ✓ PIN-based staff authentication — existing
- ✓ Payment recording (cash/card/online) — existing
- ✓ Deposit system (50% for custom orders) — existing
- ✓ GoHighLevel CRM integration — existing
- ✓ n8n SMS notifications — existing
- ✓ Google Calendar integration — existing
- ✓ French/English bilingual UI — existing

### Active

*17 modifications from user testing session (Jan 19, 2026):*

**P1 - Architecture (Must complete first):** ✅ COMPLETE
- [x] MOD-001: Task assignment at ITEM level (not order level)
- [x] MOD-002: Price management at ITEM level (editable final price)

**P2 - User Interface:** ✅ COMPLETE
- [x] MOD-003: Merge "Select Garment" + "Select Service" steps
- [x] MOD-004: Reduce vertical space by 40%
- [x] MOD-005: Add list view toggle (service selection)
- [x] MOD-006: Replace item codes with product names
- [x] MOD-007: Manage Task button per item + auto-close
- [x] MOD-008: Add phone field to client page

**P3 - Export Features:** ✅ COMPLETE
- [x] MOD-009: Export project list per seamstress (CSV)
- [x] MOD-010: Export orders list (CSV)
- [x] MOD-011: Export weekly capacity (CSV)
- [x] MOD-012: Team member management (add/remove)

**P4 - Removal:** ✅ COMPLETE
- [x] MOD-013: Remove timer/stopwatch completely (replace with manual input)

**P5 - Responsive Design:** ✅ COMPLETE
- [x] MOD-014: Full iPhone responsive support
- [x] MOD-015: Optimize iPad portrait mode

**P6 - Calendar:** ✅ COMPLETE
- [x] MOD-016: Fix order timeline calendar scrolling
- [x] MOD-017: Add "Unassigned Orders" category

### Out of Scope

- Full e-commerce / public storefront — internal SaaS only
- Multi-location support — single location business
- Inventory management — materials tracking not needed
- Email authentication — PIN system is sufficient
- Automated AI scheduling — manual assignment preferred
- Customer self-service portal — phone-based service model

## Context

**Business Model:**
- Bills strictly by the hour based on ACTUAL time worked
- Estimated time is guideline only; final price adjusted post-completion
- Customer must NEVER see work time, only final price

**Team Structure:**
- 4 main seamstresses: Anne-Marie, Audrey, Marie, Solange
- 1 external contractor: Joan (occasional)
- Equipment: 1 shared iPad (8th gen) for 3+ people

**Key Workflow Change:**
Previously one seamstress handled entire order. Now with Audrian joining, single order can contain multiple items handled by DIFFERENT seamstresses. Requires item-level assignment.

**Device Requirements:**
- iPad 8th gen (portrait mode primary)
- iPhone support critical (when iPad occupied)
- Safari browser priority

**Client Assets Coming:**
- Annotated screenshots for MOD-004 (space reduction)
- Modified image for MOD-003 (merged steps)
- Client page annotations for MOD-008
- iPhone display issue screenshots for MOD-014

## Constraints

- **Deadline**: Thursday, January 23, 2026 (MAXIMUM)
- **Follow-up**: Friday, January 24, 2026 (final verification meeting)
- **Stability**: Zero critical bugs - app used daily by seamstresses
- **Data Preservation**: All existing data must be preserved (run migrations)
- **Integration**: GoHighLevel CRM must continue working
- **Devices**: Must work on iPad 8th gen + iPhone in portrait mode

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Item-level assignment over order-level | Multiple seamstresses work on different items in same order | — Pending |
| Remove timer, use manual time input | "Girls will NEVER use it" - too many interruptions, shared device | — Pending |
| Merge garment + service steps | Too many page switches loses context during customer interaction | — Pending |
| List view default over grid | Team preference, matches Pipeline section they like | — Pending |

---
*Last updated: 2026-01-28 - ALL 17 MODIFICATIONS COMPLETE*

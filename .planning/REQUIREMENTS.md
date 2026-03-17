# Requirements: Milestone 2 — Final Bug Fixes

**Created:** 2026-03-04
**Source:** Live testing bug report (Audrey + dev team)

## Requirements

### BUG-1: Order Submission Failure (Ship-Blocker)
**Priority:** P0
**Status:** Partially fixed (Quick Task 2), needs verification
- "Créer la commande" button on Step 5 returns "Failed to submit order"
- Error message propagation fixed (errorData.error vs errorData.message)
- Custom service pricing loop hardened
- **Remaining:** End-to-end verification on deployed environment
- **Acceptance:** Orders can be created successfully through the full intake flow

### BUG-3: All Templates in English, Must Be French
**Priority:** P1
- Every client-facing template (SMS, email, form labels) is in English
- Quebec client — everything customer-facing must be in French
- Audit all notification templates, SMS templates, hardcoded strings
- Replace with French versions from project docs
- Backend/dev comments can stay English
- **Acceptance:** All customer-facing text displays in French

### BUG-5: Garment Type Management (Edit/Delete Missing)
**Priority:** P2
- Garment type list has test entries ("h", "testingG", "TAPIS" in wrong case)
- Need admin UI for: edit name, edit emoji, delete, reorder
- Clean up test entries from database
- **Acceptance:** Admin can edit name/emoji, delete, and reorder garment types

### BUG-6: Emoji Picker Closes Immediately
**Priority:** P2
- On iPad, emoji picker opens but closes instantly when tapped
- Likely click-outside/blur event listener firing incorrectly
- Or z-index/overlay issue on touch devices
- **Acceptance:** Emoji picker stays open on iPad Safari, allows selection on tap

---

## Mar 13 Client Brief — NASELIA × HOTTE

**Source:** Hotte Design Platform Update Brief (Mar 16, 2026)
**Prepared by:** NASELIA AI (Amin/Yasmine)

### MKT-116: Restructure Order Form — 4 Sections (URGENT)
**Priority:** P0
**Linear:** MKT-116
- Current 3-step form must split into 4 sections: Client Info, Alteration (labour), Accessories (products), Pricing/Finalization
- Alteration = labour services (hemming, waistband, zip replacement) — has time estimation, feeds production calendar
- Accessories = physical products (invisible zippers, separable zips, fabric, thread, buttons, velcro) — NO time, invoice only, NOT in calendar
- Both sections OPTIONAL — order can be alteration only, sale only, or both
- Product items currently in Alteration must move to Accessories
- Time estimates per alteration item must be editable on the fly
- Accessories quantities MUST support decimal values (0.25, 0.5, 1.75)
- **Acceptance:** 4-section form works; accessories don't appear in calendar; decimal quantities work; time editable per alteration item

### MKT-117: Add 2 Pre-built Fabric Items in Accessories (HIGH)
**Priority:** P1
**Linear:** MKT-117
- Fabric by the yard: quantity in yards (decimal), price = yards × price/yard, both editable at order time
- Fabric by the square foot: quantity in sq ft (decimal), price = sqft × price/sqft, both editable
- Neither item appears in production calendar (accessories only)
- **Acceptance:** Both fabric items available in Accessories section with decimal quantities and editable pricing

### MKT-118: Notification Workflow Overhaul (URGENT)
**Priority:** P0
**Linear:** MKT-118
- **pending:** Auto-SMS welcome with tracking link — "Bonjour, Haute Couture a bien recu votre commande. Suivez l'avancement ici : {portal_link}"
- **in progress:** No notification
- **ready:** SMS with payment amount + Stripe link + tracking link + pre-recorded voice call via GHL
- **done:** No notification
- Invoices (Stripe + QuickBooks) ONLY generated at status 'ready' — not before
- Pre-recorded voice message: Audrey records script, GHL voice broadcast triggered at 'ready'
- **Acceptance:** Auto SMS at pending; SMS + voice at ready; no notifications at in_progress/done; invoices only at ready

### MKT-72: Fix 3 Kanban Bugs (HIGH)
**Priority:** P1
**Linear:** MKT-72
- Bug 1: System generates 2 labels per product — should be exactly 1
- Bug 2: Cancelled orders count in accounting/stats — need dedicated 'Cancelled' status excluded from revenue
- Bug 3: Cannot edit order once in Kanban — need full editing at any stage (add/remove items, change prices, update quantities)
- **Acceptance:** 1 label per product; cancelled status exists and excluded from stats; orders fully editable at any Kanban stage

### MKT-71: Complete French Translation (HIGH)
**Priority:** P1
**Linear:** MKT-71
- All labels, buttons, status names, form fields, error messages, notifications must be French
- AI chatbot (Pupuce) must respond in French by default
- Wire next-intl useTranslations() into all components (infrastructure exists, not connected)
- Keep internal/admin technical references in English
- **Acceptance:** Every user-facing string in French; language toggle works; chatbot responds in French

### MKT-111: iPad UX / Mobile Responsive (HIGH)
**Priority:** P1
**Linear:** MKT-111
- Order detail page too long on iPad 8th gen — reorganize into compact blocks, reduce field sizes, collapsible sections
- Per-garment seamstress assignment already works — verify on device
- Save button must auto-close task panel ("Save and Close")
- Re-add exports: (1) task list per employee, (2) active projects list, (3) weekly capacity
- Full phone responsive (iPad primary, phone secondary)
- **Acceptance:** Compact iPad layout; Save and Close works; all 3 exports functional; phone-responsive

### INFRA-1: Restore Empty Files from Git (BLOCKER)
**Priority:** P0 (BLOCKER)
- Many API routes and page files are 0 bytes due to accidental wipe
- Affects: all board pages, API routes, labels, exports, webhooks, chat
- Content exists at git commit 32990c2 — must restore all emptied files
- **Acceptance:** All previously-functional files restored with correct content; app builds and runs

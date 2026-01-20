# Requirements: Hotte Couture Final Modifications

**Defined:** 2026-01-20
**Core Value:** Seamstresses can take orders smoothly on iPad/iPhone, assign items to correct team members, adjust prices based on actual work time, and print task lists.
**Deadline:** Thursday, January 23, 2026

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Architecture (P1 - CRITICAL)

- [x] **ARCH-01**: Change data model so each item/service can be assigned to a different seamstress (not order-level)
- [x] **ARCH-02**: Add `assigned_seamstress_id` field to Items/Services table
- [x] **ARCH-03**: Migrate existing orders with global assignment to item-level assignment
- [x] **ARCH-04**: Update all queries to filter by item assignment, not order assignment
- [x] **ARCH-05**: Add `final_price` field to Items table (editable after invoice)
- [x] **ARCH-06**: Recalculate order total when item price changes
- [x] **ARCH-07**: Log price changes for audit trail (who, when, old value, new value)

### User Interface (P2)

- [x] **UI-01**: Merge garment selection and service selection into single page
- [x] **UI-02**: Add seamstress assignment dropdown to merged garment/service page
- [ ] **UI-03**: Reduce vertical spacing between sections (24px → 12px)
- [ ] **UI-04**: Reduce form field spacing (16px → 8px)
- [ ] **UI-05**: Make Notes fields collapsible (collapsed by default)
- [ ] **UI-06**: Use 2-column layouts for form fields where appropriate
- [ ] **UI-07**: Add view toggle button (Grid/List) to service selection page
- [ ] **UI-08**: Implement list view matching Pipeline section style
- [ ] **UI-09**: Replace "Number 1", "Number 2" labels with actual product names
- [ ] **UI-10**: Add "Manage Task" button on each item card
- [ ] **UI-11**: Implement "Save & Close" behavior (modal closes after save)
- [ ] **UI-12**: Add Email, SMS/Mobile, and Phone fields to client page

### Export Features (P3)

- [ ] **EXP-01**: Add "Export Projects" button for seamstress task list (CSV)
- [ ] **EXP-02**: CSV columns: Client, Order#, Item, Service, Status, Due Date, Est Time, Actual Time
- [ ] **EXP-03**: Add "Export Orders" option in 3-dot menu (CSV)
- [ ] **EXP-04**: Add "Export Weekly Capacity" option (CSV per seamstress)
- [ ] **EXP-05**: Add "Add Team Member" form (Name, Email, Status)
- [ ] **EXP-06**: Add Marie as main seamstress in team management

### Timer Removal (P4)

- [ ] **TMR-01**: Remove stopwatch/timer UI component completely
- [ ] **TMR-02**: Remove Start/Stop/Pause buttons
- [ ] **TMR-03**: Add "Actual Time (minutes)" text input in Manage Task interface
- [ ] **TMR-04**: Keep "Estimate Time" field for capacity planning

### Responsive Design (P5 - URGENT)

- [ ] **RES-01**: Add responsive breakpoint for iPhone (< 768px)
- [ ] **RES-02**: Convert side navigation to bottom tab bar on mobile
- [ ] **RES-03**: Ensure all buttons are touch-friendly (min 44px height)
- [ ] **RES-04**: Stack form fields vertically on mobile
- [ ] **RES-05**: Convert tables to card layout on mobile
- [ ] **RES-06**: Make modals full-screen on mobile
- [ ] **RES-07**: Fix iPad portrait layout (768px width)
- [ ] **RES-08**: Test and verify all workflows on iPhone Safari

### Calendar (P6)

- [ ] **CAL-01**: Fix vertical scrolling in order timeline calendar
- [ ] **CAL-02**: Add "Unassigned" category showing items with no assigned seamstress
- [ ] **CAL-03**: Add "Assign to Me" button on unassigned items
- [ ] **CAL-04**: Sort unassigned items by due date (urgent first)

## v2 Requirements

Deferred to future release. Not in current scope.

- **NOTIF-01**: Email notifications for order confirmations
- **NOTIF-02**: Digital receipt sending via email
- **DASH-01**: Enhanced analytics dashboard with more metrics
- **HIST-01**: Order history CSV/PDF export
- **BULK-01**: Bulk operations (select multiple orders)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full e-commerce storefront | Internal SaaS only |
| Multi-location support | Single location business |
| Inventory/materials tracking | Out of scope for couture app |
| Email authentication | PIN system sufficient |
| AI scheduling | Manual assignment preferred |
| Customer portal | Phone-based service model |
| Automated time tracking | Team prefers manual entry |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 1 | Complete |
| ARCH-02 | Phase 1 | Complete |
| ARCH-03 | Phase 1 | Complete |
| ARCH-04 | Phase 1 | Complete |
| ARCH-05 | Phase 2 | Complete |
| ARCH-06 | Phase 2 | Complete |
| ARCH-07 | Phase 2 | Complete |
| UI-01 | Phase 3 | Complete |
| UI-02 | Phase 3 | Complete |
| UI-03 | Phase 4 | Pending |
| UI-04 | Phase 4 | Pending |
| UI-05 | Phase 4 | Pending |
| UI-06 | Phase 4 | Pending |
| UI-07 | Phase 5 | Pending |
| UI-08 | Phase 5 | Pending |
| UI-09 | Phase 5 | Pending |
| UI-10 | Phase 6 | Pending |
| UI-11 | Phase 6 | Pending |
| UI-12 | Phase 6 | Pending |
| EXP-01 | Phase 7 | Pending |
| EXP-02 | Phase 7 | Pending |
| EXP-03 | Phase 7 | Pending |
| EXP-04 | Phase 7 | Pending |
| EXP-05 | Phase 7 | Pending |
| EXP-06 | Phase 7 | Pending |
| TMR-01 | Phase 8 | Pending |
| TMR-02 | Phase 8 | Pending |
| TMR-03 | Phase 8 | Pending |
| TMR-04 | Phase 8 | Pending |
| RES-01 | Phase 9 | Pending |
| RES-02 | Phase 9 | Pending |
| RES-03 | Phase 9 | Pending |
| RES-04 | Phase 9 | Pending |
| RES-05 | Phase 9 | Pending |
| RES-06 | Phase 9 | Pending |
| RES-07 | Phase 9 | Pending |
| RES-08 | Phase 9 | Pending |
| CAL-01 | Phase 10 | Pending |
| CAL-02 | Phase 10 | Pending |
| CAL-03 | Phase 10 | Pending |
| CAL-04 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 39
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-20*
*Last updated: 2026-01-20 after initialization*

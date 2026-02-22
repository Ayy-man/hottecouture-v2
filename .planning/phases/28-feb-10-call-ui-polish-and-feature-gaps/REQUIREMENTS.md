# Phase 28 — Feb 10 Call: UI Polish & Feature Gaps

**Source:** Amin/Ayman call, Feb 10 2026
**Items:** 17 change requests from Amin's walkthrough of the platform

---

## 1. Center & Shrink Intake Button
- The main intake/invoice button is too large and left-aligned
- Should be centered and ~1/3 current size
- **Page:** Intake form or invoice view

## 2. Round Kanban Card Corners
- Card corners are "too harsh" — need softer border-radius
- Apply to all cards on the Kanban board
- **Page:** `/board`

## 3. Fix Rush Badge Overflow
- The "Rush" ribbon/badge overflows outside the card boundary
- Make it horizontal or repositioned so "Rush" text is clearly readable
- Should stay contained within the card
- **Page:** `/board` (order cards)

## 4. Center Client Portal Content
- Status tracking cards are positioned too high on the page
- Should be centered vertically / fill the available space better
- **Page:** `/portal`

## 5. Condense Filter Section on Board
- The filter area takes too much vertical space
- Users can't scroll past it on some screen sizes — it blocks content below
- **Page:** `/board`

## 6. Fix Garment Category Labels
- "Home" category label is wrong — should be "Custom" (curtains, pillows, bed items, window treatments)
- Categories should be limited to: **Alteration** (clothes), **Custom** (home/design items), **Outdoor**
- Remove extra/duplicate categories
- **Page:** Intake form, garment type selection

## 7. Inline Price Editing on Services Step
- She used to be able to edit prices directly on the service selection step
- Currently can only edit on the summary/pricing step
- Wants price editing back on the services step (garment-services-step)
- **Page:** Intake form, services step

## 8. Allow Adding Custom Services
- Need a way for her to create her own services/products
- So she doesn't have to call developers every time she needs a new service
- Previously had this capability, was removed during refactoring
- **Page:** Intake form, services step or admin panel

## 9. Self-Service Staff Management
- If an employee leaves, she should be able to replace them
- Should be able to add part-time employees herself
- Add/edit/remove staff members without developer help
- **Page:** Team management / admin

## 10. Date Picker Opens on Click
- Instead of navigating to a separate step or area, clicking the date field should pop open a small inline calendar directly
- **Page:** Intake form, date selection

## 11. Fix Rush Service Labels
- "0 days faster than standard" is confusing and doesn't make sense
- Express should show: "3-4 days earlier" (or "3 à 4 jours plus tôt")
- Rush should show: "1-3 days earlier" (or "1 à 3 jours plus tôt")
- Remove "0 days faster" wording entirely
- **Page:** Intake form, rush/express selection

## 12. Tax Recalculation on Price Override
- When price is manually modified, taxes should auto-recalculate
- The editable price should be the pre-tax amount
- Taxes calculate automatically after modification
- Discounts should be applicable before OR after tax (user's choice)
- **Page:** Intake form, pricing step

## 13. Print Only Labels (Not Full Page)
- Currently prints the entire page including navigation (Board, Intake, Clients, Calendar links)
- Should ONLY print label 1 and label 2 — nothing else
- Nav bar and other page elements must be hidden in print
- **Page:** Labels / print view

## 14. Workload Tooltip Shows Client Name (DONE)
- Already fixed in previous session (commit cf172b4)
- Tooltip now shows client name + service instead of order number

## 15. Update Portal Phone Number
- "Call Us" section on client portal shows wrong or placeholder number
- Need to update with correct phone number from original docs
- **Page:** `/portal`

## 16. Progressive Web App (PWA)
- Make the app installable on iPad/phone home screens
- Should work like a native app shortcut (Add to Home Screen)
- Like YouTube's "Install App" prompt
- Works on phones, iPads, and laptops

## 17. Set Up Subdomains
- Once Shopify access is provided for the domain
- Create two subdomains:
  - Public-facing: client portal (status tracking)
  - Internal: employee dashboard (board, intake, etc.)
- **Depends on:** Shopify domain access from client
- **Note:** This is deployment/DNS config, not code

---

## Priority Assessment

| # | Item | Effort | Already Done? |
|---|------|--------|---------------|
| 1 | Center & shrink button | Small | No |
| 2 | Round card corners | Small | Partially (Phase 24 added overflow-hidden) |
| 3 | Fix rush badge | Small | Partially (Phase 24 added containment) |
| 4 | Center portal content | Small | Partially (Phase 25 fixed centering) |
| 5 | Condense filters | Medium | No |
| 6 | Fix garment categories | Medium | Needs verification |
| 7 | Inline price editing | Medium | Phase 23 added pencil icon |
| 8 | Custom services | Medium | Phase 22-03 added custom garment types |
| 9 | Self-service staff | Small | Phase 26 added team management |
| 10 | Date picker on click | Small | Phase 23 added calendar picker |
| 11 | Fix rush labels | Small | No |
| 12 | Tax recalculation | Medium | Phase 23-03 added tax back-calc |
| 13 | Print only labels | Small | Phase 25 added print hiding |
| 14 | Workload tooltip | Done | Yes (commit cf172b4) |
| 15 | Update phone number | Trivial | Needs verification |
| 16 | PWA | Medium | Not started |
| 17 | Subdomains | Config | Blocked on Shopify access |

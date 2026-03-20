# Phase 30: Accessories UX Overhaul — Category Grouping & Service Recategorization - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning
**Source:** Conversation-derived (brainstorming session)

<domain>
## Phase Boundary

Redesign the AccessoriesStep component in the intake form. Currently 90+ products are displayed in a flat, unsorted list with no grouping or scroll affordance. Audrey (Quebec seamstress, primary user on iPad) needs to quickly browse and select accessories during order intake.

Also: recategorize 67 services that were invisible after the MKT-116 form split because they had categories (curtains, fabrics, jeans, custom, null) not queried by either step.

</domain>

<decisions>
## Implementation Decisions

### Category Grouping — Collapsible Accordion
- Group accessories into collapsible accordion sections by product type
- All sections collapsed by default — Audrey sees full inventory shape at a glance
- Tap section header to expand/collapse
- Natural categories derived from service names:
  - Fermetures éclair / Zips (19 items)
  - Tissus (25 items)
  - Élastiques (10 items)
  - Cordes / Courroies (9 items)
  - Velcros (6 items)
  - Rideaux (5 items)
  - Fils (5 items)
  - Aiguilles (4 items)
  - Divers (13 items — everything else)
- Category assignment is client-side grouping function based on name patterns — no DB schema change

### Search Behavior
- Search bar remains at top
- Search filters across ALL sections simultaneously
- Matching sections auto-expand to show results
- Non-matching sections collapse/hide
- Clear search restores collapsed state

### Manage Mode ("Gerer")
- Add pencil "Gerer" button matching AlterationStep pattern
- Toggles inline edit/delete mode on accessory items
- Edit: change name, price inline
- Delete: soft-delete with usage check (same API as AlterationStep)
- Uses existing /api/admin/services PUT/DELETE endpoints

### No Hidden Scroll Containers
- Removed max-h-[300px] restriction (already done)
- Full list visible within page scroll
- Each accordion section shows all items when expanded

### Service Recategorization (Migration 0045)
- curtains → alterations (labour work)
- fabrics → accessories (product sales)
- jeans → alterations (labour work)
- custom/Custom → alterations (labour work)
- null category → alterations (mostly labour: Bord Machine, Bord Robe, etc.)
- examplecategory → deactivate (junk test data)
- Migration already written and run manually on production DB

### Claude's Discretion
- Exact regex patterns for category grouping function
- Accordion animation/transition style
- Whether to show item count badge on collapsed headers
- Mobile responsive behavior of accordion sections

</decisions>

<specifics>
## Specific Ideas

- Category headers should show item count: "Fermetures éclair / Zips (19)"
- Expand/collapse with chevron icon (▶/▼) matching garment type dropdown pattern
- Keep existing price/qty/add controls per item — no change to item row layout
- "Divers" is the catch-all for items not matching any named category
- Browse-first UX (not search-first) — Audrey thinks "I need a zipper" and browses the category

</specifics>

<deferred>
## Deferred Ideas

- Favorites/frequently-used items shortcut
- Drag-and-drop reordering within categories
- Server-side category assignment (DB column) — currently client-side only

</deferred>

---

*Phase: 30-accessories-ux-overhaul-category-grouping-service-recategorization*
*Context gathered: 2026-03-20 via brainstorming session*

---
phase: 22-audit-gap-closure
plan: 01
status: complete
---

## Summary

Fixed board page scroll/overflow bugs, hid chatbot widget, and translated board headers to French.

### Changes Made

**src/app/board/page.tsx:**
- Changed `h-screen` to `h-full` on root container (line 342) — fixes board expanding beyond grid cell
- Changed `overflow-hidden` to `overflow-y-auto` on main element (line 444) — enables vertical scrolling
- Replaced "Production Board" with "Tableau de Production"
- Replaced "Workload" with "Charge de Travail"
- Replaced "Archived Orders" with "Commandes Archivees"
- Replaced "New Order" with "Nouvelle Commande"

**src/app/layout.tsx:**
- Wrapped `<GlobalChatWrapper />` in `<div className='hidden'>` — hides floating chatbot on all devices
- Import and component preserved for future re-enabling

### Verification
- No `h-screen` on main container (loading/error states kept as-is)
- All 4 French strings confirmed present
- `overflow-y-auto` on main element confirmed
- GlobalChatWrapper wrapped in hidden div confirmed
- TypeScript compiles clean (no errors in modified files)

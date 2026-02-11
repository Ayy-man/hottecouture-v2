---
phase: 25-print-mobile-portal
plan: 01
subsystem: print-ui-portal
tags: [print, mobile, portal, ui-chrome, centering, phone-number]
completed: 2026-02-11T18:41:19Z
duration_minutes: 7

dependency_graph:
  requires: []
  provides:
    - print-hidden-ui-chrome
    - centered-portal-layout
    - real-shop-phone-number
  affects:
    - src/components/navigation/mobile-bottom-nav.tsx
    - src/app/layout.tsx
    - src/app/globals.css
    - src/app/portal/page.tsx

tech_stack:
  added: []
  patterns:
    - Tailwind print:hidden utility classes
    - Global @media print CSS rules
    - Environment variable fallback pattern for configuration
    - Tel link with dash stripping for phone numbers

key_files:
  created: []
  modified:
    - path: src/components/navigation/mobile-bottom-nav.tsx
      change: Added print:hidden class to nav element
    - path: src/app/layout.tsx
      change: Added print:hidden to header, print:pb-0 to main, print:hidden to chat wrapper
    - path: src/app/globals.css
      change: Added global @media print rules hiding chrome and enabling multi-page print
    - path: src/app/portal/page.tsx
      change: Removed container class conflict, added SHOP_PHONE constant, replaced placeholder

decisions:
  - decision: Use both Tailwind print:hidden AND global @media print rules
    rationale: Tailwind classes for explicit component control, global rules as safety net and to override body overflow restrictions
  - decision: Override body overflow hidden in print media query
    rationale: Allows print content to flow to multiple pages instead of being clipped to viewport height
  - decision: Use env var with fallback for shop phone
    rationale: Allows deployment-time configuration while providing working default (514-667-0082)
  - decision: Remove container class from portal inner div
    rationale: Container applies max-w-7xl which conflicts with max-w-lg for centering

metrics:
  tasks_completed: 2
  commits: 2
  files_modified: 4
  duration_minutes: 7
---

# Phase 25 Plan 01: Print, Mobile & Portal Fixes Summary

**One-liner:** Hide UI chrome in print output via Tailwind classes and global CSS, fix portal centering by removing container conflict, replace placeholder phone with real shop number.

## Overview

Fixed five print, mobile, and portal bugs reported in the Feb 11 call: (1) print on mobile shows entire page instead of just label content, (2) mobile nav visible in print output, (3) mobile bottom nav not on all pages (verified already working), (4) client portal not centered, (5) wrong phone number on client portal.

## Tasks Completed

### Task 1: Add print:hidden to all UI chrome in root layout and global styles

**Problem:** When printing on mobile (labels page, task lists), entire page printed including header bar, mobile bottom nav, and chrome. Only actual content should print.

**Solution:**
- Added `print:hidden` class to MobileBottomNav `<nav>` element
- Added `print:hidden` class to root layout `<header>` element
- Added `print:pb-0` to root layout `<main>` element (removes 4rem bottom padding for hidden nav)
- Added `print:hidden` to GlobalChatWrapper div wrapper (explicit print hiding)
- Added global `@media print` block to globals.css after line 12:
  - Hides all `header`, `nav`, `footer`, `.no-print` elements with `display: none !important`
  - Overrides `html, body { overflow: hidden; height: 100%; }` to `overflow: visible; height: auto` for print
  - Changes body children from grid to block display
  - Ensures main content has `overflow: visible`, `padding-bottom: 0`, `height: auto` for printing

**Why both Tailwind and global rules:** Tailwind `print:hidden` handles specific components cleanly. Global `@media print` rules catch any elements without explicit classes and critically override the screen-only `overflow: hidden` and `height: 100%` constraints that prevent print content from flowing to multiple pages.

**Files modified:**
- `src/components/navigation/mobile-bottom-nav.tsx` — Added print:hidden to nav
- `src/app/layout.tsx` — Added print:hidden to header and chat, print:pb-0 to main
- `src/app/globals.css` — Added @media print block with chrome hiding and layout overrides

**Commit:** `92240d4` — feat(25-01): hide UI chrome in print output

### Task 2: Fix portal centering and replace placeholder phone number

**Problem 1 — Portal centering:** Portal page used `container mx-auto px-4 py-8 max-w-lg` which applies conflicting max-width (container = max-w-7xl from globals.css line 227) and conflicting padding rules, preventing proper centering on some viewports.

**Solution:** Removed `container` class from inner div (line 170), kept `mx-auto px-4 py-8 max-w-lg` and added `w-full`. This provides proper centering: div takes full width up to max-w-lg (512px), and `mx-auto` centers it horizontally.

**Problem 2 — Wrong phone number:** Line 346 had hardcoded placeholder `514-555-1234` (fake North American 555 number).

**Solution:**
- Created `SHOP_PHONE` constant at top of file: `process.env.NEXT_PUBLIC_SHOP_PHONE || '514-667-0082'`
- Used 514-667-0082 as default (Hotte Couture's actual shop number from Phase 20)
- Updated line 349 to use `SHOP_PHONE` constant
- Updated tel: href to `tel:${SHOP_PHONE.replace(/-/g, '')}` (strips dashes for proper phone link formatting)

**About mobile bottom nav on all pages:** Research confirmed MobileBottomNav is in root layout.tsx (line 128) unconditionally. No nested layouts exist. Bottom nav IS rendered on every page. No structural change needed — verified already working.

**Files modified:**
- `src/app/portal/page.tsx` — Removed container class, added SHOP_PHONE constant, replaced placeholder

**Commit:** `3a92ff0` — feat(25-01): fix portal centering and replace placeholder phone

## Verification Performed

1. ✅ TypeScript compilation — No new errors introduced (pre-existing errors from duplicate files)
2. ✅ Grep for `print:hidden` in mobile-bottom-nav.tsx — Present on line 19
3. ✅ Grep for `print:hidden` in layout.tsx — Present on lines 105 and 131
4. ✅ Grep for `print:pb-0` in layout.tsx — Present on line 125
5. ✅ Grep for `@media print` in globals.css — Present on line 15
6. ✅ Grep for "555" in portal/page.tsx — Only in placeholder text, not in actual phone link
7. ✅ Grep for `SHOP_PHONE` in portal/page.tsx — Defined line 26, used line 349
8. ✅ Grep for "container" in portal inner div — Not found (successfully removed)

## Deviations from Plan

None — plan executed exactly as written. All changes matched the specified implementation.

## Authentication Gates

None encountered.

## Known Issues / Follow-up

1. **Print preview testing:** Changes should be tested with actual print preview on mobile device (iPhone/iPad) to verify header and bottom nav are hidden and only content prints.
2. **Labels page print testing:** Should verify labels page prints correctly without UI chrome on mobile.
3. **Shop phone verification:** Should confirm 514-667-0082 is correct shop number (not personal cell). Can be overridden with NEXT_PUBLIC_SHOP_PHONE env var if needed.
4. **Portal centering testing:** Should test portal page on multiple viewport sizes (375px iPhone SE, 390px iPhone 14, 768px iPad, desktop) to confirm centering works correctly.
5. **Duplicate files cleanup:** Repository has many "file 2.tsx" duplicates causing TypeScript errors. These should be cleaned up in a future maintenance task.

## Self-Check: PASSED

**Files created/modified verification:**
```bash
# All modified files exist and contain expected changes
FOUND: src/components/navigation/mobile-bottom-nav.tsx (print:hidden on line 19)
FOUND: src/app/layout.tsx (print:hidden on lines 105, 131; print:pb-0 on line 125)
FOUND: src/app/globals.css (@media print block starting line 15)
FOUND: src/app/portal/page.tsx (SHOP_PHONE constant line 26, usage line 349)
```

**Commits verification:**
```bash
# Both task commits exist in git history
FOUND: 92240d4 (Task 1: hide UI chrome in print output)
FOUND: 3a92ff0 (Task 2: fix portal centering and replace placeholder phone)
```

**Summary:** All planned files modified as specified. All commits created successfully. No missing artifacts.

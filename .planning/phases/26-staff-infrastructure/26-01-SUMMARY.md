---
phase: 26-staff-infrastructure
plan: 01
subsystem: staff-management, pwa
tags: [api-routes, pwa-manifest, chatbot-removal]
completed_date: 2026-02-12
duration_seconds: 95

dependency_graph:
  requires: []
  provides:
    - "/api/staff endpoints (GET, POST)"
    - "/api/staff/:id endpoints (PATCH, DELETE)"
    - "PWA manifest and metadata"
  affects:
    - "src/components/team/team-management-modal.tsx"
    - "src/app/layout.tsx"

tech_stack:
  added:
    - "PWA manifest.json"
  patterns:
    - "API route re-exports for endpoint aliasing"
    - "PWA metadata configuration for iOS and Android"

key_files:
  created:
    - "src/app/api/staff/route.ts — Re-exports GET and POST from admin/team"
    - "src/app/api/staff/[id]/route.ts — Re-exports PATCH and DELETE from admin/team"
    - "public/manifest.json — PWA manifest with app metadata and icons"
  modified:
    - "src/components/team/team-management-modal.tsx — Updated fetchStaff to use /api/staff"
    - "src/app/layout.tsx — Added PWA metadata, removed chatbot"

decisions:
  - "API route re-exports instead of duplicating handler logic"
  - "logo-round.jpg as PWA icon (JPEG acceptable per spec)"
  - "Chatbot component files retained for potential re-enablement"
  - "Consistent /api/staff usage across all team modal fetch calls"

metrics:
  task_count: 2
  file_count: 5
  line_changes: "+40 -6"
---

# Phase 26 Plan 01: Staff API Routes and PWA Configuration Summary

Staff management modal now connects to working backend endpoints, app is installable as PWA, and chatbot removed from DOM.

## Objective

Connected existing staff management UI to backend API routes via `/api/staff` aliasing, configured PWA installability with manifest and metadata, and permanently removed the hidden chatbot component from layout.

**Problem:** Team management modal called `/api/staff/*` but backend lived at `/api/admin/team/*` causing 404 errors. App wasn't installable on devices. Chatbot was hidden since Phase 22 but never removed.

**Solution:** Created re-export route files at `/api/staff` pointing to existing admin handlers, added PWA manifest with app metadata, updated layout metadata for iOS/Android installation, removed chatbot wrapper.

## Tasks Completed

### Task 1: Create staff API route aliases and remove chatbot
**Commit:** 49624b2

Created two new route files that re-export existing admin/team handlers:
- `src/app/api/staff/route.ts` — Re-exports GET and POST from `/api/admin/team/route.ts`
- `src/app/api/staff/[id]/route.ts` — Re-exports PATCH and DELETE from `/api/admin/team/[id]/route.ts`

Updated team-management-modal.tsx line 93 to fetch from `/api/staff` instead of `/api/admin/team` for consistency with all other fetch calls in the modal (POST/PATCH/DELETE already used `/api/staff`).

Removed chatbot from layout.tsx:
- Deleted `import { GlobalChatWrapper } from '@/components/chat/global-chat-wrapper';`
- Deleted the hidden div wrapper containing `<GlobalChatWrapper />`
- Component files (global-chat-wrapper.tsx, internal-chat.tsx) remain in codebase for potential future re-enablement

**Verification passed:**
- Both route.ts files created with correct re-exports
- Team modal uses `/api/staff` consistently for all CRUD operations
- No GlobalChatWrapper import or JSX in layout.tsx
- No TypeScript compilation errors introduced

### Task 2: Configure PWA manifest and metadata
**Commit:** 863a100

Created `public/manifest.json` with:
- App name: "Hotte Couture" (short: "Hotte")
- Display mode: "standalone" (launches as app without browser UI)
- Theme color: #6366f1 (indigo, matching brand)
- Icons: logo-round.jpg at 192x192 and 512x512 (JPEG valid per Web App Manifest spec)
- Categories: business, productivity
- Start URL: "/" with scope: "/"

Updated layout.tsx metadata object:
- Added `manifest: "/manifest.json"` reference
- Added `appleWebApp` configuration with `capable: true`, `statusBarStyle: "default"`, `title: "Hotte Couture"`
- Updated apple icon from `/logo.jpg` to `/logo-round.jpg` (round icons display better on iOS home screen)
- Added `themeColor: '#6366f1'` to match manifest

**Verification passed:**
- manifest.json is valid JSON (node parse successful)
- Layout metadata includes manifest reference and appleWebApp block
- Apple touch icon points to logo-round.jpg
- Theme color set correctly
- No TypeScript compilation errors introduced

## Deviations from Plan

None - plan executed exactly as written.

## Overall Verification

All success criteria met:

1. **Staff API aliasing:** Both `/api/staff/route.ts` and `/api/staff/[id]/route.ts` exist with correct re-exports
2. **Team modal CRUD:** All fetch calls use `/api/staff` endpoints consistently (GET, POST, PATCH, DELETE)
3. **PWA manifest:** `public/manifest.json` is valid JSON with required fields (name, icons, display, start_url)
4. **Layout metadata:** manifest reference, appleWebApp, updated apple icon, theme color all present
5. **Chatbot removed:** No GlobalChatWrapper import or JSX in layout.tsx
6. **No regressions:** Existing `/api/staff/active-task`, `/api/staff/set-pin`, `/api/staff/verify-pin` sub-routes unaffected
7. **TypeScript:** No new compilation errors (pre-existing errors in duplicate " 2" files remain)

## Impact

**Staff management:** Admin can now add, edit, archive, and delete staff members without 404 errors. All CRUD operations work through `/api/staff` endpoints.

**PWA installability:** App eligible for "Add to Home Screen" on iOS Safari and "Install App" prompt on Android Chrome. Users can install app on device home screen for native-like experience.

**Chatbot removal:** DOM no longer contains hidden chatbot widget, reducing page weight. Component files retained for potential future re-enablement if client requests.

**API architecture:** Re-export pattern allows frontend to use `/api/staff` while backend logic remains in `/api/admin/team`, providing clean separation and potential for future endpoint deprecation.

## Testing Notes

**Staff management testing:**
- Open team management modal from any admin page
- Add new staff member → should save without 404
- Edit existing staff member → should update without 404
- Archive/unarchive staff member → should toggle status without 404
- Delete inactive staff member → should remove without 404
- All operations should show success toast messages

**PWA testing (requires deployment):**
- iOS Safari: Visit app, tap Share → "Add to Home Screen" → icon appears on home screen
- Android Chrome: Visit app, tap "Install" banner → app installs to home screen
- Installed app: Launch from home screen → opens without browser chrome (standalone mode)
- Verify theme color (#6366f1 indigo) appears in status bar and task switcher

**Chatbot verification:**
- Inspect DOM on any page → should find no `GlobalChatWrapper` or related chat elements
- Check page weight/bundle size → should be slightly reduced without chatbot code

## Self-Check: PASSED

**Created files exist:**
```
FOUND: src/app/api/staff/route.ts
FOUND: src/app/api/staff/[id]/route.ts
FOUND: public/manifest.json
```

**Modified files updated:**
```
FOUND: src/components/team/team-management-modal.tsx (line 93 uses /api/staff)
FOUND: src/app/layout.tsx (manifest, appleWebApp, no GlobalChatWrapper)
```

**Commits exist:**
```
FOUND: 49624b2 (Task 1 - staff routes and chatbot removal)
FOUND: 863a100 (Task 2 - PWA manifest and metadata)
```

All claimed files, commits, and changes verified present in repository.

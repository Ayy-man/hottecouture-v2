# Phase 5: Restore Empty Files from Git — Research

**Researched:** 2026-03-18
**Domain:** Git history recovery, Next.js App Router file restoration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-1 | Many API routes and page files are 0 bytes due to accidental wipe — content exists at git history, must restore all emptied files so app builds and runs | Research confirms exactly one file is currently 0 bytes: `src/app/api/orders/route.ts`. Full content is recoverable from commit `0f76a39` in this repo's history. |
</phase_requirements>

---

## Summary

**The situation is far less severe than the ROADMAP initially described.** The ROADMAP listed many files as expected to be 0 bytes, but the prior work (the "sync local state" commit at `563d2cd`) already restored or restructured nearly all of them. As of this research, only a single file is actually empty in the working tree: `src/app/api/orders/route.ts`.

The referenced restore commit `32990c2` does NOT exist in this repository — locally or on any fetched remote. The repo was freshly initialized in a recovery from APFS dataless file corruption (commit message: "chore: fresh repo init — recover from APFS dataless file corruption" at `4e25915`). The commit `32990c2` was a reference in an older planning document that predates this repo's history.

The good news: the correct file content exists in THIS repo's history. Commit `0f76a39` (the last commit before the file was accidentally emptied) contains the full 120-line `src/app/api/orders/route.ts`. That commit is the correct restoration source.

**Primary recommendation:** Run `git checkout 0f76a39 -- src/app/api/orders/route.ts` to restore the single empty file. This is a one-command fix.

---

## Findings: Current State of "Empty Files"

### Only One File Is Actually Empty

Running `find src -type f -empty` returns exactly one result:

```
src/app/api/orders/route.ts   (0 bytes)
```

All other files listed in the ROADMAP Phase 5 section as "currently 0 bytes" are present and have content. A spot-check of the full list from the roadmap confirmed every other named file has content (20KB+ for board/page.tsx, 26KB for intake/route.ts, etc.).

### How the File Became Empty

The emptying occurred in commit `563d2cd` ("chore: sync local state — add planning docs, remove Finder duplicates"). That commit reorganized 108 files (moved pages from flat `src/app/board/page.tsx` to route-grouped `src/app/(protected)/board/page.tsx`) and in the process, `src/app/api/orders/route.ts` was accidentally wiped to 0 bytes. The git object stored in HEAD for that file is the empty blob `e69de29`.

### The Referenced Commit (32990c2) Does Not Exist

`32990c2` is NOT a valid object in this repository. It was referenced in the planning docs but belongs to a different git history (likely a prior repo before the APFS corruption recovery). The reflog confirms the repo has only 605 commits total, all reachable from a fresh-init root.

### Correct Restoration Source

The last commit where `src/app/api/orders/route.ts` had valid content is `0f76a39` ("feat(27-01): add seamstress API filtering and board role-conditional UI"). This commit is 2 commits before `563d2cd` in the main branch.

---

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| git checkout | (git built-in) | Restore file from specific commit | Native git, no tooling required |
| git show | (git built-in) | Inspect file content at any commit | Safe, read-only verification |

### Restoration Approach Analysis

| Approach | Safety | When To Use |
|----------|--------|-------------|
| `git checkout <commit> -- <file>` | HIGH — surgical, touches only named file | Single file restore (our case) |
| `git restore --source=<commit> <file>` | HIGH — same as above, newer syntax | Same — modern git alternative |
| Cherry-pick | MEDIUM — replays entire commit, risks conflicts | Multi-file atomic restore |
| Manual copy-paste | LOW — error-prone | Last resort when history unavailable |

**Recommendation:** `git checkout 0f76a39 -- src/app/api/orders/route.ts`

This is the safest approach because:
1. Only modifies exactly the one file needed
2. No merge conflicts (only adding content to an empty file)
3. Restores to the most recent valid version, which includes Phase 27 seamstress filtering

---

## The File to Restore

### `src/app/api/orders/route.ts` — 120 lines

**Source commit:** `0f76a39` (feat(27-01): add seamstress API filtering)
**File size at that commit:** 4,243 bytes, 120 lines

**Key functionality this file provides:**
- `GET /api/orders` — primary endpoint for fetching all non-archived orders
- Used by board, calendar, today view, workload, print/tasks, and client detail pages (7 consumers confirmed)
- Supports `?seamstressId=<uuid>` query param for Phase 27 RBAC filtering via `get_orders_with_details` RPC
- Supports `?client_id=<id>` param for client-specific order lists
- Supports `?page=` and `?limit=` for pagination

**Imports required:**
- `next/server` — `NextResponse`
- `@/lib/supabase/server` — `createServiceRoleClient`
- Supabase RPC function: `get_orders_with_details` (must exist in DB)

### Important: Version Difference

There are two candidate versions for restoration:

| Version | Commit | Lines | Key Difference |
|---------|--------|-------|----------------|
| **Recommended: `0f76a39`** | feat(27-01) — Phase 27 implementation | 120 | Uses `get_orders_with_details` RPC, supports seamstress filtering via `?seamstressId=` |
| Alternative: claude branch | bbd4871 (older history) | ~165 | Uses simple `supabase.from('order').select('*')`, no seamstress filtering, no pagination |

The `0f76a39` version MUST be used because Phase 27 (seamstress RBAC filtering) was completed, and the board's `useBoardData.ts` passes `seamstressId` to this endpoint. Using the claude-branch version would silently break seamstress view filtering.

---

## Architecture Patterns

### Next.js App Router Route Handler Pattern

This project uses Next.js App Router. The orders route handler follows this pattern:

```typescript
// Source: src/app/api/orders/route.ts @ commit 0f76a39
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  // ... handler logic
}
```

The three export constants at the top are required for this route to bypass Next.js caching — they are present in `0f76a39` and must be preserved.

### Route Group Structure (Already Correct)

The sync commit (`563d2cd`) correctly moved page files into Next.js route groups:
- `src/app/(protected)/` — auth-required pages (board, calendar, clients, etc.)
- `src/app/(public)/` — unauthenticated pages (portal)

This restructuring is complete and correct. API routes in `src/app/api/` were NOT moved (they don't need route groups). The empty file is inside `src/app/api/orders/` which was unaffected by the page restructure.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File content recovery | Manual re-implementation of route logic | `git checkout 0f76a39 -- src/app/api/orders/route.ts` | History is intact and correct |
| Finding other empty files | Manual inspection | `find src -type f -empty` | Definitive, catches all cases |
| Verification of restoration | Test run | `wc -c src/app/api/orders/route.ts` then `npx tsc --noEmit` | Fastest correctness check |

---

## Common Pitfalls

### Pitfall 1: Using the Wrong Source Commit

**What goes wrong:** Restoring from the claude branch (`bbd4871`) or any older history gives a version without seamstress filtering. The board silently breaks for seamstress-role users.

**Why it happens:** The claude branch has an older, simpler implementation. It looks valid but lacks Phase 27 features.

**How to avoid:** Always restore from `0f76a39`, NOT from `bbd4871` or the remote claude branch.

**Warning signs:** If the restored file does NOT contain `get_orders_with_details` RPC or `seamstressId` param handling, the wrong source was used.

---

### Pitfall 2: Assuming 32990c2 Exists

**What goes wrong:** Attempting `git checkout 32990c2 -- ...` fails with "unknown revision or path".

**Why it happens:** The repo was recreated from scratch after APFS corruption. Commit `32990c2` is from the previous repo's history and does not exist here.

**How to avoid:** Use `0f76a39` — this is confirmed to exist and contain the correct content.

---

### Pitfall 3: Missing Other Empty Files

**What goes wrong:** Spending effort looking for many empty files when only one exists.

**Why it happens:** The ROADMAP was written speculatively before the files were checked. Most listed files were already restored in `563d2cd`.

**How to avoid:** Run `find src -type f -empty` first. As of 2026-03-18, only one file is empty.

---

### Pitfall 4: Restoring Breaks git Status

**What goes wrong:** After `git checkout 0f76a39 -- src/app/api/orders/route.ts`, the file shows as "modified" in git (staged). The developer may accidentally commit immediately with `git commit -am`.

**Why it happens:** `git checkout <commit> -- <file>` stages the change automatically.

**How to avoid:** After running the checkout, commit explicitly with a descriptive message ("restore: add back api/orders/route.ts content accidentally emptied in 563d2cd").

---

## Code Examples

### Restoration Command

```bash
# Navigate to project root
cd <project-root>

# Verify current state — should output: 0
wc -c src/app/api/orders/route.ts

# Restore from last known-good commit
git checkout 0f76a39 -- src/app/api/orders/route.ts

# Verify restoration — should output: 4243 (or close)
wc -c src/app/api/orders/route.ts

# Verify no syntax errors introduced
npx tsc --noEmit 2>&1 | head -20
```

### Verification Commands

```bash
# Find all empty source files (confirm only one)
find src -type f -empty

# Confirm the restored version has RPC call (Phase 27 requirement)
grep "get_orders_with_details" src/app/api/orders/route.ts

# Confirm seamstress filtering param is present
grep "seamstressId" src/app/api/orders/route.ts

# Check git status to see staged change
git status
```

### Full Restored File Content (for reference)

The restored file at `0f76a39` contains:
- Lines 1-3: `export const dynamic`, `revalidate`, `fetchCache` constants
- Lines 5-6: imports
- Lines 8-end: `GET` handler with pagination, client_id filter, seamstressId filter via RPC

Key function signature: `export async function GET(request: Request)`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Simple `supabase.from('order').select('*')` | `supabase.rpc('get_orders_with_details', {...})` | Phase 27 (0f76a39) | Enables seamstress-role filtering at DB level |
| Flat `src/app/board/` routing | Route groups `src/app/(protected)/` | 563d2cd | Auth middleware applies cleanly to all protected pages |

---

## Open Questions

1. **Will the build pass after restoring the single file?**
   - What we know: The only TypeScript error source is the empty file (empty files compile fine but export nothing, breaking consumers that import from the route indirectly). Route handlers are not imported — they are HTTP endpoints. So the build likely passes already and the empty file causes only runtime 404s/500s on the board/calendar pages.
   - What's unclear: Whether there are any TypeScript-level compilation issues from the empty file. Background `tsc --noEmit` run was inconclusive (still running at research time).
   - Recommendation: Run `find src -type f -empty` and `npx tsc --noEmit` as the first two verification steps in the plan.

2. **Are there any files that exist at 0f76a39 but are entirely missing from current HEAD?**
   - What we know: Comparing `0f76a39` to HEAD shows `src/messages/en.json` and `src/messages/fr.json` were deleted in the sync commit. These are localization message files.
   - What's unclear: Whether they are still needed given the project uses `locales/` directory.
   - Recommendation: Check if `locales/fr.json` and `locales/en.json` exist and are the active message files. The `src/messages/` files may have been intentionally deleted as part of path consolidation.

---

## Validation Architecture

No dedicated test framework is configured (no `jest.config.*`, `vitest.config.*`, or `pytest.ini` detected). Tests are manual.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Command | Notes |
|--------|----------|-----------|---------|-------|
| INFRA-1 | `src/app/api/orders/route.ts` is non-empty | Manual | `wc -c src/app/api/orders/route.ts` | Should be > 4000 bytes |
| INFRA-1 | TypeScript compiles clean | Automated | `npx tsc --noEmit` | Must show 0 errors |
| INFRA-1 | Board page loads orders | Manual | Navigate to `/board` | Orders should appear |
| INFRA-1 | Seamstress filtering still works | Manual | Log in as seamstress role, check board shows only assigned orders | Requires Phase 27 RPC version |

### Wave 0 Gaps

None — no test files need to be created. This is a file restoration task, not a feature implementation.

---

## Sources

### Primary (HIGH confidence)
- Git history: `git show 0f76a39:src/app/api/orders/route.ts` — complete file content verified
- Git log: `git log --all --oneline -- src/app/api/orders/route.ts` — full history of the emptied file
- `find src -type f -empty` — exhaustive search for all empty files, run 2026-03-18
- `git diff 0f76a39 563d2cd --name-status` — identifies exactly what the sync commit changed

### Secondary (MEDIUM confidence)
- Comparison of claude branch (`bbd4871`) vs `0f76a39` — confirms which version has Phase 27 features
- Consumer grep of `/api/orders` — confirms 7 pages/components depend on this endpoint

### Tertiary (LOW confidence)
- Build output — TypeScript check was still running at research time; result unknown

---

## Metadata

**Confidence breakdown:**
- Empty file identification: HIGH — `find` command is definitive
- Restoration source: HIGH — git history is intact and content verified
- Correctness of 0f76a39 version: HIGH — matches Phase 27 implementation known to be working
- Build state: LOW — tsc run incomplete at research time

**Research date:** 2026-03-18
**Valid until:** Stable — git history does not change

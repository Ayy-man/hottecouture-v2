---
phase: 3
slug: garment-type-admin-crud
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification (no test framework configured in project) |
| **Config file** | none |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit && npx next build` |
| **Estimated runtime** | ~30 seconds (tsc), ~120 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit && npx next build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | BUG-5 | migration | `grep display_order supabase/migrations/0041*` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | BUG-5 | migration | `grep -i "testingg\|tapis" supabase/migrations/0042*` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | BUG-5 | compile | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-02-02 | 02 | 1 | BUG-5 | compile | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Migration files for `display_order` column and test data cleanup
- [ ] Admin page file creation

*Existing API infrastructure covers backend requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Inline name editing | BUG-5 | UI interaction | Click garment type name, edit, press Enter, verify update |
| Emoji picker selection | BUG-5 | UI interaction | Click emoji, pick new one, verify display update |
| Delete with usage check | BUG-5 | UI interaction | Try deleting used type (should warn), delete unused type (should succeed) |
| Reorder with up/down | BUG-5 | UI interaction | Click up/down arrows, verify order persists after refresh |
| Test entries removed | BUG-5 | Database state | Verify "h", "testingG", "TAPIS" no longer appear in list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

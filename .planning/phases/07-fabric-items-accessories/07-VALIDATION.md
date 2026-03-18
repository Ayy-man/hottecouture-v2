---
phase: 7
slug: fabric-items-accessories
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 7 — Validation Strategy

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
| 07-01-01 | 01 | 1 | MKT-117 | migration | `grep -i "fabric" supabase/migrations/0043*` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | MKT-117 | compile | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Migration file for fabric service seed data

*Existing AccessoriesStep infrastructure covers UI requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fabric by yard in Accessories | MKT-117 | UI interaction | Open intake, go to Accessories, verify "Tissu au verge" appears |
| Fabric by sq ft in Accessories | MKT-117 | UI interaction | Verify "Tissu au pied carré" appears in Accessories dropdown |
| Decimal quantity input | MKT-117 | UI interaction | Enter 0.25 yards, verify accepted |
| Price formula display | MKT-117 | UI interaction | Verify "X yards × $Y/yard = $Z" display |
| Not in calendar | MKT-117 | E2E flow | Create order with fabric only, verify no calendar entry |
| On invoice | MKT-117 | E2E flow | Create order with fabric, verify appears on invoice/payment |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

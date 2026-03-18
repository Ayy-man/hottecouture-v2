---
phase: 6
slug: order-form-restructure-4-sections
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler (tsc) + Next.js build |
| **Config file** | `tsconfig.json` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit && npx next build` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full build must pass + manual intake flow test
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | MKT-116 | migration | `grep 'NUMERIC' supabase/migrations/*quantity*` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | MKT-116 | schema | `grep 'z.number()' src/lib/dto.ts` (no .int()) | ✅ | ⬜ pending |
| 06-02-01 | 02 | 1 | MKT-116 | compile | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 06-02-02 | 02 | 1 | MKT-116 | grep | `grep 'AlterationStep\|AccessoriesStep' src/app/(protected)/intake/page.tsx` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | MKT-116 | grep | `grep 'isAccessory' src/app/api/intake/route.ts` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | MKT-116 | grep | `grep 'hasAlterationServices' src/app/api/intake/route.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework to install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 4-section form flow works | MKT-116 | UI navigation flow | Start intake, verify 4 steps: Client → Alteration → Accessories → Pricing |
| Accessory-only order submits | MKT-116 | E2E with database | Skip Alteration step, add only accessories, submit |
| Alteration-only order submits | MKT-116 | E2E with database | Skip Accessories step, add only alterations, submit |
| Calendar excludes accessories | MKT-116 | External integration | Submit accessory-only order, verify no calendar event |
| Decimal quantities accepted | MKT-116 | UI + DB | Enter 0.5 qty for accessory, verify saved correctly |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

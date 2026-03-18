---
phase: 08-notification-workflow-overhaul
verified: 2026-03-18T16:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
gaps: []
---

# Phase 8: Notification Workflow Overhaul Verification Report

**Phase Goal:** Reconfigure order notification lifecycle with automatic triggers. Auto SMS at pending, SMS+voice at ready, invoices only at ready, all templates in French.
**Verified:** 2026-03-18T16:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ORDER_CREATED exists in MessagingAction union type | VERIFIED | `types.ts` line 94: `\| 'ORDER_CREATED'` as first entry in union |
| 2 | sendWelcomeSms exported and has French template with portal link | VERIFIED | `messaging.ts` lines 487-511: exported; ORDER_CREATED template line 30 uses `Haute Couture a bien reçu votre commande #${data.orderNumber}. Suivez l'avancement ici : ${data.trackingUrl}` |
| 3 | sendVoiceBroadcast exported, gated on GHL_VOICE_CAMPAIGN_ID, no-op when absent | VERIFIED | `messaging.ts` lines 519-541: exported; line 523 checks `process.env.GHL_VOICE_CAMPAIGN_ID`; returns `{ success: true, data: { called: false } }` when absent |
| 4 | Welcome SMS fires in intake route after GHL contact sync | VERIFIED | `intake/route.ts` lines 654-670: `sendWelcomeSms` called inside `if (ghlSyncResult.success && ghlSyncResult.data)` block, wrapped in try/catch, non-blocking |
| 5 | Ready SMS fires automatically (no manual gate / shouldSendNotification check) | VERIFIED | `stage/route.ts` line 290: condition is `if (newStage === 'ready' && isGHLConfigured())` — `shouldSendNotification` removed from condition; variable remains declared at line 207 but unused in the condition |
| 6 | Voice broadcast fires at ready status | VERIFIED | `stage/route.ts` lines 366-379: `sendVoiceBroadcast(client.ghl_contact_id)` called after SMS block, inside the ready condition, wrapped in try/catch |
| 7 | SmsConfirmationModal removed from board/page.tsx | VERIFIED | No import, no JSX, no `pendingSmsConfirmation` state, no `PendingSmsConfirmation` interface, no `handleSmsConfirm` in `board/page.tsx`; `handleOrderUpdate` at line 151-156 calls `executeOrderUpdate` directly for all statuses |
| 8 | No notifications at "working" or "done" statuses | VERIFIED | Stage route: `newStage === 'working'` only appears in a deposit guard (line 103); `newStage === 'done'` only appears in a garment completion check (line 186); no GHL send calls for either status |
| 9 | Invoices only generated at ready (unchanged path) | VERIFIED | `create-checkout` is called only from within the `if (newStage === 'ready' && isGHLConfigured())` block (stage/route.ts line 307); no invoice creation at pending, working, or done |

**Score:** 9/9 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/ghl/types.ts` | MessagingAction union with ORDER_CREATED | VERIFIED | Line 94: `\| 'ORDER_CREATED'` present as first union member |
| `src/lib/ghl/messaging.ts` | sendWelcomeSms and sendVoiceBroadcast exports, ORDER_CREATED template | VERIFIED | Both functions exported at lines 487 and 519; ORDER_CREATED template at lines 28-33 with bilingual fr/en variants |
| `src/app/api/intake/route.ts` | sendWelcomeSms call after GHL contact sync | VERIFIED | Imported at line 15; called at line 656 inside `ghlSyncResult.success` block |
| `src/app/api/order/[id]/stage/route.ts` | Auto-fire ready notification, sendVoiceBroadcast call | VERIFIED | Ready condition at line 290 without shouldSendNotification; voice broadcast at lines 366-379 |
| `src/app/(protected)/board/page.tsx` | Direct executeOrderUpdate, no SMS modal | VERIFIED | `handleOrderUpdate` at line 151-156 calls `executeOrderUpdate(orderId, newStatus, false)` directly; no modal references anywhere in the file |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `intake/route.ts` | `sendWelcomeSms` in messaging.ts | `import { sendWelcomeSms } from '@/lib/ghl'` + call at line 656 | WIRED | Import at line 15; `export * from './messaging'` in `ghl/index.ts` line 16 makes `sendWelcomeSms` accessible via `@/lib/ghl`; call uses `ghlSyncResult.data` as contactId |
| `stage/route.ts` | Auto-fire ready block | `newStage === 'ready' && isGHLConfigured()` (no shouldSendNotification) | WIRED | Condition at line 290 confirmed without the manual gate |
| `stage/route.ts` | `sendVoiceBroadcast` in messaging.ts | `import { sendVoiceBroadcast } from '@/lib/ghl'` + call at line 369 | WIRED | Import at line 15; call uses `client.ghl_contact_id` |
| `board/page.tsx handleOrderUpdate` | `executeOrderUpdate` | Direct call — no modal for ready | WIRED | `handleOrderUpdate` body is a single direct call to `executeOrderUpdate(orderId, newStatus, false)` |

**Note on ghl/index.ts:** `sendWelcomeSms` and `sendVoiceBroadcast` do not appear in the named re-export section (lines 39-48) of `index.ts`, but `export * from './messaging'` on line 16 unconditionally re-exports all exports from `messaging.ts`. Both functions are therefore available via `@/lib/ghl`. No gap.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| MKT-118 sub-req 1: Auto SMS at pending with portal link | 08-01, 08-02 | Welcome SMS "Bonjour, Haute Couture a bien recu votre commande..." fired automatically at order creation | SATISFIED | ORDER_CREATED template in messaging.ts line 30; sendWelcomeSms wired in intake/route.ts line 654-670 |
| MKT-118 sub-req 2: No notification at in_progress | 08-02 | Stage handler has no GHL send at working transition | SATISFIED | Only `newStage === 'working'` reference is a deposit guard, no SMS/voice call |
| MKT-118 sub-req 3: SMS + voice call at ready | 08-02 | Ready SMS via create-checkout (sendSms:true) + sendVoiceBroadcast | SATISFIED | stage/route.ts lines 290-380: create-checkout called with sendSms:true; voice broadcast called after |
| MKT-118 sub-req 4: No notification at done | 08-02 | No GHL calls at done transition | SATISFIED | `newStage === 'done'` only in garment completion check, no SMS/voice |
| MKT-118 sub-req 5: Invoices only at ready | 08-02 | create-checkout (which creates GHL invoice) only triggered at ready | SATISFIED | create-checkout call at stage/route.ts line 307 is inside `if (newStage === 'ready' && isGHLConfigured())` block only |
| MKT-118 sub-req 6: All SMS templates in French | 08-01 | ORDER_CREATED, READY_PICKUP, DEPOSIT_REQUEST all have fr variants; ORDER_CREATED French text matches spec | SATISFIED | messaging.ts: ORDER_CREATED fr template matches spec exactly; all other templates have fr/en bilingual with fr as default; create-checkout SMS at line 362 defaults to `fr` |
| MKT-118 sub-req: GHL voice broadcast at ready | 08-01, 08-02 | sendVoiceBroadcast exists, gated on env var, called at ready | SATISFIED | messaging.ts lines 519-541; wired in stage/route.ts lines 366-379 |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| `src/components/board/sms-confirmation-modal.tsx` | — | File exists on disk but is no longer imported anywhere | Info | Dead file; does not block goal; component is not rendered anywhere in the application |

No blockers or warnings found. The `sms-confirmation-modal.tsx` file remaining on disk is a benign dead file — it is not imported or rendered anywhere.

---

## Human Verification Required

### 1. End-to-end welcome SMS delivery

**Test:** Create a new order through the intake flow when GHL is configured with real credentials.
**Expected:** Client receives an SMS matching "Bonjour [firstName], Haute Couture a bien reçu votre commande #[N]. Suivez l'avancement ici : https://hottecouture.ca/portal?order=[N]"
**Why human:** Requires live GHL environment, real phone number, and actual SMS delivery confirmation — cannot be verified programmatically.

### 2. Kanban drag to ready auto-fires SMS and voice

**Test:** Drag a kanban card from `pending` or `working` to `ready` column with GHL configured.
**Expected:** No modal appears; order moves immediately; client receives SMS with payment link; if GHL_VOICE_CAMPAIGN_ID is set, voice call is placed.
**Why human:** Requires live GHL environment and browser interaction — automated checks confirmed the code path but not actual delivery.

### 3. No notification on drag to working or done

**Test:** Drag cards to `working` and `done` columns.
**Expected:** Status updates silently — no SMS, no modal, no voice call.
**Why human:** Behavioral verification of absence of action requires runtime testing.

---

## Gaps Summary

No gaps. All 9 must-haves are verified against the actual codebase.

**Plan 01 results:** `ORDER_CREATED` added to `MessagingAction` union type; bilingual ORDER_CREATED template added to `MESSAGE_TEMPLATES`; `sendWelcomeSms` and `sendVoiceBroadcast` exported from `messaging.ts` with correct signatures and behavior. French template text matches the MKT-118 specification exactly.

**Plan 02 results:** `sendWelcomeSms` imported and called in `intake/route.ts` inside the GHL sync success block (non-blocking); `sendVoiceBroadcast` imported and called in `stage/route.ts` after the ready SMS block; `shouldSendNotification` removed from the ready condition in `stage/route.ts`; `board/page.tsx` simplified — `SmsConfirmationModal`, `PendingSmsConfirmation`, `pendingSmsConfirmation` state, and `handleSmsConfirm` all removed; `handleOrderUpdate` now calls `executeOrderUpdate` directly for all status transitions.

**Invoice invariant confirmed:** `create-checkout` (the invoice creation path) is only reachable from within the `if (newStage === 'ready' && isGHLConfigured())` block. No invoice is created at `pending`, `working`, or `done`.

---

_Verified: 2026-03-18T16:00:00Z_
_Verifier: Claude (gsd-verifier)_

# Phase 8: Notification Workflow Overhaul - Research

**Researched:** 2026-03-18
**Domain:** GoHighLevel SMS/Voice integration, order lifecycle notifications, invoice timing
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MKT-118 | Auto-SMS at `pending`: welcome with portal tracking link | `sendSMS()` in `messaging.ts` + `findOrCreateContact()` pattern works; need `ORDER_CREATED` template |
| MKT-118 | No notification at `in progress` (maps to `working` in DB) | Stage handler already skips non-`ready` notifications; no change needed |
| MKT-118 | SMS + voice call at `ready`: payment amount + Stripe link + tracking link + GHL voice broadcast | `sendReadyPickup()` exists for SMS; voice broadcast needs new GHL API call — capability unverified |
| MKT-118 | No notification at `done` | Already the case; status handler only fires on `ready` |
| MKT-118 | Invoices (Stripe + QuickBooks) ONLY at `ready` | Currently invoice is created in `/api/payments/create-checkout` at `ready` via stage handler; need to confirm no earlier invoice creation path exists |
| MKT-118 | All SMS templates in French (bilingual fallback based on `client.language`) | Pattern established: `template[language](data)` with `fr`/`en` variants; all new templates follow same shape |
</phase_requirements>

---

## Summary

Phase 8 reconfigures the order notification lifecycle so it is fully automatic, triggered by status transitions rather than staff-initiated UI actions. Currently, moving to `ready` shows a manual `SmsConfirmationModal` that staff must confirm before an SMS fires. There is no welcome SMS at order creation (`pending`), and the voice broadcast at `ready` is not implemented at all.

The GHL integration is mature and production-ready: `src/lib/ghl/` exports `sendSMS`, `sendNotification`, `findOrCreateContact`, `createText2PayInvoice`, and a fully-typed `ghlFetch` client. The `sendNotification` function handles bilingual template selection via `client.language` and email fallback. The pattern for adding new message templates is well-established and low-risk.

The critical unknown is GHL voice broadcast. The GHL API does support voice calls, but no voice capability exists anywhere in the codebase. The requirement says "pre-recorded voice message — Audrey records script, GHL voice broadcast triggered at ready." This depends on GHL having a voice broadcast (or "call") API on the account's plan, and on Audrey having recorded and uploaded the audio to GHL first. The planner must treat voice broadcast as a conditional feature gated by `isGHLConfigured()` and a separate `GHL_VOICE_CAMPAIGN_ID` env var.

**Primary recommendation:** Add `ORDER_CREATED` welcome SMS to the bottom of the intake route (after GHL contact sync, non-blocking). Add `READY_PICKUP` auto-SMS as already partially wired in the stage handler (remove the manual confirmation modal gate). Add voice broadcast as a new `sendVoiceBroadcast()` function, conditionally called only if `GHL_VOICE_CAMPAIGN_ID` is set.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `src/lib/ghl/` (internal) | N/A | All GHL API calls | Already production-configured for SMS, email, invoices, contacts |
| `src/app/api/order/[id]/stage/route.ts` | N/A | Status transition + notification trigger point | The single authoritative place where status changes happen |
| `src/app/api/intake/route.ts` | N/A | Order creation (pending status) | Where welcome SMS must be added |
| `src/app/api/payments/create-checkout/route.ts` | N/A | Invoice creation via GHL Text2Pay | Called at `ready`; already fires invoice via GHL |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/lib/ghl/contacts.ts` — `findOrCreateContact()` | N/A | GHL contact lookup/create | Must be called before any SMS to ensure contactId exists |
| `src/lib/ghl/client.ts` — `isGHLConfigured()` | N/A | Feature gate for all GHL operations | Wrap all GHL calls — prevents errors if keys not set |
| `src/lib/dto.ts` — `orderStatusSchema` | N/A | DB-canonical order status values | `pending`, `working`, `done`, `ready`, `delivered`, `archived` — NOT `in_progress` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GHL native SMS via `sendSMS()` | N8N webhook (`n8n-webhooks.ts`) | N8N is the old pattern; GHL direct is current pattern — stick with GHL direct |
| Inline voice call via GHL API | External voice service | GHL voice broadcast is the stated requirement; only fallback if GHL account lacks voice |

**Installation:** No new packages required. All dependencies already present.

---

## Architecture Patterns

### Current Status Naming (CRITICAL)

The requirement says "in progress" and "done" — but the DB enum uses different values:

| Requirement language | DB enum value | Notes |
|---------------------|---------------|-------|
| pending | `pending` | Match |
| in progress | `working` | MISMATCH — code uses `working` |
| ready | `ready` | Match |
| done | `done` | Match |

The stage handler and DTO both use `working` (not `in_progress`). The track page (`src/app/(protected)/track/[id]/page.tsx`) has a legacy `in_progress` branch but it maps to the timeline UI label, not the DB. All new code must use `working`.

### Recommended Project Structure
```
src/lib/ghl/
├── client.ts       # ghlFetch, isGHLConfigured — unchanged
├── contacts.ts     # findOrCreateContact — unchanged
├── messaging.ts    # ADD: ORDER_CREATED template + sendWelcomeSms() + sendVoiceBroadcast()
├── invoices.ts     # unchanged
└── types.ts        # ADD: 'ORDER_CREATED' to MessagingAction union

src/app/api/
├── intake/route.ts             # ADD: sendWelcomeSms() call after GHL contact sync
└── order/[id]/stage/route.ts   # MODIFY: remove manual SMS gate, make auto-fire on 'ready'

src/components/board/
└── sms-confirmation-modal.tsx  # REMOVE usage from board/page.tsx (keep file or delete)
```

### Pattern 1: Non-Blocking Async Notification
**What:** All notification calls are wrapped in `try/catch`, logged on failure, never cause the primary operation to fail.
**When to use:** Every GHL call in API routes.
**Example:**
```typescript
// Source: src/app/api/intake/route.ts (existing GHL sync pattern — lines 621-661)
if (isGHLConfigured()) {
  try {
    const result = await sendWelcomeSms(ghlClient, newOrder);
    if (!result.success) console.warn('SMS failed:', result.error);
  } catch (err) {
    console.warn('SMS error (non-blocking):', err);
    // Do NOT return error — order creation already succeeded
  }
}
```

### Pattern 2: Find-Or-Create Contact Before Sending
**What:** Always call `findOrCreateContact(client)` before `sendSMS()` — the GHL contactId is required.
**When to use:** Every outbound SMS/email.
**Example:**
```typescript
// Source: src/lib/ghl/messaging.ts — sendDepositRequest() (lines 326-352)
const contactResult = await findOrCreateContact(client);
if (!contactResult.success || !contactResult.data) {
  return { success: false, error: contactResult.error || 'Contact not found' };
}
// contactResult.data is the GHL contactId string
const smsResult = await sendSMS(contactResult.data, message);
```

### Pattern 3: Bilingual Template Function
**What:** All templates define an `fr` and `en` variant. Template is selected by `client.language`.
**When to use:** Every new customer-facing message.
**Example:**
```typescript
// Source: src/lib/ghl/messaging.ts — MESSAGE_TEMPLATES (lines 27-150)
ORDER_CREATED: {
  fr: (data: MessageData) =>
    `Bonjour ${data.firstName}, Haute Couture a bien reçu votre commande #${data.orderNumber}. Suivez l'avancement ici : ${data.trackingUrl}`,
  en: (data: MessageData) =>
    `Hello ${data.firstName}, Haute Couture has received your order #${data.orderNumber}. Track it here: ${data.trackingUrl}`,
},
```

### Pattern 4: Tracking URL Construction
**What:** Portal tracking URL is constructed as `${NEXT_PUBLIC_APP_URL}/portal?order=${orderNumber}`.
**When to use:** All SMS templates requiring a tracking link.
**Source:** `src/app/api/payments/create-checkout/route.ts` line 361.
```typescript
const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://hottecouture.ca'}/portal?order=${orderNumber}`;
```

### Pattern 5: AppClient Shape for GHL Calls
**What:** GHL functions expect `AppClient` type from `src/lib/ghl/types.ts`. Intake route already builds this object for the GHL contact sync (lines 627-636).
**When to use:** Assembling client data before any GHL call.
```typescript
// Source: src/app/api/intake/route.ts lines 627-636
const ghlClient: AppClient = {
  id: clientId,
  first_name: client.first_name || '',
  last_name: client.last_name || '',
  email: client.email || null,
  phone: client.phone || null,
  language: (client.language || 'fr') as 'fr' | 'en',
  ghl_contact_id: null,
  preferred_contact: client.preferred_contact || 'sms',
};
```

### Anti-Patterns to Avoid
- **Sending SMS before GHL contact sync:** The `ghl_contact_id` may be null at intake. The welcome SMS must be sent after `syncClientToGHL` succeeds and the contact ID is known.
- **Blocking order creation on SMS failure:** If `sendWelcomeSms()` fails, the order is still valid. Log the failure, do not return a 500.
- **Creating invoices at `pending`:** The current `create-checkout` route is only called from the stage handler at `ready`. Do not add any invoice creation to the intake route.
- **Using `in_progress` in code:** The DB uses `working`. Using `in_progress` will silently miss the transition.
- **Calling `sendNotification` without checking `isGHLConfigured()`:** Will throw if env vars are missing in development.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GHL contact lookup | Custom fetch to GHL `/contacts/` | `findOrCreateContact()` from `src/lib/ghl/contacts.ts` | Already handles email+phone fallback, E.164 formatting, create-if-missing |
| SMS delivery | Direct Twilio/custom SMS | `sendSMS(contactId, message)` from `src/lib/ghl/messaging.ts` | GHL is the SMS provider; direct Twilio would bypass conversation threading |
| Bilingual template selection | Per-template if/else | `buildMessage(action, language, data)` helper in `messaging.ts` line 214 | Pattern already established for 6 existing templates |
| GHL API authentication | Custom auth headers | `ghlFetch()` from `src/lib/ghl/client.ts` | Handles Bearer token, Version header, error normalization |
| Invoice at ready | New Stripe session | `create-checkout` route (already called by stage handler) | Existing Text2Pay invoice + SMS link flow handles the full amount/link/SMS package |

**Key insight:** The GHL lib is complete and production-tested. The only work is wiring new call sites (intake for welcome SMS, remove manual gate on stage handler) and adding one new template.

---

## Common Pitfalls

### Pitfall 1: SMS Modal Currently Gates the Notification
**What goes wrong:** The current board page shows `SmsConfirmationModal` when a card is dragged to `ready`. The stage API only fires GHL if `sendNotification: true` is passed in the body. If the modal is removed without wiring auto-notification in the stage route, the `ready` SMS will stop working entirely.
**Why it happens:** The stage API has `const shouldSendNotification = validatedData.sendNotification === true` (line 206 of `stage/route.ts`). The boolean must be removed and replaced with always-auto for `ready`.
**How to avoid:** In `stage/route.ts`, change the condition from `shouldSendNotification && isGHLConfigured()` to just `isGHLConfigured()` for the `ready` status block. Remove the `sendNotification` flag from the DTO (or keep it but ignore it for `ready`).
**Warning signs:** SMS stops sending after removing the modal.

### Pitfall 2: GHL Contact ID Not Yet Stored at Welcome SMS Time
**What goes wrong:** The intake route creates the GHL contact, gets the ID back, and then updates `client.ghl_contact_id`. If the welcome SMS is sent before this update (or before sync succeeds), `findOrCreateContact()` will perform another API call. This is harmless but wasteful.
**Why it happens:** The welcome SMS needs to happen after the `syncClientToGHL` call at line 639 and after the `ghl_contact_id` is written to the DB (line 648).
**How to avoid:** Add welcome SMS call at the very end of the intake route (after line 661), using the `ghlSyncResult.data` contact ID directly to avoid a redundant lookup.

### Pitfall 3: Voice Broadcast Is an Unverified Capability
**What goes wrong:** GHL's API includes voice/call broadcast but it requires specific account plan features and a pre-configured campaign or audio file ID. Calling a voice broadcast endpoint with an unconfigured campaign ID will return an API error.
**Why it happens:** No GHL voice API code exists in the codebase. There is no env var for it. Audrey has not yet recorded the script.
**How to avoid:** Implement voice broadcast as a conditionally-enabled feature using `GHL_VOICE_CAMPAIGN_ID` env var. If the env var is absent, log a warning and skip. Do not block the SMS notification on voice broadcast success.
**Warning signs:** GHL API returns 4xx errors on any voice broadcast endpoint — indicates account plan doesn't include it or campaign ID is wrong.

### Pitfall 4: Invoice Timing Enforcement
**What goes wrong:** The requirement says invoices (Stripe + QuickBooks) must ONLY be generated at `ready`. Currently, `create-checkout` is only called from the stage handler at `ready` — so this is already correct. But the planner should verify no other code path calls `createText2PayInvoice` or `triggerQuickBooksInvoice` at earlier stages.
**Why it happens:** `triggerQuickBooksInvoice` in `make.ts` is a standalone function that could be called from anywhere.
**How to avoid:** Search codebase for all call sites of `createText2PayInvoice`, `createDepositInvoice`, `createFullInvoice`, `triggerQuickBooksInvoice`. Confirm none are triggered at `pending` or `working`.
**Warning signs:** Clients receive invoices before their order is ready.

### Pitfall 5: Tracking Link Points to Wrong Page
**What goes wrong:** Two tracking pages exist in the codebase:
- `src/app/(public)/portal/page.tsx` — search-by-phone/order-number (public)
- `src/app/(protected)/track/[id]/page.tsx` — direct UUID link (protected? unclear)

The welcome SMS requirement says "Suivez l'avancement ici : {portal_link}". The `create-checkout` route uses `/portal?order=${orderNumber}` (the public search portal). The stage handler uses `/track/${order.id}` (direct UUID link). The planner must decide which URL to use and be consistent.
**How to avoid:** Use the portal URL (`/portal?order=${orderNumber}`) for client-facing SMS — it's fully public and doesn't expose UUID.

---

## Code Examples

### Adding Welcome SMS to Intake Route
```typescript
// Source: src/app/api/intake/route.ts — after line 661 (after GHL sync block)
// After GHL contact sync:
if (isGHLConfigured()) {
  try {
    const ghlContactId = ghlSyncResult?.data || null;
    if (ghlContactId) {
      const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://hottecouture.ca'}/portal?order=${(newOrder as any).order_number}`;
      const welcomeMessage = client.language === 'en'
        ? `Hello ${client.first_name}, Haute Couture has received your order #${(newOrder as any).order_number}. Track it here: ${trackingUrl}`
        : `Bonjour ${client.first_name}, Haute Couture a bien reçu votre commande #${(newOrder as any).order_number}. Suivez l'avancement ici : ${trackingUrl}`;
      const smsResult = await sendSMS(ghlContactId, welcomeMessage);
      if (smsResult.success) {
        console.log('Welcome SMS sent for order:', (newOrder as any).order_number);
      } else {
        console.warn('Welcome SMS failed (non-blocking):', smsResult.error);
      }
    }
  } catch (err) {
    console.warn('Welcome SMS error (non-blocking):', err);
  }
}
```

### Removing Manual SMS Gate in Stage Handler
```typescript
// Source: src/app/api/order/[id]/stage/route.ts — lines 289-363
// BEFORE (requires explicit sendNotification: true flag):
if (newStage === 'ready' && shouldSendNotification && isGHLConfigured()) {

// AFTER (auto-fires on every 'ready' transition):
if (newStage === 'ready' && isGHLConfigured()) {
```

### Adding ORDER_CREATED to MessagingAction Type
```typescript
// Source: src/lib/ghl/types.ts — line 93-99
export type MessagingAction =
  | 'ORDER_CREATED'    // NEW — welcome SMS at pending
  | 'DEPOSIT_REQUEST'
  | 'READY_PICKUP'
  | 'READY_PICKUP_PAID'
  | 'PAYMENT_RECEIVED'
  | 'REMINDER_3WEEK'
  | 'REMINDER_1MONTH';
```

### Voice Broadcast (Conditional, GHL API)
```typescript
// New function in src/lib/ghl/messaging.ts
export async function sendVoiceBroadcast(
  contactId: string
): Promise<GHLResult<{ called: boolean }>> {
  const campaignId = process.env.GHL_VOICE_CAMPAIGN_ID;
  if (!campaignId) {
    console.warn('GHL_VOICE_CAMPAIGN_ID not set — skipping voice broadcast');
    return { success: true, data: { called: false } };
  }
  // GHL voice broadcast API — see https://highlevel.stoplight.io/docs/integrations
  const result = await ghlFetch<any>({
    method: 'POST',
    path: `/contacts/${contactId}/campaigns/${campaignId}/trigger`,
    body: {},
  });
  return result.success
    ? { success: true, data: { called: true } }
    : { success: false, error: result.error };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N8N webhook middleware for SMS | Direct GHL API via `src/lib/ghl/` | Phase 26 / Feb 2026 | Simpler, fewer moving parts, faster |
| Manual SMS modal (staff confirms) | Auto-fire on stage transition | THIS PHASE (MKT-118) | Removes human friction, ensures 100% notification rate |
| Invoices at any time | Invoices only at `ready` | THIS PHASE (MKT-118) | Matches business logic: payment link arrives with ready notification |

**Deprecated/outdated:**
- `src/lib/webhooks/n8n-webhooks.ts` `sendDemandeDepot`/`sendPretRamassage`: Old N8N webhook functions — replaced by direct GHL calls. Still in codebase but unused by active code paths.
- `src/lib/webhooks/sms-webhook.ts` `sendSMSNotification`: Legacy N8N SMS webhook — unused, kept for reference.
- `SmsConfirmationModal` usage in `board/page.tsx`: The manual confirmation gate must be removed or bypassed for automated workflow.

---

## Notification Trigger Map (Final State)

| DB Status | Current Behavior | Required Behavior |
|-----------|-----------------|-------------------|
| `pending` (created via intake) | GHL contact sync, no SMS | GHL contact sync + welcome SMS |
| `working` | No notification | No notification (unchanged) |
| `done` | No notification | No notification (unchanged) |
| `ready` (via stage handler) | Manual SMS modal → optional sendReadyPickup | Auto SMS (payment link + tracking) + voice broadcast |
| `delivered` | No notification | No notification (unchanged) |
| `archived` | No notification | No notification (unchanged) |

---

## Open Questions

1. **GHL Voice Broadcast API endpoint and plan requirement**
   - What we know: GHL has a voice/call API. No code or env var exists for it. Audrey has not yet recorded the script.
   - What's unclear: Does the Hotte Couture GHL account plan include voice broadcasts? What is the API endpoint (POST `/contacts/:id/campaigns/:id/trigger` or a dedicated voice endpoint)?
   - Recommendation: Implement as optional feature gated by `GHL_VOICE_CAMPAIGN_ID` env var. Set up a manual test script. Audrey can record and upload the audio to GHL as a "campaign" or "workflow" audio file, then provide the campaign ID.

2. **Remove or keep `SmsConfirmationModal`**
   - What we know: The modal is only used in `board/page.tsx` for the `ready` transition. With auto-notification, it's no longer needed.
   - What's unclear: Does the client want to keep a manual override path (e.g., drag to ready without SMS for special cases)?
   - Recommendation: Remove the modal usage and the `pendingSmsConfirmation` state from `board/page.tsx`. The file itself (`sms-confirmation-modal.tsx`) can be deleted or left unused.

3. **QuickBooks invoice timing**
   - What we know: `triggerQuickBooksInvoice` in `make.ts` is a standalone function. The stage handler calls `/api/webhooks/order-status` which calls `sendToMake()` — that Make.com webhook is what triggers QuickBooks.
   - What's unclear: Is the Make.com webhook currently active and connected to QuickBooks? `MAKE_WEBHOOK_URL` env var may not be set.
   - Recommendation: The code path for QuickBooks invoice (via Make.com) is already gated at `ready` status in `webhooks/order-status/route.ts`. No change needed. Confirm `MAKE_WEBHOOK_URL` is set in Vercel environment.

4. **`preferred_contact` field on `AppClient`**
   - What we know: `types.ts` defines `preferred_contact: 'sms' | 'email'` on `AppClient`. But `dto.ts` `clientCreateSchema` allows `'phone'` as a third option.
   - What's unclear: If a client's `preferred_contact` is `'phone'`, the `sendNotification()` function will default to SMS (the `else` branch). This is fine for SMS-only messages but may need a comment.
   - Recommendation: Welcome SMS is always SMS regardless of `preferred_contact`. The "phone" option is for landline preference tracking only, not for automated notifications.

---

## Sources

### Primary (HIGH confidence)
- `src/lib/ghl/messaging.ts` — all existing templates, `sendNotification`, `sendReadyPickup`, `sendSMS`
- `src/lib/ghl/contacts.ts` — `findOrCreateContact`, `syncClientToGHL`
- `src/lib/ghl/client.ts` — `ghlFetch`, `isGHLConfigured`, env vars `GHL_API_KEY`, `GHL_LOCATION_ID`
- `src/app/api/order/[id]/stage/route.ts` — status transition logic, current notification gate
- `src/app/api/intake/route.ts` — order creation flow, GHL sync block
- `src/app/api/payments/create-checkout/route.ts` — invoice + SMS at ready
- `src/lib/dto.ts` — canonical `orderStatusSchema` enum values
- `src/components/board/sms-confirmation-modal.tsx` — what needs to be removed

### Secondary (MEDIUM confidence)
- `src/app/api/webhooks/order-status/route.ts` — confirms Make.com/QuickBooks only triggered at `ready`
- `src/lib/integrations/make.ts` — `triggerQuickBooksInvoice` standalone function
- `src/app/(public)/portal/page.tsx` — confirms portal URL pattern `/portal?order={orderNumber}`

### Tertiary (LOW confidence)
- GHL voice broadcast API endpoint — not verified against GHL docs; requires account plan confirmation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are production-deployed and in active use
- Architecture: HIGH — notification pattern, template shape, and trigger points are fully mapped
- Pitfalls: HIGH — all identified from direct code reading, not speculation
- Voice broadcast: LOW — no code exists, no account plan confirmation, API endpoint unverified

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable — GHL API versioned at 2021-07-28, unlikely to change)

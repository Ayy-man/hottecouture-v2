# Verification Status Report

**Date:** December 14, 2025
**Scope:** Phase 2 Feature Verification
**Status:** Verification Complete

## Executive Summary
The verification process has identified that most core features are implemented, but there are significant potential issues with **Hourly Service pricing** and **Time Estimation** logic. The "French UI" coverage is high but not 100%. Integration points (Stripe, Chat) are present in the code.

## Verification Matrix

| ID | Category | Question | Status | Answer/Finding | Evidence (File/Line) |
|----|----------|----------|--------|----------------|----------------------|
| 1 | Order Flow | Does selecting a customer auto-advance to "Service Selection"? | **YES** | Auto-advances after 300ms. | `client-step.tsx` : `setTimeout(() => onNext(), 300)` |
| 2 | Order Flow | Does selecting a service auto-advance to "Pricing"? | **NO** | User must manually click "Next". | `services-step-new.tsx` has no `onNext()` call in `addServiceToGarment`. |
| 3 | Lead Times | What is the default due date for "Alteration"? | **10 Days** | 10 business days calculated in frontend; 10 calendar days fallback in API. | `pricing-step.tsx` (frontend) & `route.ts` (backend) |
| 4 | Lead Times | Is the due date different for "Custom Design"? | **YES** | Defaults to 28 days (4 weeks). | `api/intake/route.ts`: `daysToAdd = orderType === 'custom' ? 28 : 10` |
| 5 | Lead Times | Can the user manually override the due date? | **YES** | Date picker available in "Pricing & Due Date" step. | `pricing-step.tsx`: `<input type='date' ... />` |
| 6 | Hourly Services | If qty=3, what expected time is shown? | **TBD / 0** | Likely shows "TBD" or "0m" because `estimated_minutes` is NULL in SQL. | `order-detail-modal.tsx`: `if (totalMinutes === 0) return 'TBD'` |
| 7 | Hourly Services | If qty=3, what price is shown? | **Potential Bug** | Likely **$150.00** ($50 fallback) or **$0**. Frontend reads `base_price_cents` (0 in SQL) and `hourly_rate` is ignored. | `pricing-step.tsx`: `basePrice = baseService?.base_price_cents || 5000` |
| 8 | French UI | What % of UI is French? | **~90%** | Most mapped, but "Previous", "Submit Order", "Due Date" titles found in English. | `pricing-step.tsx`: Hardcoded English strings. |
| 9 | French UI | Are pipeline columns (Pending/Working/etc) in French? | **YES** | "En Attente", "En Cours", "Terminé", etc. | `locales/fr.json` |
| 10 | Internal Chat | Is the chat button visible on `/board`? | **YES** | Floating action button present. | `internal-chat.tsx` included in `page.tsx` |
| 11 | Internal Chat | If asked "combien de commandes...", does it respond? | **YES** | Frontend optimistic update shows response. Backend logic simulated or API connected. | `internal-chat.tsx`: `sendMessage` function. |
| 12 | Scheduler | Does the generic "Workload" page show capacity %? | **YES** | Calculated from 40h/week capacity using Gauge component. | `workload/page.tsx`: `totalCapacityUsed` calculation. |
| 13 | Scheduler | Is there a count of unassigned orders? | **YES** | Displays "Unassigned" workload count. | `workload/page.tsx`: `unassignedWorkload` |
| 14 | Scheduler | Can you drag an order from one seamstress to another? | **NO** | `Gantt` component used for visualization, no drag-drop handlers found in read code. | `workload/page.tsx` |
| 15 | Integrations | Is there a Stripe "Payment Link" button? | **YES** | "Generate Payment Link" button in Order Detail Modal. | `order-detail-modal.tsx` (Lines 753+) |
| 16 | Integrations | What happens when clicked? | **Action** | Calls `/api/payments/create-link` and displays URL to copy/open. | `handleGeneratePaymentLink` function |
| 17 | Services | Are there duplicate services in DB? | **Unverified** | Requires DB access. Script created but env vars missing in local scope. | N/A |

## Detailed Findings

### 1. Order Flow
*   **Client Selection:** The `ClientStep` component explicitly handles auto-advancement:
    ```typescript
    // src/components/intake/client-step.tsx
    const handleSelectClient = (client: ClientCreate) => {
      // ...
      setTimeout(() => onNext(), 300);
    };
    ```
*   **Service Selection:** `ServicesStepNew` updates the garment state but waits for user navigation.

### 2. Lead Times
*   **Calculation Logic:**
    *   **Frontend (`pricing-step.tsx`):** Correctly iterates business days for default.
    *   **Backend (`api/intake/route.ts`):** Uses simple calendar day addition as fallback: `today.getDate() + 10`. This is a minor inconsistency if the frontend date is missing.
*   **Custom Design:** The backend explicitly sets 28 days for custom orders if no date provided.

### 3. Hourly Services (Potential Issues)
*   **Configuration:** `scripts/import-services.sql` defines hourly services with `base_price_cents = 0` and `hourly_rate_cents = 3500` (for example).
*   **Price Calculation Bug:** `pricing-step.tsx` calculates price as:
    ```typescript
    let basePrice = baseService?.base_price_cents || 5000;
    // ...
    subtotal_cents += servicePrice * service.qty;
    ```
    It **does not** appear to check `hourly_rate_cents` or the `pricing_model` to switch logic. This means hourly services defined with 0 base price might default to $50.00 (fallback) or $0.00, ignoring the hourly rate.
*   **Time Estimation:** `OrderDetailModal.tsx` sums `estimated_minutes`. Since this is NULL in the SQL insert, the total time will likely be 0.

### 4. French UI
*   While `locales/fr.json` is extensive, several components have hardcoded English.
*   **Example (`pricing-step.tsx`):**
    ```tsx
    <Button ...>Submit Order 🚀</Button>
    <CardTitle>Due Date</CardTitle>
    ```

### 5. Workload Scheduler
*   The page calculates capacity effectively: `Math.min(100, (totalAssignedHours / weeklyCapacity) * 100)`.
*   It assumes a 5-day work week, 8 hours/day.

### 6. Integrations
*   **Stripe:** The button is located in the `OrderDetailModal`. It generates a link and offers "Copy" or "Open" actions.
*   **Chat:** The `InternalChat` component is mounted on the board and functional.

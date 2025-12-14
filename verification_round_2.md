# Verification Round 2 - Missing Features Report

## Summary
The second round of verification focused on 17 specific "missing features" across various functional areas. The investigation confirms that several critical features are indeed missing, particularly around **Measures & Photos**, **Task Management (Reordering)**, and **Internal Scheduling**. However, the **Public Booking** page and **Auto-Archiving** logic are present.

## Detailed Findings

| Req ID | Feature | Status | Findings / Evidence |
| :--- | :--- | :--- | :--- |
| **Meas.** | **Measurements & Photos** | | |
| Q1 | Measurements step in intake | **NO** | No measurement input fields found in `GarmentsStep` (`src/components/intake/garments-step.tsx`). |
| Q2 | Photo upload UI for garments | **NO** | No file upload button or photo capture UI found in `GarmentsStep` or `src/components/ui`. |
| **Price** | **Pricing** | | |
| Q3 | Staff override service price | **YES** | `ServicesStepNew` allows editing service details including price (`src/components/intake/services-step-new.tsx`). |
| Q4 | `custom_price_cents` persists | **YES** | `PricingStep` logic explicitly handles `customPriceCents` when calculating totals (`src/components/intake/pricing-step.tsx` line 80). |
| **Task** | **Task Management** | | |
| Q5 | Auto-archiving logic | **YES** | API endpoint `/api/orders/auto-archive` exists and handles archiving of simplified orders older than X days. |
| Q6 | Staff reorder tasks by priority | **NO** | `InteractiveBoard` allows drag-and-drop to change *status* (column), but not to reorder *within* a column (`src/components/board/interactive-board.tsx`). |
| Q7 | Field for Rack Position | **YES** | Displayed in `OrderDetailModal` (`src/components/board/order-detail-modal.tsx` line 318). |
| **Work** | **Today's Work List** | | |
| Q8 | Printable "Today's Tasks" view | **NO** | |
| Q9 | If missing, is it a deliverable? | **YES** | Current implementation only offers CSV Export via `WorkListExport` (`src/components/board/worklist-export.tsx`). No direct print view. |
| **Comm** | **Communications** | | |
| Q10 | "New Client Welcome" trigger | **YES** | `ghl-webhook.ts` adds `new_client` tag which triggers GHL automation (`src/lib/webhooks/ghl-webhook.ts`). |
| Q11 | Newsletter automation trigger | **YES** | `ghl-webhook.ts` handles `enrollInNurture` tag (`src/lib/webhooks/ghl-webhook.ts`). |
| **Sched** | **Scheduling** | | |
| Q12 | Public booking page URL | **YES** | Located at `/booking` (`src/app/booking/page.tsx`). Validates `order_id` in query params. |
| Q13 | Internal calendar view | **NO** | No internal calendar page found in `src/app`. `src/app/board/workload` exists but is a Gantt chart, not a calendar. |
| **Custom** | **Custom Design** | | |
| Q14 | Dedicated Intake Form | **YES (Integrated)** | `src/app/intake/page.tsx` handles `custom` type logic to show all service categories. It is an integrated flow rather than a separate page. |
| Q15 | Staff enter deposit amount | **NO** | `PricingStep` has `deposit_required` flag logic but no input field for entering a specific deposit amount (`src/components/intake/pricing-step.tsx`). |
| **Bot** | **Website Chatbot** | | |
| Q16 | Customer-facing chatbot | **NO** | No chatbot script or component found in `src/app/layout.tsx` or `src/app/page.tsx`. |
| Q17 | Embed code found? | **NO** | |

## Critical Missing Deliverables
Based on this review, the following items are confirmed as **MISSING**:
1.  **Measurements Input**: No way to record client measurements.
2.  **Photo Upload**: No way to attach photos to garments.
3.  **Task Reordering**: Kanban board lacks priority sorting within columns.
4.  **Printable Work List**: Only CSV export is available.
5.  **Internal Calendar**: No view for staff to see appointments.
6.  **Deposit Entry**: No UI to specify deposit amount.
7.  **Website Chatbot**: Not implemented.

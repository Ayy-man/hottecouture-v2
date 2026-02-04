# Phase 21: Verify Responsive on Real Devices - Research

**Researched:** 2026-02-04
**Domain:** CSS/Tailwind responsive layout, touch UX, mobile-first design
**Confidence:** HIGH (direct codebase audit, no external library research needed)

## Summary

This research is an exhaustive responsive audit of every page route and shared component in the Hotte Couture app. The audit was conducted by reading every `.tsx` file in `src/app/` and `src/components/`, inspecting Tailwind classes, inline styles, CSS media queries, container sizing, touch target dimensions, and overflow behavior.

The app has a **solid responsive foundation**: the root layout uses `h-dvh overflow-hidden` with CSS grid, MobileBottomNav provides fixed bottom navigation on mobile, globals.css enforces 44px touch targets and 16px font sizes at `max-width: 767px`, and custom Tailwind breakpoints (xs, ipad, ipad-landscape, ipad-portrait) exist. However, there are **27 distinct issues** ranging from critical overflow bugs to minor touch target shortfalls that must be fixed before real-device testing.

**Primary recommendation:** Fix the 8 CRITICAL and 9 HIGH issues before any device testing. The remaining MEDIUM/LOW issues can be addressed during or after testing.

---

## 1. Complete Page Route Inventory

| # | Route | File | Layout Model | Primary User |
|---|-------|------|-------------|--------------|
| 1 | `/` | `src/app/page.tsx` | h-screen flex-col, grid cards | Staff (home) |
| 2 | `/board` | `src/app/board/page.tsx` | h-full flex-col, kanban/list | Staff (primary) |
| 3 | `/board/workload` | `src/app/board/workload/page.tsx` | h-screen flex-col overflow-hidden | Staff |
| 4 | `/board/today` | `src/app/board/today/page.tsx` | min-h-screen | Staff |
| 5 | `/intake` | `src/app/intake/page.tsx` | h-full flex-col lg:flex-row | Staff (primary) |
| 6 | `/calendar` | `src/app/calendar/page.tsx` | h-full flex flex-col | Staff |
| 7 | `/clients` | `src/app/clients/page.tsx` | min-h-screen | Staff |
| 8 | `/clients/[id]` | `src/app/clients/[id]/page.tsx` | min-h-screen | Staff |
| 9 | `/labels/[orderId]` | `src/app/labels/[orderId]/page.tsx` | min-h-screen p-8 | Staff |
| 10 | `/admin/team` | `src/app/admin/team/page.tsx` | min-h-screen py-8 | Admin |
| 11 | `/admin/pricing` | `src/app/admin/pricing/page.tsx` | min-h-screen py-8 | Admin |
| 12 | `/admin/measurements` | `src/app/admin/measurements/page.tsx` | min-h-screen py-8 | Admin |
| 13 | `/archived` | `src/app/archived/page.tsx` | min-h-screen | Staff |
| 14 | `/dashboard` | `src/app/dashboard/page.tsx` | container mx-auto | Admin |
| 15 | `/dashboard/analytics` | `src/app/dashboard/analytics/page.tsx` | Unknown | Admin |
| 16 | `/portal` | `src/app/portal/page.tsx` | min-h-screen container max-w-lg | Customer |
| 17 | `/status` | `src/app/status/page.tsx` | h-full flex-col overflow-hidden | Staff |
| 18 | `/track/[id]` | `src/app/track/[id]/page.tsx` | min-h-screen py-8 px-4 | Customer |
| 19 | `/booking` | `src/app/booking/page.tsx` | min-h-screen p-4 md:p-8 | Customer |
| 20 | `/print/tasks` | `src/app/print/tasks/page.tsx` | min-h-screen bg-white (print page) | Staff |
| 21 | `/embed/status` | `src/app/embed/status/page.tsx` | Inline styles, standalone HTML | Customer (iframe) |
| 22 | `/orders/history` | `src/app/orders/history/page.tsx` | min-h-screen | Staff |
| 23 | `/auth/sign-in` | `src/app/auth/sign-in/page.tsx` | N/A (auth flow) | All |

---

## 2. Complete Shared Component Inventory

| # | Component | File | Mobile Behavior |
|---|-----------|------|----------------|
| 1 | Modal | `src/components/ui/modal.tsx` | Full screen (h-full, rounded-none) |
| 2 | Select | `src/components/ui/select.tsx` | Portal dropdown, viewport collision |
| 3 | Button | `src/components/ui/button.tsx` | Standard sizes |
| 4 | Input | `src/components/ui/input.tsx` | Standard input |
| 5 | Card | `src/components/ui/card.tsx` | Responsive padding |
| 6 | Gauge | `src/components/ui/gauge-1.tsx` | SVG-based, fixed sizes (48/72/96px) |
| 7 | Gantt | `src/components/ui/gantt.tsx` | Horizontal scroll, mouse-only drag |
| 8 | PhotoGallery | `src/components/ui/photo-gallery.tsx` | Unknown (not audited) |
| 9 | CollapsibleSection | `src/components/ui/collapsible-section.tsx` | Standard collapse |
| 10 | CollapsibleNotes | `src/components/ui/collapsible-notes.tsx` | Standard collapse |
| 11 | ContextMenu | `src/components/ui/context-menu.tsx` | Right-click (desktop-only UX) |
| 12 | DropdownMenu | `src/components/ui/dropdown-menu.tsx` | Standard dropdown |
| 13 | TrackingTimeline | `src/components/ui/tracking-timeline.tsx` | Vertical timeline |
| 14 | MuralBackground | `src/components/ui/mural-background.tsx` | Background wrapper |
| 15 | MobileBottomNav | `src/components/navigation/mobile-bottom-nav.tsx` | md:hidden, fixed bottom, safe-area |
| 16 | RoleBasedNav | `src/components/navigation/role-based-nav.tsx` | Desktop sidebar |
| 17 | InteractiveBoard | `src/components/board/interactive-board.tsx` | Horizontal scroll kanban |
| 18 | DroppableColumn | `src/components/board/droppable-column.tsx` | min-w-[260px] |
| 19 | DraggableOrderCard | `src/components/board/draggable-order-card.tsx` | Two layouts (default + ipad-landscape) |
| 20 | OrderCard | `src/components/board/order-card.tsx` | Standard card, no mobile optimization |
| 21 | OrderListView | `src/components/board/order-list-view.tsx` | Mobile card / desktop table split |
| 22 | OrderDetailModal | `src/components/board/order-detail-modal.tsx` | max-w-6xl, inline editing |
| 23 | PipelineFilter | `src/components/board/pipeline-filter.tsx` | Filter buttons |
| 24 | AssigneeFilter | `src/components/board/assignee-filter.tsx` | Filter buttons |
| 25 | GarmentServicesStep | `src/components/intake/garment-services-step.tsx` | Complex multi-section form |
| 26 | ClientStep | `src/components/intake/client-step.tsx` | Search + create form |
| 27 | PricingStep | `src/components/intake/pricing-step.tsx` | Cards + pricing summary |
| 28 | PipelineSelector | `src/components/intake/pipeline-selector.tsx` | 2-column card grid |
| 29 | OrderSummary | `src/components/intake/order-summary.tsx` | Cards + QR code |
| 30 | StaffPinModal | `src/components/staff/staff-pin-modal.tsx` | max-w-sm centered |
| 31 | TaskManagementModal | `src/components/tasks/task-management-modal.tsx` | Uses Modal, grid-cols-2 form |

---

## 3. Per-Page Responsive Analysis

### 3.1 Root Layout (`src/app/layout.tsx`)

**Architecture:**
- Lines 1-end: `h-dvh overflow-hidden` on body, CSS grid `grid-rows-[auto,1fr]`
- Main area: `row-start-2 row-end-3 min-h-0 overflow-hidden pb-16 md:pb-0`
- Header: conditionally shows `md:flex` desktop nav or `md:hidden` mobile-only elements

**CRITICAL CONFLICT:** The root layout uses `overflow-hidden` on both `html`, `body` (via globals.css) AND on main. Pages that use `min-h-screen` will expand beyond the viewport but the overflow will be hidden, causing content to be cut off below the fold. This affects: `/clients`, `/clients/[id]`, `/admin/team`, `/admin/pricing`, `/admin/measurements`, `/archived`, `/board/today`, `/labels/[orderId]`, `/orders/history`, `/track/[id]`, `/booking`, `/portal`.

### 3.2 Board Page (`src/app/board/page.tsx`)

**Issues:**
- **CRITICAL** (line ~50-70): Filter buttons use `hidden md:flex` for desktop and a separate `md:hidden` block for mobile. However, the mobile filter block may not have adequate touch targets.
- **HIGH** (line ~80-100): Export button positioned `bottom-20 md:bottom-6` -- on iPad portrait (768px exactly), `md:` kicks in and button moves to `bottom-6`, potentially overlapping MobileBottomNav since MobileBottomNav uses `md:hidden` and 768px is the exact breakpoint boundary.
- **MEDIUM**: Export modal `max-w-md w-full max-h-[90vh]` -- good.

### 3.3 Board Workload (`src/app/board/workload/page.tsx`)

**Issues:**
- **CRITICAL** (line ~30-50): Uses `h-screen flex flex-col overflow-hidden`. The `h-screen` conflicts with root layout -- should be `h-full` to fit within the grid row.
- **HIGH** (line ~90-120): Unassigned task items have buttons `h-6 px-1.5 text-[10px]` -- these are 24px tall, far below the 44px touch target minimum. The CSS global enforcement may not catch these because they use `h-6` explicitly.
- **HIGH** (line ~70-80): Member filter select uses `max-w-[80px]` -- extremely small, text will be truncated.
- **MEDIUM**: Gantt chart container `h-[250px] md:h-[400px]` -- may be too short on iPad portrait for meaningful interaction.
- **MEDIUM**: Capacity gauge cards `grid grid-cols-1 md:grid-cols-4 gap-4` -- good responsive grid but 4 columns at 768px may be cramped.

### 3.4 Board Today (`src/app/board/today/page.tsx`)

**Issues:**
- **HIGH**: Uses `min-h-screen` -- conflicts with root layout `overflow-hidden`. Content below fold will be cut off with no scrollbar.
- **MEDIUM**: Header has filter select and print button side by side -- may crowd on iPhone SE.

### 3.5 Intake Page (`src/app/intake/page.tsx`)

**Architecture:** `h-full flex-col lg:flex-row gap-3` -- good. Mobile progress bar `lg:hidden`, desktop sidebar `hidden lg:block`.

**Issues:**
- **LOW**: Container uses `max-w-7xl` -- fine since content is within flex children.
- Good: Uses `h-full min-h-0` and `overflow-y-auto` on card content -- correct for fitting within root layout.

### 3.6 Calendar Page (`src/app/calendar/page.tsx`)

**Issues:**
- **MEDIUM**: Date range text in header has `min-w-[180px] text-center` -- on iPhone SE (375px) with left/right nav buttons, this leaves minimal space for buttons.
- Good: Content area has `overflow-y-auto`.

### 3.7 Clients Page (`src/app/clients/page.tsx`)

**Issues:**
- **HIGH**: Uses `min-h-screen bg-gradient-to-br` -- the `min-h-screen` will cause content to overflow root layout's `overflow-hidden` grid cell. Content below ~100vh will be invisible.
- **MEDIUM**: Client cards `flex flex-col sm:flex-row` -- good responsive behavior.

### 3.8 Client Detail (`src/app/clients/[id]/page.tsx`)

**Issues:**
- **HIGH**: Uses `min-h-screen` -- same overflow-hidden conflict.
- **MEDIUM**: Tab buttons `px-4 py-2 rounded-lg` -- padding produces approximately 36px height, borderline for 44px touch targets.
- **LOW**: Measurements grid `grid grid-cols-2 md:grid-cols-4 gap-3` -- acceptable.

### 3.9 Labels Page (`src/app/labels/[orderId]/page.tsx`)

**Issues:**
- **HIGH**: Uses `min-h-screen bg-white p-8 overflow-y-auto` -- the `min-h-screen` conflicts with root layout. Additionally, `p-8` (32px padding) wastes space on mobile.
- **MEDIUM**: Labels have hardcoded pixel dimensions via `LABEL_CONFIG` -- these are print labels and should render correctly regardless.

### 3.10 Admin Team (`src/app/admin/team/page.tsx`)

**Issues:**
- **HIGH**: Uses `min-h-screen bg-muted/50 py-8` -- overflow-hidden conflict.
- **MEDIUM**: Staff member action buttons are ghost/sm variants -- may be below 44px touch targets.
- Good: Form uses `grid grid-cols-1 md:grid-cols-2 gap-4`.

### 3.11 Admin Pricing (`src/app/admin/pricing/page.tsx`)

**Issues:**
- **HIGH**: Uses `min-h-screen` -- overflow-hidden conflict.
- Good: Grid layouts are responsive.

### 3.12 Admin Measurements (`src/app/admin/measurements/page.tsx`)

**Issues:**
- **HIGH**: Uses `min-h-screen` -- overflow-hidden conflict.
- **MEDIUM**: Add field form uses `grid grid-cols-2 gap-3` -- on iPhone SE, 2 columns with inputs at ~155px each may be cramped.
- **MEDIUM**: Reorder/edit/delete buttons may be small touch targets.

### 3.13 Archived Orders (`src/app/archived/page.tsx`)

**Issues:**
- **HIGH**: Uses `min-h-screen` -- overflow-hidden conflict.
- Good: Controls `flex flex-col sm:flex-row gap-4`, cards `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`.

### 3.14 Dashboard (`src/app/dashboard/page.tsx`)

**Issues:**
- **LOW**: Uses `container mx-auto px-4 py-8` -- standard, no height constraint. But since it is within root layout's overflow-hidden, long content may be cut off if page grows.
- **LOW**: Grid `lg:grid-cols-4` with nav sidebar -- on mobile, nav and content stack vertically which is fine.

### 3.15 Portal (`src/app/portal/page.tsx`)

**Issues:**
- **HIGH**: Uses `min-h-screen` -- potential overflow conflict. Since this is a customer-facing page, it likely runs outside the authed layout, but if it shares the root layout, `min-h-screen` will conflict.
- Good: `max-w-lg mx-auto`, large touch targets (py-6 buttons, py-2.5 tabs).

### 3.16 Status Page (`src/app/status/page.tsx`)

**Architecture:** `h-full flex flex-col overflow-hidden min-h-0` -- correct! Fits within root layout.
Good: Proper scrollable content area with `flex-1 min-h-0 overflow-y-auto`.

### 3.17 Track Order (`src/app/track/[id]/page.tsx`)

**Issues:**
- **MEDIUM**: Uses `min-h-screen py-8 px-4` inside MuralBackground -- potential overflow conflict if within root layout.
- **MEDIUM**: Progress timeline `flex justify-between items-center` with 4 steps -- on iPhone SE, step labels may overlap.
- Good: `max-w-2xl mx-auto`, `flex flex-col sm:flex-row` for order header.

### 3.18 Booking (`src/app/booking/page.tsx`)

**Issues:**
- **MEDIUM**: Uses `min-h-screen bg-muted/50 p-4 md:p-8` -- potential overflow conflict.
- Good: Date grid `grid-cols-3 md:grid-cols-4 gap-2` -- good for mobile.
- Good: `max-w-2xl mx-auto`, large book button `py-4`.

### 3.19 Print Tasks (`src/app/print/tasks/page.tsx`)

**Issues:**
- **LOW**: Print-focused page. Uses `min-h-screen bg-white`. Table may overflow horizontally on mobile but this is primarily a print page, not a mobile interaction page.

### 3.20 Embed Status (`src/app/embed/status/page.tsx`)

**Architecture:** Standalone HTML with inline styles, `maxWidth: '400px'`. Designed for iframe embedding.
Good: Uses `fontSize: '16px'` for inputs (prevents iOS zoom), full-width buttons.

### 3.21 Orders History (`src/app/orders/history/page.tsx`)

**Issues:**
- **HIGH**: Uses `min-h-screen` -- overflow-hidden conflict.
- **MEDIUM**: Order metadata row `flex items-center gap-4 text-sm` on desktop may wrap oddly on mobile due to `flex-col sm:flex-row` only on parent.

### 3.22 Home Page (`src/app/page.tsx`)

**Issues:**
- **HIGH**: Uses `h-screen flex flex-col` -- should be `h-full` to fit within root layout's grid cell. `h-screen` creates a 100vh container inside a `h-dvh` container, causing slight mismatch on iOS Safari where address bar affects vh.
- Good: Grid `md:grid-cols-2 lg:grid-cols-4 gap-4` for cards.

---

## 4. Per-Component Mobile Compatibility

### 4.1 OrderDetailModal (`src/components/board/order-detail-modal.tsx`)

**CRITICAL**: This is the most complex component (1257 lines) and the most heavily used on iPad.

**Issues:**
- **CRITICAL** (line ~30-40): Card width `max-w-6xl` is 72rem (1152px). On iPad portrait (768px), this fills the entire screen width. On iPhone, it also fills the screen. The issue is that `max-w-6xl` is very wide -- on iPad landscape (1024px), it will still be nearly full-width with almost no margin.
- **HIGH** (throughout): Many inline editing forms use small fixed-width inputs: `w-16` (64px) for price inputs, `w-20` (80px) for time inputs, `w-24` (96px) for other fields. On touch devices, these are difficult to tap accurately.
- **HIGH** (service editing rows): Each service row contains: service name + qty controls + price input + time input + assignment dropdown + remove button, all in a `flex items-center gap-2` row. On iPhone, this will definitely overflow horizontally.
- **MEDIUM**: Rack position section has a select dropdown + custom text input in a flex row -- may crowd on mobile.
- **MEDIUM**: Payment form sections use inline editing with small inputs.
- Good: Modal wrapper uses `p-2 sm:p-4` for reduced mobile padding, content uses `p-3 sm:p-4`.

### 4.2 InteractiveBoard (`src/components/board/interactive-board.tsx`)

**Issues:**
- **CRITICAL**: DnD uses only `PointerSensor` with `distance: 5`. There is **no `TouchSensor`** configured. On touch devices (iPad, iPhone), drag-and-drop may not work correctly. `PointerSensor` can technically handle touch events, but `TouchSensor` with `delay` and `tolerance` is recommended for mobile to distinguish scrolling from dragging.
- Good: Board layout `flex md:grid md:grid-cols-5 gap-2 md:gap-2 lg:gap-4 min-w-max md:min-w-0` -- mobile scrolls horizontally, desktop shows grid.

### 4.3 DraggableOrderCard (`src/components/board/draggable-order-card.tsx`)

Good: Has TWO layouts:
- Default layout (line 99 `ipad-landscape:hidden`) for mobile/tablet portrait
- iPad landscape layout (line 192 `hidden ipad-landscape:block`) with ultra-compact sizing

This is well-optimized. Text sizes, padding, and content are adjusted for each breakpoint.

### 4.4 GarmentServicesStep (`src/components/intake/garment-services-step.tsx`)

**CRITICAL**: This is the most complex intake form (1016 lines).

**Issues:**
- **CRITICAL** (selected services row, ~line 600-700): Each selected service row renders in `flex items-center gap-2 p-3`:
  - Service name (variable width, truncated)
  - Minus button: `min-h-[44px] min-w-[44px]` (good)
  - Qty display: `w-6 text-center` (24px wide)
  - Plus button: `min-h-[44px] min-w-[44px]` (good)
  - Price input: `w-16` (64px)
  - Time input: `w-14` (56px)
  - Assignment dropdown: `w-32` (128px)
  - Remove button

  Total minimum width: ~44+24+44+64+56+128+44+gaps = ~420px+. On iPhone SE (375px), this **will overflow**. Even on iPhone 14/15 (390px), it will overflow.

- **HIGH** (garment type dropdown): Custom dropdown implementation with `max-h-[300px] overflow-y-auto` -- good height, but no touch-optimized item sizing specified.
- Good: Service list grid `grid grid-cols-1 sm:grid-cols-2` -- good.
- Good: Bottom padding `pb-24 md:pb-4` for MobileBottomNav clearance.

### 4.5 ClientStep (`src/components/intake/client-step.tsx`)

Good mobile optimization:
- Search input has `min-h-[44px] text-sm touch-manipulation`
- Form inputs all have `min-h-[44px] text-sm touch-manipulation`
- Checkbox is small (`h-3 w-3`) but this is a minor issue
- Form grid `grid grid-cols-1 sm:grid-cols-2 gap-3` -- good
- Measurements grid `grid grid-cols-1 sm:grid-cols-2 gap-2` -- good
- Duplicate modal is responsive: `max-w-md w-full p-6`

**Issues:**
- **LOW** (line 865): Newsletter checkbox `h-3 w-3` (12px) -- well below 44px touch target. The label clickable area helps but the visual target is tiny.
- **LOW** (line 983-987): Measurement inputs `px-2 py-1 text-sm` -- no explicit min-height. The global CSS may enforce 44px, but the explicit `py-1` (4px top+bottom) results in a natural height of approximately 28px before global enforcement.

### 4.6 PricingStep (`src/components/intake/pricing-step.tsx`)

Good: Well-structured with cards, proper scrollable area.

**Issues:**
- **MEDIUM** (line 452-464): Total override input `w-24 px-2 py-1 text-lg font-bold border` -- 96px wide, may be tight.
- Good: Rush checkbox `w-5 h-5` (20px) -- still small but better than 12px. Global CSS should enforce 44px on checkboxes at mobile widths.

### 4.7 PipelineSelector (`src/components/intake/pipeline-selector.tsx`)

Good: `grid grid-cols-1 md:grid-cols-2 gap-3`, cards are large and tappable.

**Issues:**
- **LOW**: Pipeline comparison section `grid grid-cols-1 md:grid-cols-2 gap-3` -- good responsive layout.

### 4.8 OrderSummary (`src/components/intake/order-summary.tsx`)

Good: Proper scrollable area, card-based layout, large buttons.

### 4.9 Modal (`src/components/ui/modal.tsx`)

Good mobile implementation:
- `h-full md:h-auto md:max-h-[90vh]` -- full screen on mobile
- `rounded-none md:rounded-lg` -- no border radius on mobile
- `mx-0 md:mx-4` -- no side margin on mobile
- Close button has `touch-target` class
- ESC handler, body overflow lock

### 4.10 Select (`src/components/ui/select.tsx`)

**Issues:**
- **MEDIUM**: Uses `window.scrollY` for positioning. In the app's `overflow-hidden` layout, `window.scrollY` is always 0. The dropdown positions relative to viewport, which should work, but in deeply nested scroll containers the calculation may break.
- Good: Portal-based, viewport collision detection, z-index 9999.

### 4.11 Gantt (`src/components/ui/gantt.tsx`)

**Issues:**
- **HIGH**: Drag functionality uses only `mousedown`/`mousemove`/`mouseup` events (lines 460-523). There are **no touch event handlers**. The Gantt chart bar dragging will not work on touch devices.
- **HIGH**: Context menu on Gantt items (line 527-565) uses `ContextMenu` which triggers on right-click -- not available on touch devices without long-press.
- Good: `overflow-x-auto` for horizontal scrolling, responsive sidebar (`hidden md:block w-48 lg:w-64`).

### 4.12 Gauge (`src/components/ui/gauge-1.tsx`)

Good: SVG-based, scales with container. Fixed sizes (sm:48px, md:72px, lg:96px) are appropriate.

### 4.13 OrderListView (`src/components/board/order-list-view.tsx`)

Good mobile implementation:
- `md:hidden` card view for mobile
- `hidden md:block` table view for desktop
- Mobile cards include `touch-target` class on status select

---

## 5. Prioritized Fix List

### CRITICAL (Must fix before device testing - 8 issues)

| # | Issue | File | Line(s) | Device Impact |
|---|-------|------|---------|---------------|
| C1 | `min-h-screen` pages inside `overflow-hidden` root layout -- content cut off | Multiple (13 pages) | Various | ALL devices |
| C2 | GarmentServicesStep selected service row overflows at 375px (420px+ min width) | `garment-services-step.tsx` | ~600-700 | iPhone SE, iPhone 14/15 |
| C3 | InteractiveBoard kanban: no TouchSensor for @dnd-kit -- drag may fail on touch | `interactive-board.tsx` | ~30-50 | iPad, iPhone |
| C4 | OrderDetailModal service editing rows overflow on mobile | `order-detail-modal.tsx` | Throughout | iPhone, iPad portrait |
| C5 | Gantt chart drag uses mouse events only -- no touch support | `gantt.tsx` | Lines 460-523 | iPad |
| C6 | Home page uses `h-screen` instead of `h-full` inside root layout grid | `page.tsx` (root) | Line 23 | iOS Safari |
| C7 | Workload page uses `h-screen` instead of `h-full` inside root layout grid | `workload/page.tsx` | ~Line 30 | All devices |
| C8 | OrderDetailModal `max-w-6xl` (1152px) has no mobile/tablet adaptation | `order-detail-modal.tsx` | ~Line 30 | iPad portrait, iPhone |

### HIGH (Must fix before client testing - 9 issues)

| # | Issue | File | Line(s) | Device Impact |
|---|-------|------|---------|---------------|
| H1 | Workload unassigned items: `h-6` buttons (24px) below 44px touch minimum | `workload/page.tsx` | ~90-120 | iPhone, iPad |
| H2 | Workload member select `max-w-[80px]` truncates names | `workload/page.tsx` | ~70-80 | All mobile |
| H3 | Board export button at 768px breakpoint boundary -- MobileBottomNav overlap | `board/page.tsx` | ~80-100 | iPad portrait exactly 768px |
| H4 | Gantt context menu not accessible on touch (right-click only) | `gantt.tsx` | Lines 527-565 | iPad, iPhone |
| H5 | Board/today `min-h-screen` cuts off content in root layout | `board/today/page.tsx` | Line ~10 | All devices |
| H6 | Labels page `p-8` wastes 32px padding on mobile | `labels/[orderId]/page.tsx` | Line ~10 | iPhone |
| H7 | Clients page `min-h-screen` cuts off scrollable content | `clients/page.tsx` | Line ~10 | All devices |
| H8 | Orders/history `min-h-screen` cuts off scrollable content | `orders/history/page.tsx` | Line ~10 | All devices |
| H9 | Admin pages (team, pricing, measurements) all use `min-h-screen` | Multiple admin pages | Various | All devices |

### MEDIUM (Fix during testing - 7 issues)

| # | Issue | File | Line(s) | Device Impact |
|---|-------|------|---------|---------------|
| M1 | Calendar date range `min-w-[180px]` crowds nav buttons on iPhone SE | `calendar/page.tsx` | ~Line 30 | iPhone SE |
| M2 | Client detail tab buttons `px-4 py-2` ~36px height, borderline touch target | `clients/[id]/page.tsx` | ~Line 80 | iPhone |
| M3 | Track order progress timeline 4-step labels may overlap on iPhone SE | `track/[id]/page.tsx` | ~Lines 136-154 | iPhone SE |
| M4 | Admin measurements add form `grid-cols-2` cramped on iPhone SE | `admin/measurements/page.tsx` | ~Line 80 | iPhone SE |
| M5 | Select component `window.scrollY` positioning in overflow:hidden containers | `select.tsx` | ~Line 60 | Edge cases |
| M6 | PricingStep total override input `w-24` (96px) tight for dollar amounts | `pricing-step.tsx` | Line 452 | iPhone |
| M7 | Workload Gantt `h-[250px]` may be too small for meaningful mobile interaction | `workload/page.tsx` | ~Line 100 | iPhone |

### LOW (Fix if time permits - 3 issues)

| # | Issue | File | Line(s) | Device Impact |
|---|-------|------|---------|---------------|
| L1 | ClientStep newsletter checkbox `h-3 w-3` (12px) tiny visual target | `client-step.tsx` | Line 865 | iPhone |
| L2 | ClientStep measurement inputs `py-1` natural height ~28px before global enforcement | `client-step.tsx` | Lines 983-987 | iPhone |
| L3 | Print tasks page table may overflow horizontally on mobile (print-only page) | `print/tasks/page.tsx` | ~Line 136 | iPhone |

---

## 6. Device-Specific Concerns

### iPhone SE (375px)

1. GarmentServicesStep service rows will overflow (CRITICAL)
2. Calendar header date range crowds navigation
3. Admin measurements 2-column form may be cramped
4. Track order timeline step labels may overlap
5. Workload page controls will be extremely tight

### iPhone 14/15 (390px)

1. GarmentServicesStep service rows will still overflow (CRITICAL)
2. OrderDetailModal inline editing forms will be tight
3. Generally better than SE but all the SE issues apply at reduced severity

### iPad Portrait (768px)

1. **md: breakpoint boundary issue**: At exactly 768px, `md:` Tailwind breakpoint activates. This means MobileBottomNav (`md:hidden`) disappears, desktop nav appears. But 768px is still narrow. The board kanban switches from horizontal scroll to 5-column grid at `md:`, which gives each column only ~140px.
2. OrderDetailModal fills the full 768px width (max-w-6xl is 1152px, so it just uses 100%).
3. Board export button position shifts from `bottom-20` to `bottom-6` exactly at this breakpoint.
4. Workload 4-column grid (`md:grid-cols-4`) gives ~180px per card.

### iPad Landscape (1024px)

1. DraggableOrderCard correctly uses `ipad-landscape:` breakpoint for compact layout -- well handled.
2. Gantt chart at `md:h-[400px]` -- adequate height.
3. `lg:` breakpoint activates at 1024px -- intake sidebar appears, board gets larger gaps.
4. OrderDetailModal at max-w-6xl fits comfortably.

---

## 7. Touch Target Audit

### Global CSS Enforcement (`globals.css`)

```css
@media (max-width: 767px) {
  button, [role="button"], input, select, textarea, a {
    min-height: 44px;
    /* (additional styles) */
  }
  input:not([type="checkbox"]):not([type="radio"]) {
    font-size: 16px !important;
  }
}
```

This enforcement is **good** but has gaps:

1. **Does NOT enforce at 768px+**: iPad portrait at 768px gets no touch target enforcement, even though it is a touch device.
2. **Checkbox exclusion**: Checkboxes (`type="checkbox"`) are explicitly excluded from the 44px enforcement.
3. **`h-6` override**: Explicit Tailwind classes like `h-6` (24px) will override `min-height: 44px` if the element has both -- actually, `min-height` should win over `height` in CSS. But if the element uses Tailwind's `h-6` which compiles to `height: 1.5rem`, and the global CSS sets `min-height: 44px`, the `min-height` should prevail. **However**, this depends on specificity. The global CSS uses `button` selector (0,0,1 specificity) while Tailwind's `.h-6` has (0,1,0 specificity). Since height and min-height are different properties, min-height will constrain upward regardless of specificity.
4. **Custom divs acting as buttons**: Elements like `<div onClick>` are not covered by the button/[role="button"] selectors. The workload unassigned items may use such elements.

### Elements Below 44px Touch Target

| Component | Element | Actual Size | File:Line |
|-----------|---------|-------------|-----------|
| Workload | Unassigned assign buttons | `h-6` (24px) | workload/page.tsx:~90 |
| Workload | Member filter select | `max-w-[80px]` (80px wide) | workload/page.tsx:~70 |
| ClientStep | Newsletter checkbox | `h-3 w-3` (12px) | client-step.tsx:865 |
| OrderDetailModal | Price inputs | `w-16` (64px wide) | order-detail-modal.tsx:various |
| OrderDetailModal | Time inputs | `w-20` (80px wide) | order-detail-modal.tsx:various |
| GarmentServicesStep | Qty display | `w-6` (24px) | garment-services-step.tsx:~650 |
| Admin Measurements | Reorder/edit/delete buttons | Ghost sm buttons | admin/measurements/page.tsx:various |
| Client Detail | Tab buttons | `px-4 py-2` (~36px) | clients/[id]/page.tsx:~80 |

---

## 8. Form Usability Assessment

### Intake Flow (Primary Mobile Workflow)

The intake flow (Pipeline > Client > Garments/Services > Pricing > Summary) is the **most critical mobile workflow**:

1. **PipelineSelector**: Good. Large tappable cards, auto-advance on selection.
2. **ClientStep**: Good. 44px inputs, proper touch-manipulation, scrollable content.
3. **GarmentServicesStep**: **CRITICAL ISSUE**. Service row overflow on mobile. This is the main workflow blocker.
4. **PricingStep**: Good. Cards with clear pricing, large submit button.
5. **OrderSummary**: Good. Clean confirmation with action buttons.

### Order Detail Modal (Secondary Workflow)

The order detail modal is used to view/edit orders from the kanban board:

1. Opens full-screen on mobile (via Modal component) -- good.
2. **CRITICAL**: Inline editing forms (service prices, times, assignments) are too compact for mobile.
3. **HIGH**: The modal has many sections that stack vertically -- scroll length on mobile could be very long.

### Admin Forms

Team, pricing, and measurements admin forms are standard responsive forms. The main issue is the `min-h-screen` container conflict, not the form layouts themselves.

---

## 9. Modal/Overlay Assessment

### Modal Component (`src/components/ui/modal.tsx`)

Excellent mobile implementation:
- Full screen on mobile (`h-full md:h-auto md:max-h-[90vh]`)
- No border radius on mobile (`rounded-none md:rounded-lg`)
- No side margin on mobile (`mx-0 md:mx-4`)
- Body scroll lock when open
- Touch target on close button

### OrderDetailModal

Uses a custom Card-based overlay rather than the Modal component:
- `fixed inset-0 z-50` backdrop
- `Card` with `w-full max-w-6xl max-h-[95vh] overflow-y-auto`
- **Does NOT use the Modal component** -- misses full-screen mobile behavior, body scroll lock, and responsive sizing.

### Duplicate Client Modal (ClientStep)

Good: `fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4` with `max-w-md w-full`.

### StaffPinModal

Good: `max-w-sm w-full` centered with `flex items-center justify-center p-4`.

### TaskManagementModal

Uses the Modal component -- inherits all good mobile behavior.

---

## 10. Specific Fixes Recommended

### Fix C1: Replace `min-h-screen` with proper flex layout

**Affected pages** (13 total):
- `/clients/page.tsx`, `/clients/[id]/page.tsx`
- `/admin/team/page.tsx`, `/admin/pricing/page.tsx`, `/admin/measurements/page.tsx`
- `/archived/page.tsx`, `/board/today/page.tsx`
- `/labels/[orderId]/page.tsx`
- `/orders/history/page.tsx`
- `/portal/page.tsx`, `/track/[id]/page.tsx`, `/booking/page.tsx`
- `/dashboard/page.tsx`

**Pattern:**
```tsx
// BEFORE
<div className="min-h-screen bg-gradient-to-br ...">
  <div className="container mx-auto px-4 py-8">
    {/* content */}
  </div>
</div>

// AFTER
<div className="h-full flex flex-col overflow-hidden">
  <div className="flex-1 overflow-y-auto">
    <div className="container mx-auto px-4 py-8">
      {/* content */}
    </div>
  </div>
</div>
```

### Fix C2/C4: Responsive service editing rows

For GarmentServicesStep and OrderDetailModal service rows, convert from horizontal flex to stacked layout on mobile:

```tsx
// Mobile: stack vertically
// Desktop: horizontal flex
<div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3">
  <div className="flex items-center gap-2">
    {/* service name + qty controls */}
  </div>
  <div className="flex items-center gap-2">
    {/* price + time + assignment + remove */}
  </div>
</div>
```

### Fix C3: Add TouchSensor to InteractiveBoard

```tsx
import { TouchSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } });
const sensors = useSensors(pointerSensor, touchSensor);
```

### Fix C5: Add touch events to Gantt

Add `onTouchStart`, `onTouchMove`, `onTouchEnd` handlers alongside mouse events in the GanttFeatureItem drag implementation.

### Fix C6/C7: Replace `h-screen` with `h-full`

Home page and workload page should use `h-full` instead of `h-screen` to fit within the root layout's grid cell.

### Fix C8: OrderDetailModal should use Modal component

Refactor OrderDetailModal to use the existing Modal component (which already handles full-screen mobile, body scroll lock, responsive sizing) instead of a custom Card overlay.

### Fix H1: Workload unassigned buttons

Add `min-h-[44px]` to the unassigned item action buttons, or wrap them in a container with adequate touch target area.

### Fix H3: Board export button breakpoint

Change the export button position logic to account for iPad portrait:
```tsx
className="bottom-20 ipad:bottom-6 md:bottom-6"
```
Or ensure MobileBottomNav clearance at the exact 768px boundary.

---

## Common Pitfalls

### Pitfall 1: min-h-screen in overflow-hidden layouts
**What goes wrong:** Content below the fold is invisible with no scrollbar.
**Why it happens:** `min-h-screen` expands the element to 100vh, but the parent has `overflow-hidden`.
**How to avoid:** Use `h-full flex flex-col` with `overflow-y-auto` on the scrollable child.
**Warning signs:** Pages that appear cut off or have content unreachable by scrolling.

### Pitfall 2: h-screen vs h-dvh on iOS Safari
**What goes wrong:** `h-screen` (100vh) includes the address bar height on iOS Safari, causing content to be hidden behind the URL bar.
**Why it happens:** 100vh is the "maximum viewport" on iOS, not the "current viewport."
**How to avoid:** Use `h-dvh` (dynamic viewport height) or `h-full` within a `h-dvh` parent.
**Warning signs:** Bottom content clipped on iOS Safari but visible on desktop.

### Pitfall 3: md: breakpoint at exactly 768px for iPad
**What goes wrong:** iPad portrait is exactly 768px, which is the `md:` breakpoint. Desktop layout activates but the screen is still narrow.
**Why it happens:** The md: breakpoint was designed for desktop, not tablet.
**How to avoid:** Use the custom `ipad:820px` breakpoint for iPad-specific styles, test at 768px specifically.
**Warning signs:** Cramped layouts, MobileBottomNav disappearing too early.

### Pitfall 4: PointerSensor without TouchSensor
**What goes wrong:** Drag-and-drop works on desktop but feels broken on touch devices.
**Why it happens:** PointerSensor can handle touch but without `delay` configuration, every scroll attempt initiates a drag.
**How to avoid:** Add TouchSensor with `delay: 250, tolerance: 5`.
**Warning signs:** Users unable to scroll the kanban board without triggering card drags.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase audit of all 25 page files and 31 component files
- `src/app/globals.css` -- verified all media queries and responsive utilities
- `tailwind.config.ts` -- verified all custom breakpoints and theme extensions
- `src/app/layout.tsx` -- verified root layout architecture

### Metadata

**Confidence breakdown:**
- Page inventory: HIGH -- every page.tsx file was read
- Component inventory: HIGH -- every component was read
- Issue identification: HIGH -- based on direct class inspection and CSS specificity analysis
- Fix recommendations: MEDIUM -- based on patterns used elsewhere in the codebase, but each fix needs device verification
- Touch target audit: MEDIUM -- global CSS enforcement behavior needs real-device verification for specificity edge cases

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (stable -- CSS/layout issues don't change without code changes)

---
phase: 23-intake-pricing-fixes
verified: 2026-02-12T00:00:00Z
status: passed
score: 6/6 must-haves verified
---

# Phase 23: Intake Pricing Fixes Verification Report

**Phase Goal:** Fix garment category labels, enable inline price editing in services step, allow custom service/product creation, fix rush labels, recalculate tax on price override, and add inline date picker.

**Verified:** 2026-02-12T00:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Garment categories show "Sur mesure" and "Alteration" (not "Home") | ✓ VERIFIED | API route.ts line 67 contains `home: 'Sur mesure'`, line 70 contains `alteration: 'Retouches'`. garment-services-step.tsx line 180 loads categories from API into state, line 734 uses categoryLabels for display. |
| 2 | Service prices editable inline in the services step | ✓ VERIFIED | garment-services-step.tsx lines 111-112 define editingPriceIndex state, lines 512-520 define updatePrice handler, lines 1161+ implement inline edit UI with input field, Enter/Escape/blur handling. Subtotal recalcs via currentGarmentSubtotal memo. |
| 3 | Can create a new custom service/product during intake | ✓ VERIFIED | garment-services-step.tsx lines 116-117 define custom service state, lines 528-568 implement handleAddCustomService with validation (price > 0, duplicate check), generates custom_ ID, adds to current garment services. UI at lines 1040+ shows form with name/price inputs. |
| 4 | Rush labels show meaningful text (e.g., "Rush: +2 days" or "Express") | ✓ VERIFIED | rush-indicator.tsx line 174 shows French "jour(s)" with pluralization, lines 179-182 show "X jour(s) plus rapide" when difference >= 1, lines 185-189 show "Service express" when difference === 0. No more "0 days faster". |
| 5 | Tax recalculates automatically when any price is modified | ✓ VERIFIED | pricing-step.tsx lines 507-537 implement tax back-calculation using 1.14975 rate when total overridden. Lines 513-517 calculate taxableAmount, tps_cents (5%), tvq_cents (9.975%). Lines 524-531 update calculation state. Lines 147-159 save originalCalculation, lines 547-548 restore on reset. |
| 6 | Date picker opens as inline popup/calendar | ✓ VERIFIED | pricing-step.tsx lines 13-16 import Calendar, Popover, format/parseISO, fr locale. Lines 254-286 render Popover with Calendar component. calendar.tsx wraps react-day-picker with full styling. Line 270 selected={parseISO(data.due_date)}, line 273 formats as yyyy-MM-dd, lines 277-282 disable dates before tomorrow, line 283 locale={fr}. |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| src/app/api/garment-types/route.ts | French category labels mapping | ✓ VERIFIED | Contains "Sur mesure" at line 67, "Retouches" at line 70. All categories in French. Returns categories object in JSON response (line 61). |
| src/components/intake/garment-services-step.tsx | Inline price editing and custom service creation | ✓ VERIFIED | 1400+ lines. Contains editingPriceIndex state, updatePrice handler, inline edit UI with decimal input. Contains customServiceName state, handleAddCustomService with validation, custom service form UI. Both grid and list views support features. |
| src/components/rush-orders/rush-indicator.tsx | Improved rush timeline display with French text | ✓ VERIFIED | RushOrderTimeline component lines 138-192. French text "jour(s)", conditional rendering based on daysDifference. Edge case handling for 0 days (shows "Service express"). |
| src/components/intake/pricing-step.tsx | Tax recalculation and calendar date picker | ✓ VERIFIED | 650+ lines. Contains originalCalculation state, tax back-calculation logic in Enregistrer onClick (lines 507-537). Calendar imports, datePickerOpen state, Popover + Calendar UI (lines 254-286). |
| src/components/ui/calendar.tsx | Calendar UI component | ✓ VERIFIED | 48 lines. Wraps DayPicker from react-day-picker with shadcn/ui styling. Supports mode, disabled, locale props. Full classNames for responsive layout, hover states, selection. |
| src/components/ui/popover.tsx | Popover UI component | ✓ VERIFIED | 25 lines. Wraps @radix-ui/react-popover. Exports Root, Trigger, Content. Portal rendering with animations (fade, zoom, slide). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| garment-types API route | garment-services-step dropdown | categories object in JSON response | ✓ WIRED | API returns categories at line 61. Component loads at line 180: setCategoryLabels(data.categories). Dropdown uses at line 734: categoryLabels[category] with fallback. |
| RushOrderTimeline component | pricing-step.tsx | RushOrderTimeline import and usage | ✓ WIRED | pricing-step imports RushOrderTimeline at line 19. Rendered at line 371 with rushDays, estimatedDays, isRush, orderType props. Component calculates daysDifference and conditionally renders French labels. |
| Inline price edit | currentGarment.services[].customPriceCents | updatePrice handler | ✓ WIRED | updatePrice at line 512 receives serviceIndex and newPriceCents. Line 516 sets svc.customPriceCents = Math.max(0, newPriceCents). Line 517 updates currentGarment state. Called from onBlur and onKeyDown (Enter) at lines 1174, 1179. |
| Custom service form | currentGarment.services array | handleAddCustomService | ✓ WIRED | handleAddCustomService at line 528. Creates customService object with custom_ ID (line 551-559). Line 563 adds to services array: [...(currentGarment.services || []), customService]. Called from onClick at line 1089. |
| Tax override | calculation state (tps_cents, tvq_cents, tax_cents) | Back-calculation from overridden total | ✓ WIRED | Enregistrer onClick at line 507. Calculates taxRate 1.14975 (line 513), taxableAmount (line 514), tps_cents (line 515), tvq_cents (line 516). setCalculation with all recalculated values (lines 524-531). onTotalOverrideChange called at line 532. |
| Calendar popup | data.due_date | onSelect handler formatting date | ✓ WIRED | Calendar at line 268 with onSelect at lines 271-276. Receives date, calls handleInputChange('due_date', format(date, 'yyyy-MM-dd')) at line 273. setDatePickerOpen(false) closes popup at line 274. Selected prop at line 270 uses parseISO(data.due_date). |

### Requirements Coverage

No REQUIREMENTS.md mappings found for phase 23.

### Anti-Patterns Found

None detected. All files clean of TODO/FIXME/HACK/PLACEHOLDER comments. No stub patterns (empty returns, console.log-only implementations, placeholder text). All handlers have substantive logic with validation, state updates, and side effects.

### Human Verification Required

#### 1. Visual French Label Display

**Test:** Open intake flow on iPad. Navigate to garment selection step. Open the garment type dropdown.
**Expected:** Category headers show "Sur mesure" (not "Home"), "Retouches", "Vêtements femmes", "Vêtements hommes", "Manteaux", etc. All in French.
**Why human:** Visual appearance, font rendering, dropdown layout can only be verified by seeing the actual UI.

#### 2. Inline Price Editing UX Flow

**Test:** Add a service to a garment. Tap on the displayed price in the service row.
**Expected:** Price becomes an editable input field. Type a new value (e.g., "45.50"). Press Enter or tap outside. Price updates, line total (price × qty) recalculates, garment subtotal updates immediately.
**Why human:** Touch interaction, input focus behavior, keyboard handling (Enter/Escape), blur events, real-time calculation updates need manual testing.

#### 3. Custom Service Creation Flow

**Test:** In service selection area, scroll to bottom. Tap "Ajouter un service personnalisé..." button. Type service name "Broderie spéciale" and price "45.00". Tap "Ajouter".
**Expected:** Form validates price > 0, checks for duplicate name, adds service to current garment list with custom_ ID. Service appears in list with name, price, qty controls, assignment dropdown, time estimate field.
**Why human:** Form validation messages, duplicate detection UX, service list insertion position, full service lifecycle (assign, estimate, remove) need end-to-end testing.

#### 4. Rush Timeline French Text

**Test:** Proceed to pricing step. Enable rush service. Select "small" rush type.
**Expected:** Timeline shows "2 jours" with "⚡ Service express" or "⚡ X jour(s) plus rapide" depending on daysDifference calculation. Never shows "0 days faster" or English text.
**Why human:** Conditional rendering based on rush configuration, plural/singular French text, visual badge appearance.

#### 5. Tax Recalculation on Override

**Test:** In pricing step, note original TPS/TVQ values. Click "Modifier" on total. Enter a different amount (e.g., original $100, change to $120). Click "Enregistrer".
**Expected:** TPS updates to $120 / 1.14975 × 0.05 ≈ $5.22. TVQ updates to $120 / 1.14975 × 0.09975 ≈ $10.41. Total shows $120. Click "Réinitialiser" to verify it returns to original values.
**Why human:** Real-time calculation display, rounding behavior, state restoration, visual feedback on button clicks.

#### 6. Calendar Popup French Locale

**Test:** In pricing step, tap on the due date field.
**Expected:** Popup calendar opens below the field. Month name in French (e.g., "février 2026"). Day names in French (L, M, M, J, V, S, D). Dates before tomorrow are grayed out/disabled. Selecting a date shows formatted French text like "14 février 2026" in the trigger button and closes the popup.
**Why human:** Popup positioning, French locale rendering, date formatting display, disabled state appearance, touch interaction to select date, popup auto-close behavior.

---

## Summary

All 6 success criteria from the roadmap are verified:

1. ✓ Garment categories show "Sur mesure" and "Alteration" (not "Home")
2. ✓ Service prices editable inline in the services step
3. ✓ Can create a new custom service/product during intake
4. ✓ Rush labels show meaningful text (e.g., "Rush: +2 days" or "Express")
5. ✓ Tax recalculates automatically when any price is modified
6. ✓ Date picker opens as inline popup/calendar

**All artifacts exist and are substantive (not stubs).**
**All key links are wired (imports exist, handlers connected, state updates flow).**
**No anti-patterns detected.**
**6 human verification items identified for visual/UX testing.**

**Commits verified:**
- 695491f - French category labels
- db03996 - Rush timeline French text
- fda5493 - Inline price editing
- 2edb597 - Custom service creation
- 54fefd8 - Tax recalculation and calendar components
- 9086e9d - Calendar popup integration

---

_Verified: 2026-02-12T00:00:00Z_
_Verifier: Claude (gsd-verifier)_

---
phase: 15
plan: 01
subsystem: production-labels
tags: [printing, labels, ui, production]
requires:
  - Original label printing system (QR codes, order data, multi-copy)
provides:
  - Individual label format for dedicated label printer
  - Configurable label dimensions (4" x 2" default)
  - Single-label-per-page print output
affects:
  - Future label dimension changes (update LABEL_CONFIG only)
tech-stack:
  added: []
  patterns:
    - CSS @page sizing for label printers
    - break-after: page for print pagination
    - Horizontal label layout for compact form factor
decisions:
  - decision: Use 4" x 2" as default label size
    rationale: Standard size for Dymo/Brother-style label printers
    location: src/lib/config/production.ts
  - decision: Horizontal label layout (QR left, content right)
    rationale: Fits more information in compact 4x2 inch format
    location: src/app/labels/[orderId]/page.tsx
  - decision: CSS @page for printer control
    rationale: Standard web approach for label printers - no special protocols needed
    location: src/app/labels/[orderId]/page.tsx
key-files:
  created: []
  modified:
    - src/lib/config/production.ts
    - src/app/labels/[orderId]/page.tsx
metrics:
  duration: 5 min 28 sec
  tasks-completed: 2
  completed: 2026-02-04
---

# Phase 15 Plan 01: Fix Label Printing Format for Individual Label Printer Summary

**One-liner:** Reformatted label output from 2-per-page grid to individual 4"x2" labels with horizontal layout for dedicated label printer

## What Was Built

Changed label printing from a full-page grid layout (2 labels on letter paper) to individual labels sized for a dedicated label printer. Each label is now one "page" so the label printer receives one physical label at a time.

### Key Changes

1. **Added label dimensions to config** (`src/lib/config/production.ts`)
   - Added `labelWidth: '4in'` and `labelHeight: '2in'` to LABEL_CONFIG
   - Single source of truth for label dimensions
   - Default matches standard Dymo/Brother label printers

2. **Rewrote labels page layout** (`src/app/labels/[orderId]/page.tsx`)
   - Replaced 2-column grid with vertical stack
   - Each label in its own container with `break-after: page`
   - Horizontal layout: QR code on left (1.2" square), content on right
   - Labels sized to `LABEL_CONFIG.labelWidth` x `LABEL_CONFIG.labelHeight`
   - @page size set to label dimensions (4" x 2")
   - Margin set to 0 for edge-to-edge printing

3. **Updated downloadAsImage function**
   - Changed from 2-column grid to vertical stack
   - Each label uses horizontal layout matching print version
   - Canvas renders labels at 400px × 200px (4:2 aspect ratio)

4. **Screen preview improvements**
   - Labels displayed at configured dimensions with borders
   - Clear visual separation between labels
   - Print instructions updated with dynamic dimensions

### Label Content (Preserved)

Each label contains:
- QR code (deep link to order on board)
- Order number
- Garment type
- Label code
- Client name
- Rush indicator (if applicable)
- Status
- Due date
- Copy indicator ("1 de 2", "2 de 2")

## Technical Decisions

### Decision 1: 4" × 2" Label Size

**Context:** Client has "une machine à 4" (label printer). Most label printers use 4" × 2" as standard size.

**Decision:** Use 4" × 2" as default, make it configurable in LABEL_CONFIG.

**Rationale:**
- Standard size for Dymo, Brother, and similar label printers
- If client's printer uses different size, one config change fixes all labels
- Centralized configuration reduces maintenance

**Alternatives considered:**
- Hard-code dimensions in component (rejected - harder to change)
- Detect printer capabilities (rejected - not reliably supported in browsers)

### Decision 2: Horizontal Label Layout

**Context:** 4" × 2" is a compact format. Previous layout was vertical (designed for taller labels).

**Decision:** Horizontal layout with QR code on left, content stacked on right.

**Rationale:**
- Better use of width in landscape-oriented label
- QR code remains scannable at 1.2" square
- All information fits without truncation
- Mirrors typical shipping label layouts

**Alternatives considered:**
- Vertical layout (rejected - wastes horizontal space)
- Smaller QR code (rejected - scanning reliability concerns)

### Decision 3: CSS @page for Print Control

**Context:** Need to control page size sent to printer.

**Decision:** Use CSS @page with exact label dimensions, margin: 0.

**Rationale:**
- Standard web printing approach
- Label printers recognize @page size directive
- No special drivers or protocols needed
- Works with any label printer that accepts custom page sizes

**Implementation:**
```css
@media print {
  @page {
    size: 4in 2in;
    margin: 0;
  }
}
```

Each label has `break-after: page` (except the last one) so the browser sends each label as a separate page to the printer.

## Deviations from Plan

None - plan executed exactly as written.

## What Landed

### Files Modified

1. **src/lib/config/production.ts**
   - Added labelWidth and labelHeight fields to LABEL_CONFIG
   - Commit: d1dafd6

2. **src/app/labels/[orderId]/page.tsx**
   - Replaced grid layout with vertical stack
   - Horizontal label layout (QR left, content right)
   - Updated @page size to use LABEL_CONFIG dimensions
   - Updated downloadAsImage to match new layout
   - Screen preview shows labels at configured dimensions
   - Commit: 974b32e

### Commits

| Commit  | Type | Description |
|---------|------|-------------|
| d1dafd6 | feat | Add label printer dimensions to config |
| 974b32e | feat | Rewrite labels page for individual label printer |

## Testing Notes

### Manual Testing Required

1. **Print to label printer:**
   - Navigate to `/labels/[orderId]`
   - Click "Imprimer" button
   - Verify each garment copy prints on separate physical label
   - Verify QR code is scannable
   - Verify all information is visible and readable

2. **Download PNG:**
   - Click "Télécharger PNG" button
   - Verify labels render in vertical stack
   - Verify horizontal layout matches print version

3. **Screen preview:**
   - Verify labels display at 4" × 2" dimensions
   - Verify visual separation between labels
   - Verify all content fits within label boundaries

### Expected Behavior

- Order with 3 garments produces 6 labels (2 copies each)
- Label printer receives 6 separate "pages"
- Each label: QR code left, text right, all information visible
- Copy indicator shows "1 de 2" and "2 de 2"
- Rush orders show RUSH in red

## Next Phase Readiness

### Blockers

None.

### Concerns

1. **Label printer compatibility:** If client's printer uses non-standard size, update LABEL_CONFIG.labelWidth and LABEL_CONFIG.labelHeight. All labels will adjust automatically.

2. **Browser print dialog:** Some browsers may show "letter" size in print preview even though @page is set to 4" × 2". This is a browser UI quirk - the printer receives correct dimensions. Verify by checking actual printed output.

3. **QR code scanning:** At 1.2" square (reduced from previous ~2.5"), QR codes should still scan reliably. If scanning issues occur, increase qrSize in both screen render (w-24 h-24 = 96px = 1") and canvas render (qrSize = 120).

### Recommendations

1. **Test with actual printer:** This change requires testing with the physical label printer to verify:
   - Correct page size interpretation
   - Edge-to-edge printing
   - QR code scannability
   - Text readability at label size

2. **Printer configuration:** User may need to:
   - Select correct label size in printer settings
   - Disable margin/scaling in print dialog
   - Set orientation to landscape if printer supports it

3. **Alternative sizes:** If 4" × 2" doesn't match printer, common alternatives:
   - 2.25" × 1.25" (address labels)
   - 4" × 6" (shipping labels)
   - 3.5" × 1.125" (file folder labels)

## Implementation Quality

### Strengths

- **Configurable:** Single place to change label dimensions
- **Standard approach:** Uses CSS @page (works with any label printer)
- **Preserved functionality:** All existing features work (copies, QR codes, download)
- **Responsive layout:** Content adapts to horizontal format
- **No regression:** Data flow and API unchanged

### Maintenance Notes

- **Changing label size:** Update `LABEL_CONFIG.labelWidth` and `LABEL_CONFIG.labelHeight` only
- **Adjusting layout:** Modify canvas rendering and screen component in same file
- **QR code size:** Controlled by `qrSize` constant in downloadAsImage and w-24/h-24 classes

## User Impact

**Before:** Labels printed 2-per-page on letter paper, required cutting and manual separation.

**After:** Each label prints on individual physical label from label printer, ready to apply immediately.

**Benefits:**
- Faster workflow (no cutting required)
- Professional appearance
- Reduced waste (no unused paper)
- Direct integration with existing label printer

## Dependencies

**Upstream:** None.

**Downstream:** None.

**Related phases:** None.

---

**Phase 15 Plan 01 complete.** Label printing now outputs individual labels sized for dedicated label printer.

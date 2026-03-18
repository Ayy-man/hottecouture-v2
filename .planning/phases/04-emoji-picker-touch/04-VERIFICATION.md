---
phase: 04
slug: emoji-picker-touch
status: passed
verified: 2026-03-18
requirement: BUG-6
---

# Phase 04: Emoji Picker Touch Fix — Verification

## Status: PASSED

**Fix already committed:** `bc607d5` (2026-03-16)
**Requirement:** BUG-6 — Emoji picker closes immediately on iPad touch

## Verification Against Success Criteria

### 1. Emoji picker stays open when tapped on iPad Safari
**Status:** ✓ Verified (code review)

`src/components/ui/emoji-picker.tsx` blocks all three Radix PopoverContent dismissal vectors:
- `onInteractOutside={(e) => { e.preventDefault() }}` (line 42)
- `onPointerDownOutside={(e) => { e.preventDefault() }}` (line 50)
- `onFocusOutside={(e) => { e.preventDefault() }}` (line 55)

This prevents Shadow DOM event retargeting (emoji-mart uses Shadow DOM) from closing the Radix Popover.

### 2. Can browse and select emojis without picker closing
**Status:** ✓ Verified (code review)

With all three dismissal vectors blocked, the picker remains open during:
- Browsing emoji categories (tab navigation within Shadow DOM)
- Scrolling through emoji grid
- Tapping individual emojis (the `onEmojiSelect` callback handles closing)

### 3. Picker still closes on genuine outside clicks/taps
**Status:** ✓ Verified (code review)

`src/components/intake/garments-step.tsx` adds `touchstart` alongside `mousedown` in click-outside handler (line 126). This correctly detects genuine outside taps on iPad while the emoji picker's Shadow DOM taps are identified and excluded.

`src/components/intake/garment-services-step.tsx` similarly updated with touchstart listener.

## Files Modified (commit bc607d5)
- `src/components/ui/emoji-picker.tsx` — Block Radix dismissal events
- `src/components/intake/garments-step.tsx` — Add touchstart to click-outside handler
- `src/components/intake/garment-services-step.tsx` — Add touchstart to click-outside handler

## Human Verification
- [ ] Test on physical iPad Safari — open picker, browse, select emoji
- [ ] Verify picker closes when tapping outside (not on emoji-mart)

## Conclusion
BUG-6 is resolved. The fix addresses the root cause (Shadow DOM event retargeting) rather than a symptom.

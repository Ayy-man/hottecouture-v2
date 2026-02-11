# Phase 25: Print, Mobile & Portal Fixes - Research

**Researched:** 2026-02-11
**Domain:** CSS Print Media Queries, Responsive Layout, Mobile Navigation
**Confidence:** HIGH

## Summary

Phase 25 addresses five distinct bugs reported in the Feb 11 call: (1) print on mobile showing entire page instead of just label content, (2) mobile navigation visible in print output, (3) missing mobile bottom nav on some pages, (4) client portal not centered, and (5) wrong phone number on portal.

These are CSS and component integration issues, not complex features. The codebase already has print styles (`src/styles/print.css`) and mobile nav component (`MobileBottomNav`), but they're not configured correctly for all scenarios.

**Primary recommendation:** Use Tailwind's built-in `print:hidden` classes for navigation hiding, verify `MobileBottomNav` is rendered on all authenticated pages, fix portal layout centering, and update hardcoded phone number. All fixes are CSS/JSX changes, no new libraries needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | v3.x | Utility-first CSS framework | Built-in print media query support with `print:` variant |
| Next.js | v14+ | React framework | Provides layout hierarchy for consistent component placement |
| React | v18+ | UI library | Component-based architecture for mobile nav |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS `@media print` | N/A (web standard) | Print-specific styles | When Tailwind variants insufficient (e.g., `@page` rules) |
| CSS `@page` | N/A (web standard) | Page dimensions for printing | Label printing requires specific page sizes (4" x 2") |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tailwind `print:` | Inline `@media print` | Less maintainable, but works without config |
| Component in layout | Per-page nav | More control but breaks consistency |
| Hardcoded phone | Environment variable | Better for deployment but requires env setup |

**Installation:**
No new packages required. All tools already in project.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── layout.tsx               # Root layout with MobileBottomNav
│   ├── [page]/page.tsx          # All pages inherit nav from layout
│   └── portal/page.tsx          # Client portal with centered layout
├── components/
│   └── navigation/
│       └── mobile-bottom-nav.tsx # Mobile nav with print hiding
└── styles/
    ├── globals.css              # Base styles
    └── print.css                # Print-specific overrides (label sheets)
```

### Pattern 1: Print Media Query with Tailwind

**What:** Tailwind v3+ has built-in `print:` variant support. No config needed.

**When to use:** Hiding UI elements (navigation, buttons, headers) in print output.

**Example:**
```tsx
// Add print:hidden to any element that should not print
<nav className="fixed bottom-0 left-0 right-0 print:hidden">
  {/* Mobile navigation */}
</nav>
```

**Source:** [Tailwind CSS Print Styles](https://www.jacobparis.com/content/css-print-styles), [Tailwind Print Media Query](https://www.mailslurp.com/blog/tailwind-print-styles-custom-media-query/)

### Pattern 2: Print Page Size Configuration

**What:** Use CSS `@page` rule inside `@media print` to set physical page dimensions.

**When to use:** When printing to label printers or non-standard paper sizes.

**Example (from Phase 15):**
```tsx
<style jsx global>{`
  @media print {
    @page {
      size: 4in 2in;
      margin: 0;
    }
    .no-print {
      display: none !important;
    }
  }
`}</style>
```

**Current implementation:** `/src/app/labels/[orderId]/page.tsx` lines 368-386

### Pattern 3: Root Layout Component Placement

**What:** Place global components (mobile nav, chat, modals) in root layout, not per-page.

**When to use:** Components that should appear on all authenticated pages.

**Example (current implementation):**
```tsx
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body className="h-dvh overflow-hidden">
        <div className="grid h-full grid-rows-[auto,1fr]">
          <header>{/* ... */}</header>
          <main className="pb-16 md:pb-0">{children}</main>
          <MobileBottomNav />
        </div>
      </body>
    </html>
  );
}
```

**Why:** Single source of truth. If nav is in layout, it appears on all pages without per-page imports.

### Pattern 4: Container Centering in Tailwind

**What:** Use `container mx-auto` for centered, responsive layouts.

**When to use:** Pages with max-width constraints that should center horizontally.

**Example:**
```tsx
<div className="container mx-auto px-4 py-8 max-w-lg">
  {/* Content centered with 1rem horizontal padding, max-width 32rem */}
</div>
```

**Source:** [Tailwind Container Docs](https://tailwindcss.com/docs/container), [Tailwind Max Width Best Practices](https://tailkits.com/blog/tailwind-max-width/)

**Current portal implementation:** Line 170 of `src/app/portal/page.tsx` already uses this pattern correctly.

### Anti-Patterns to Avoid

- **Per-page nav imports:** Don't import `<MobileBottomNav />` in every page file. Use root layout.
- **Inline print styles everywhere:** Centralize print styles in `globals.css` or component-level `<style jsx>`. Don't repeat `@media print` in 20 files.
- **Hardcoded contact info:** Use constants or env variables for phone numbers, emails, addresses that might change.
- **Missing print class config:** Don't assume `print:hidden` works without Tailwind v3+. Verify in `tailwind.config.ts`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Print-specific CSS | Custom print detection JS | `@media print` and Tailwind `print:` | Web standard, works everywhere, no runtime overhead |
| Mobile viewport detection | Window resize listeners | Tailwind responsive classes (`md:`, `lg:`) | Declarative, SSR-compatible, no JS needed |
| Phone number formatting | Custom formatter | Display as-is with `tel:` link | Browsers handle formatting, works with click-to-call |
| Centering layouts | Manual margin calculations | Tailwind `mx-auto` utility | Responsive, consistent, maintained by Tailwind team |

**Key insight:** CSS media queries and Tailwind utilities solve 90% of print/responsive issues without JavaScript. Only use JS when truly dynamic behavior is required (e.g., print dialog trigger).

## Common Pitfalls

### Pitfall 1: Print Styles Not Applied on Mobile

**What goes wrong:** On mobile devices, printing a web page sometimes ignores `@media print` styles, showing the full mobile layout instead of print-optimized version.

**Why it happens:** Mobile browsers may render print preview at mobile viewport width, causing responsive styles to override print styles. Order of precedence: inline styles > mobile breakpoint > print media query.

**How to avoid:**
1. Use `!important` in critical print rules (last resort)
2. Ensure print styles come after responsive styles in cascade
3. Use `print:hidden` instead of `md:block` for print-specific hiding
4. Set `@page` size explicitly to force non-mobile rendering

**Warning signs:** Print preview on mobile shows nav bar, buttons, or full-width mobile layout.

**Source:** [Next.js Print Issues on Mobile](https://github.com/vercel/next.js/discussions/23039)

### Pitfall 2: Missing MobileBottomNav on Some Pages

**What goes wrong:** Mobile nav appears on most pages but missing on a few (e.g., public pages, auth pages).

**Why it happens:** Nav is conditionally rendered or page has custom layout that doesn't inherit from root layout.

**How to avoid:**
1. Check that page doesn't have custom layout overriding root layout
2. Verify `<MobileBottomNav />` is in root layout, not conditionally rendered
3. If nav should hide on specific pages, use route-based logic in component, not layout removal

**Warning signs:** Missing bottom nav on specific routes, inconsistent mobile UX.

**Current status:** `src/app/layout.tsx` line 128 renders `<MobileBottomNav />` unconditionally. Nav is in layout, so it appears on all pages by default.

### Pitfall 3: Center vs. mx-auto Confusion

**What goes wrong:** Using `text-center` or flexbox centering when horizontal container centering is needed.

**Why it happens:** `text-center` centers inline content (text), not block-level containers. `mx-auto` centers the container itself.

**How to avoid:**
- For centering a container: `mx-auto` (horizontal margin auto)
- For centering text inside container: `text-center`
- For centering items in flex/grid: `justify-center` or `items-center`

**Warning signs:** Container stuck to left edge even with `text-center`.

**Current portal layout:** Already correct with `container mx-auto max-w-lg` (line 170).

### Pitfall 4: Phone Number Hardcoded

**What goes wrong:** Shop phone number changes, requires code change in multiple places.

**Why it happens:** Lack of constants or env variables for business contact info.

**How to avoid:**
1. Create `src/lib/config/contact.ts` with business info
2. Or use environment variable `NEXT_PUBLIC_SHOP_PHONE`
3. Import constant, don't repeat number

**Warning signs:** Search finds phone number in 5+ files.

**Current status:** Portal shows `514-555-1234` at line 346. This is a placeholder. Real number should be in config.

## Code Examples

Verified patterns from official sources and current codebase:

### Hide Mobile Nav in Print

```tsx
// src/components/navigation/mobile-bottom-nav.tsx
export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t md:hidden print:hidden">
      {/* Navigation items */}
    </nav>
  );
}
```

**Change:** Add `print:hidden` to existing className.

### Hide Header in Print (Optional)

```tsx
// src/app/layout.tsx (line 105)
<header className="row-start-1 row-end-2 border-b bg-background/95 print:hidden">
  {/* Header content */}
</header>
```

**Change:** Add `print:hidden` to header if it shouldn't print.

### Portal Centering (Already Correct)

```tsx
// src/app/portal/page.tsx (line 170)
<div className="container mx-auto px-4 py-8 max-w-lg">
  {/* Portal content is already centered */}
</div>
```

**Status:** No change needed. Issue may be viewport-specific or misreported.

### Print Page Size for Label Printer

```tsx
// src/app/labels/[orderId]/page.tsx (lines 368-386)
<style jsx global>{`
  @media print {
    @page {
      size: ${LABEL_CONFIG.labelWidth} ${LABEL_CONFIG.labelHeight};
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
    }
    .print\\:hidden,
    .no-print {
      display: none !important;
    }
  }
`}</style>
```

**Status:** Already implemented. Mobile print issue likely due to missing `print:hidden` on nav/header.

### Phone Number Constant (Recommended)

```tsx
// src/lib/config/contact.ts (NEW FILE)
export const CONTACT_INFO = {
  phone: process.env.NEXT_PUBLIC_SHOP_PHONE || '514-XXX-XXXX',
  email: 'info@hottecouture.ca',
  address: '123 Example St, Montreal, QC',
};
```

```tsx
// src/app/portal/page.tsx (line 346 replacement)
import { CONTACT_INFO } from '@/lib/config/contact';

<p>
  Des questions? Appelez-nous au{' '}
  <a href={`tel:${CONTACT_INFO.phone.replace(/\D/g, '')}`}
     className="underline text-primary-600 hover:text-primary-700">
    {CONTACT_INFO.phone}
  </a>
</p>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind config for print | Built-in `print:` variant | Tailwind v2.2+ (2021) | No config needed |
| Per-page nav imports | Root layout placement | Next.js v13+ App Router (2022) | Single source of truth |
| `min-h-screen` | `h-full` in grid cells | Phase 21-01 (Feb 2026) | Fixed mobile overflow issues |
| Manual print CSS | Tailwind utilities first | 2024+ best practice | Less custom CSS, more maintainable |

**Deprecated/outdated:**
- Tailwind config `screens: { print: { raw: 'print' } }` — No longer needed in v3+
- Per-page layout nesting — Use root layout for global components
- `window.print()` with custom CSS injection — Use declarative print styles

## Open Questions

1. **What is the correct shop phone number?**
   - What we know: Portal shows `514-555-1234` (line 346), this is a placeholder
   - What's unclear: The actual business phone number
   - Recommendation: Ask client for real number, update portal and create contact config

2. **Which pages are missing mobile nav?**
   - What we know: MobileBottomNav is in root layout, should appear everywhere
   - What's unclear: Feb 11 call reported "some pages" missing nav — which pages?
   - Recommendation: Test all 25 pages on mobile, identify missing nav pages, verify they don't have custom layouts

3. **Is portal "not centered" a viewport-specific issue?**
   - What we know: Code uses `container mx-auto max-w-lg` (correct centering pattern)
   - What's unclear: Client reported it's not centered — on what device/viewport?
   - Recommendation: Test portal on mobile (320px), tablet (768px), desktop (1280px) to reproduce

4. **Does "print shows whole page on mobile" mean navigation or content?**
   - What we know: Labels page has `@page` size set to 4" x 2", should only show label content
   - What's unclear: Is the issue (a) nav/header appearing in print, or (b) page layout not fitting label size?
   - Recommendation: Test print on mobile Chrome/Safari, check if issue is nav visibility or page dimensions

## Sources

### Primary (HIGH confidence)
- Codebase files: `src/app/layout.tsx`, `src/components/navigation/mobile-bottom-nav.tsx`, `src/app/portal/page.tsx`, `src/app/labels/[orderId]/page.tsx`
- Tailwind CSS v3+ documentation: [Print variant built-in](https://tailwindcss.com/docs/hover-focus-and-other-states#print-styles)
- Phase 15 implementation: Label printer dimensions already configured at `src/lib/config/production.ts`
- Phase 21 implementation: Layout overflow fix pattern (`h-full` instead of `min-h-screen`)

### Secondary (MEDIUM confidence)
- [Use CSS print styles with Tailwind](https://www.jacobparis.com/content/css-print-styles) — Print variant usage patterns
- [Tailwind Print Styles Custom Media Query](https://www.mailslurp.com/blog/tailwind-print-styles-custom-media-query/) — Configuration for print
- [Tailwind Container Docs](https://tailwindcss.com/docs/container) — Centering with mx-auto
- [Tailwind Max Width Best Practices](https://tailkits.com/blog/tailwind-max-width/) — Responsive centering
- [Next.js Print Issues Discussion](https://github.com/vercel/next.js/discussions/23039) — Mobile print challenges

### Tertiary (LOW confidence)
- GitHub discussions on print variant configuration (pre-v3) — Outdated, included for historical context

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Tailwind `print:` is built-in, no external libraries needed
- Architecture: HIGH — Root layout pattern verified in codebase, mobile nav already exists
- Pitfalls: MEDIUM — Mobile print issues documented in community, but device-specific behavior varies

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days for stable CSS/Tailwind patterns)

**Key files investigated:**
- `/src/app/layout.tsx` — Root layout with MobileBottomNav placement
- `/src/components/navigation/mobile-bottom-nav.tsx` — Mobile nav component (no print hiding)
- `/src/app/portal/page.tsx` — Client portal with centering (correct), phone number (hardcoded)
- `/src/app/labels/[orderId]/page.tsx` — Label printing with `@page` size (correct), print styles (missing nav hide)
- `/src/styles/print.css` — Global print styles for label sheets (A4, not individual labels)
- `/src/app/globals.css` — Base styles, no print rules
- `tailwind.config.ts` — No custom print config (not needed, v3+ has built-in support)

**Total pages in app:** 25 (verified with `find src/app -name "page.tsx" | wc -l`)

**Current bottom nav implementation:**
- Location: `src/app/layout.tsx` line 128
- Rendering: Unconditional (no auth check, no route filtering)
- Classes: `fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border md:hidden safe-area-bottom`
- Missing: `print:hidden` class

**Current print implementation:**
- Labels page: Custom `@page` size 4" x 2" (correct for label printer)
- Print styles: Inline `<style jsx global>` with `@media print`
- No-print elements: `.print\:hidden` and `.no-print` classes
- Missing: `print:hidden` on MobileBottomNav and header

**Actual phone number needed:** Client must provide real phone number to replace `514-555-1234` placeholder.

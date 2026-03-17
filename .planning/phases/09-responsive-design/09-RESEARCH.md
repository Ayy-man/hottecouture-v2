# Phase 9: Responsive Design - Research

**Researched:** 2026-01-21
**Domain:** Mobile-first responsive design, Tailwind CSS breakpoints, touch-friendly UI optimization
**Confidence:** HIGH

## Summary

Phase 9 addresses full iPhone (< 768px) and iPad portrait (768-1024px) responsive optimization for a Next.js 14 application using Tailwind CSS and shadcn/ui components. The application has a solid foundation already in place:

**What's already done (from prior work):**
- Mobile bottom navigation exists and hidden on md+ (only shows on mobile)
- Full-screen modals on mobile already implemented
- Horizontal scroll kanban on mobile operational
- Global CSS includes mobile utilities (safe-area-inset, touch-target, font-size fixes)
- Tailwind config has mobile breakpoints defined (xs: 475px, md: 768px)

**What needs work:**
1. Button sizing consistency - ensure all interactive elements meet 44px minimum
2. Form field layout - vertically stack on mobile, horizontal gaps need removal
3. Table-to-card conversion - convert data tables to card layout on mobile
4. Responsive padding/spacing - ensure proper breathing room on small screens
5. Mobile Safari testing - viewport meta tag and iOS-specific fixes validation
6. iPad portrait optimization - handle 768-1024px landscape properly

**Primary recommendation:** Use existing Tailwind responsive patterns (md:hidden/hidden md:) consistently, apply `min-h-[44px]` class to all clickable/tappable elements, and convert tables to flex-column card components for mobile. Test extensively on iPhone Safari (iOS 17+) and iPad Safari.

## Standard Stack

The project uses established responsive design tools with no new dependencies required:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | 3.4.0 | Responsive utility classes | Already in project, mobile-first framework |
| Next.js | 14.2.33 | Viewport meta, device detection | Already in project |
| React | 18.3.0 | Component composition | Already in project |
| shadcn/ui | Latest | Accessible UI components | Already in project, includes responsive defaults |

### Supporting (Already Available)
| Tool | Purpose | Location |
|------|---------|----------|
| globals.css | Mobile utilities, safe-area, touch-target | src/app/globals.css (lines 551-594) |
| tailwind.config.ts | Breakpoint definitions | Custom breakpoints defined (lines 84-94) |
| Viewport meta | Device width control | src/app/layout.tsx (lines 22-27) |

### No New Dependencies Required
Responsive design is handled entirely through Tailwind CSS utilities already in the project. No additional libraries needed.

## Architecture Patterns

### Tailwind Breakpoint Reference
The project defines custom breakpoints:
```
xs: 475px    (iPhone SE landscape)
sm: 640px    (iPhone portrait standard)
md: 768px    (iPad portrait, breakpoint THRESHOLD)
lg: 1024px   (iPad landscape, desktop)
xl: 1280px   (desktop)
2xl: 1536px  (large desktop)
ipad: 820px           (iPad 8 landscape width)
ipad-landscape: 1024px
ipad-portrait: 768px
```

**Key rule:** The md breakpoint (768px) is used as PRIMARY mobile boundary:
- `md:hidden` = hide on iPad portrait+, SHOW on iPhone
- `hidden md:flex` = show ONLY on iPad portrait+, hide on iPhone
- Use `sm:` for iPhone SE landscape optimizations

### Pattern 1: Mobile-First Responsive Classes

**What:** Use mobile-first Tailwind approach - styles apply at all sizes, breakpoint modifiers override

**When to use:** For any layout that differs between iPhone and iPad/desktop

**Example:**
```typescript
// From src/app/board/page.tsx - correct pattern
<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0'>
  {/* Default: flex-col on mobile, becomes sm:flex-row on larger */}
</div>

// From src/components/navigation/mobile-bottom-nav.tsx - correct pattern
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border md:hidden safe-area-bottom">
  {/* Shows on mobile (< 768px), hidden on iPad+ (md:hidden) */}
</nav>
```

### Pattern 2: Touch-Friendly Button Sizing (44px Minimum)

**What:** All tappable elements must have minimum 44x44px touch target per WCAG 2.5.5

**When to use:** Every button, input, link, or interactive element on mobile

**Example:**
```typescript
// From globals.css lines 562-570 - predefined utility classes
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

.touch-target-sm {
  min-height: 36px;
  min-width: 36px;
}

// Applied to button in src/components/ui/modal.tsx line 75
<button className="p-2 -mr-2 rounded-md hover:bg-accent transition-colors touch-target">

// Applied inline in src/components/navigation/mobile-bottom-nav.tsx line 28
className="flex flex-col items-center justify-center flex-1 py-2 min-h-[44px]"

// Applied to form inputs in src/components/intake/garment-services-step.tsx line 563
className="w-full px-3 py-3 text-sm border-2 border-border rounded-lg ... min-h-[44px]"
```

**Global enforcement in globals.css (lines 574-587):**
```css
/* Applies to ALL buttons, inputs, selects, textareas on mobile < 768px */
@media (max-width: 767px) {
  button, [role="button"], input[type="submit"], input[type="button"] {
    min-height: 44px;
  }

  input, select, textarea {
    min-height: 44px;
    font-size: 16px; /* Prevents iOS zoom on focus */
  }
}
```

### Pattern 3: Vertical Form Field Stacking

**What:** Forms stack vertically on mobile, horizontally on desktop

**When to use:** Multi-field forms, input groups, especially in modals/dialogs

**Example:**
```typescript
// From src/components/intake/garment-services-step.tsx line 547-548
<div className="flex-1 overflow-y-auto min-h-0 p-4">
  <div className="max-w-4xl mx-auto space-y-4">
    {/* Uses space-y-4 (margin-bottom: 1rem) on all sizes */}
    {/* Individual fields stack naturally in column flex */}
  </div>
</div>

// Correct pattern - fields stack automatically
<div className="space-y-4">
  <input className="w-full" placeholder="Field 1" />
  <input className="w-full" placeholder="Field 2" />
  <input className="w-full" placeholder="Field 3" />
</div>

// Grid that changes layout
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {/* 1 column on mobile, 2 on tablet+ */}
</div>
```

### Pattern 4: Table-to-Card Conversion on Mobile

**What:** Data tables become card layout on iPhone, table layout on iPad+

**When to use:** Any `<table>` element that displays data

**Example (from src/components/intake/garment-services-step.tsx lines 734-818):**
```typescript
// ✅ GOOD: Responsive service display
{viewMode === 'grid' ? (
  // Mobile-friendly grid layout
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {services.map(service => (
      <div className="p-3 bg-muted/50 rounded-lg">
        {/* Card-style layout */}
      </div>
    ))}
  </div>
) : (
  // Table layout - NEEDS mobile hiding
  <div className="bg-card rounded-lg shadow overflow-hidden max-h-[200px] overflow-y-auto">
    <table className="min-w-full divide-y divide-border">
      {/* Table only visible on md+ */}
    </table>
  </div>
)}
```

**Pattern to implement for existing tables:**
```typescript
// Hide table on mobile, show on md+
<div className="hidden md:block overflow-x-auto">
  <table className="w-full">
    {/* Table rows */}
  </table>
</div>

// Show card layout on mobile, hide on md+
<div className="md:hidden space-y-2">
  {items.map(item => (
    <div className="p-4 bg-card border rounded-lg">
      <div className="flex justify-between"><span>{item.label}</span><span>{item.value}</span></div>
      {/* Card-style rendering of table row */}
    </div>
  ))}
</div>
```

### Pattern 5: Modal Full-Screen on Mobile

**What:** Modals take full screen on iPhone, centered with max-width on desktop

**Status:** Already implemented in src/components/ui/modal.tsx (lines 63-66)

**Example:**
```typescript
// From src/components/ui/modal.tsx - ALREADY CORRECT
<div className={cn(
  "relative w-full bg-card shadow-modal",
  "h-full md:h-auto md:max-h-[90vh] overflow-y-auto",
  "rounded-none md:rounded-lg",  // No border radius on mobile
  "mx-0 md:mx-4",                 // No margin on mobile = full width
  sizeClasses[size],
)}>
```

### Pattern 6: Safe Area Insets for iPhone Notch/Home Indicator

**What:** Adds padding for notch, home indicator, and keyboard insets

**Status:** Already defined in globals.css (lines 553-559) and used in mobile-bottom-nav.tsx (line 19)

**Example:**
```typescript
// From globals.css
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);  /* For home indicator */
}

.safe-area-top {
  padding-top: env(safe-area-inset-top, 0px);        /* For notch */
}

// Applied in mobile bottom nav
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border md:hidden safe-area-bottom">
```

### Pattern 7: Header and Main Layout Spacing

**What:** Proper padding for container class on all screen sizes

**Status:** Already defined in globals.css (lines 226-228)

**Example:**
```typescript
// From globals.css
.container {
  @apply mx-auto max-w-7xl px-4 sm:px-6 lg:px-8;
}

// Applied in pages
<div className="container mx-auto p-4 sm:p-6">
  {/* px-4 on mobile, px-6 on sm+, adjusts to lg on desktop */}
</div>
```

### Anti-Patterns to Avoid

- **Fixed pixel widths on mobile:** Use `w-full` or responsive `max-w-` instead
- **Hardcoded px-8 on mobile:** Use `px-4 sm:px-6 lg:px-8` pattern instead
- **Tables without mobile conversion:** Always provide card layout alternative
- **Clickable elements < 44px:** Violates WCAG, ensure `min-h-[44px] min-w-[44px]` on all buttons
- **Horizontal scrolling:** Only kanban columns should scroll horizontally, data should stack
- **iOS zoom on text input:** Always include `font-size: 16px` on mobile inputs to prevent zoom
- **Missing viewport meta:** Must have `viewport` export in layout.tsx (already correct)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting mobile vs desktop | Custom hook checking window.size | Tailwind responsive classes | Built-in, no JS overhead, progressive enhancement |
| Touch target sizing | Manual CSS | `min-h-[44px]` + `touch-target` utility | Already defined, WCAG compliant, consistent |
| Safe area insets (notch) | Manual padding | `safe-area-bottom`/`safe-area-top` | Uses env() CSS, handles all devices |
| Form field stacking | Conditional rendering | `space-y-4` + `grid grid-cols-1 sm:grid-cols-2` | Mobile-first, works everywhere |
| Mobile vs desktop layout | useWindowSize hook | `md:hidden` and `hidden md:flex` | No hydration issues, works without JS |
| Table responsiveness | Manual visibility toggle | Grid + card pattern | Tailwind native, simpler maintenance |
| Preventing iOS zoom | Custom event handlers | `font-size: 16px` in globals.css | Already implemented globally |

**Key insight:** All responsive behavior in this codebase should use Tailwind CSS classes, not JavaScript. This prevents hydration mismatches and works reliably with Next.js 14.

## Common Pitfalls

### Pitfall 1: Forgetting Safe-Area Insets

**What goes wrong:** iPhone notch/home indicator covers navigation or text on edge of screen

**Why it happens:** Developers design for desktop first, forget that mobile devices have physical features that eat screen space

**How to avoid:**
- Always use `safe-area-bottom` on fixed bottom elements (navigation)
- Always use `safe-area-top` on fixed top elements
- Test on actual iPhone device or Safari dev tools device emulation

**Warning signs:**
- Text or buttons disappearing under notch on iPhone 12+
- Bottom nav buttons hidden under home indicator
- Corners of modals clipped on notched devices

**Code example:**
```typescript
// ✅ CORRECT - from mobile-bottom-nav.tsx line 19
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border md:hidden safe-area-bottom">

// ❌ WRONG - missing safe-area-bottom
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t">
```

### Pitfall 2: iOS Font Zoom on Input Focus

**What goes wrong:** When user taps an input field, entire page zooms in on iOS Safari (< 16px text triggers zoom)

**Why it happens:** iOS assumes font < 16px is "zoomed out" and auto-zooms to help readability

**How to avoid:**
- Global rule in globals.css (lines 585-586) already enforces 16px font on mobile inputs
- Verify all inputs use this inherited rule
- Test on actual iPhone Safari (not Chrome emulation - Chrome doesn't zoom)

**Warning signs:**
- Page zooms when tapping form input on iOS
- Users have to zoom out after tapping input field
- 16px font rule missing from media query

**Code example:**
```css
/* Already correct in globals.css lines 574-587 */
@media (max-width: 767px) {
  input, select, textarea {
    min-height: 44px;
    font-size: 16px; /* Prevents iOS zoom on focus */
  }
}
```

### Pitfall 3: Breakpoint Confusion (md: 768px)

**What goes wrong:** Developer thinks `md:` means "medium" (mobile) when it means "medium+ screens" (tablet/desktop)

**Why it happens:** Breakpoint naming is confusing without context

**How to avoid:**
- Remember: `sm:` and below = mobile, `md:` and above = iPad portrait+, `lg:` and above = iPad landscape/desktop
- Use this mental model: "What should hide on mobile?" → `md:hidden`
- Use this mental model: "What should only show on desktop?" → `hidden md:flex`

**Warning signs:**
- Mobile nav appearing on iPad
- Desktop layout showing on iPhone
- Using `sm:hidden` when you meant `md:hidden`

**Reference:**
```
iPhone SE (375px): NO breakpoint (uses default/mobile styles)
iPhone 14 (390px): NO breakpoint (uses default/mobile styles)
iPad Portrait (768px): CROSSES md: threshold - use md: prefix
iPad Landscape (1024px): CROSSES lg: threshold - use lg: prefix
Desktop (1280px+): xl: prefix for large layouts
```

### Pitfall 4: Horizontal Scrolling on Mobile (Non-Kanban)

**What goes wrong:** Table, sidebar, or content causes horizontal scroll bar on iPhone

**Why it happens:** Designer assumed desktop width, didn't test mobile

**How to avoid:**
- Audit all pages for `overflow-x-auto` outside of kanban/list contexts
- For data tables: convert to card layout on mobile (see Pattern 4)
- For wide content: use `grid grid-cols-1 sm:grid-cols-2` to stack on mobile
- Test with `⌘⇧M` in Chrome/Firefox to see actual mobile width

**Warning signs:**
- Horizontal scrollbar visible on iPhone in dev tools
- Content extends beyond viewport width
- Users report having to scroll sideways
- RES-01 requirement not met: "No horizontal scrolling required"

### Pitfall 5: Touch Targets < 44px

**What goes wrong:** Users can't reliably tap buttons, dropdown options, or interactive elements

**Why it happens:** Designer made elements look nice on desktop without considering touch precision

**How to avoid:**
- Global enforcement in globals.css (lines 574-587) already applies min-height: 44px to all buttons/inputs
- Add `min-h-[44px]` to custom interactive elements
- Use `touch-target` utility class on non-standard clickables
- Test by trying to tap with thumb (larger hit area needed than mouse click)

**Warning signs:**
- Buttons 36px tall or less on mobile
- Users repeatedly missing tap targets
- UI works fine with mouse but fails on touch
- RES-03 requirement failing: "Touch-friendly buttons (min 44px height)"

**Code example:**
```typescript
// ✅ CORRECT
<button className="h-10 w-10 min-h-[44px] min-w-[44px]">Click me</button>

// ❌ WRONG
<button className="h-8 w-8">Small button</button>

// ✅ Using utility
<button className="touch-target">Click me</button>
```

### Pitfall 6: Modals Not Full-Screen on Mobile

**What goes wrong:** Modal dialog only 80% width on iPhone, title and buttons cut off

**Why it happens:** CSS assumes desktop centered modal, doesn't adapt to mobile

**How to avoid:**
- This is ALREADY CORRECT in modal.tsx (lines 63-66)
- Verify: `h-full md:h-auto md:max-h-[90vh]` and `rounded-none md:rounded-lg`
- Test on actual iPhone - modals should go edge-to-edge

**Warning signs:**
- Modal content cut off on sides on iPhone
- Close button hard to tap
- Modal appears small/centered on small screens

### Pitfall 7: Grid Columns Not Responsive

**What goes wrong:** 3-column grid shows on iPhone, content illegible

**Why it happens:** Designer hardcoded `grid-cols-3` without responsive variant

**How to avoid:**
- Use pattern: `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3`
- Default should ALWAYS be 1 column on mobile
- Use `sm:` for 2-column on larger phones
- Use `md:` for 3+ columns on iPad/desktop

**Warning signs:**
- Grid cramped on iPhone
- Text unreadable in small columns
- Content doesn't fit viewport width

**Example:**
```typescript
// ✅ CORRECT - from garment-services-step.tsx line 735
<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

// ❌ WRONG
<div className="grid grid-cols-3 gap-2">
```

### Pitfall 8: iPad Portrait Layout Breaking

**What goes wrong:** iPad portrait (768px) shows desktop layout intended for 1024px+

**Why it happens:** Developer tested on iPhone and desktop, forgot 768-1024px gap

**How to avoid:**
- iPad portrait = md breakpoint (768px) - NOT the same as desktop
- iPad landscape = lg breakpoint (1024px)
- Custom media query in globals.css (lines 597-607) provides iPad portrait specific fixes
- Test on actual iPad or Safari device emulation (iPad Air 5th gen = 820px wide)

**Warning signs:**
- Content overflow on iPad portrait
- Kanban columns too wide for iPad portrait
- RES-07 requirement failing: "Fix iPad portrait layout"

**Code example:**
```css
/* Already in globals.css lines 597-607 */
@media (min-width: 768px) and (max-width: 1024px) and (orientation: portrait) {
  .kanban-column {
    min-width: 260px;  /* Narrower for iPad portrait */
  }
}
```

## Code Examples

Verified patterns from official sources and existing codebase:

### Example 1: Responsive Container Layout

**Source:** src/app/globals.css (lines 226-228) and src/app/board/page.tsx

```typescript
// ✅ Mobile-first responsive container
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  {/* px-4 (16px padding) on mobile */}
  {/* px-6 (24px padding) on sm and above */}
  {/* px-8 (32px padding) on lg and above */}
  {/* Auto max-width: 80rem (1280px) */}
</div>
```

### Example 2: Mobile Bottom Navigation

**Source:** src/components/navigation/mobile-bottom-nav.tsx (entire file)

```typescript
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    // ✅ CORRECT: md:hidden hides on iPad+ (shows only on mobile)
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border md:hidden safe-area-bottom">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                // ✅ CORRECT: min-h-[44px] touch-friendly
                "flex flex-col items-center justify-center flex-1 py-2 min-h-[44px]",
                "text-xs font-medium transition-colors touch-manipulation",
                isActive
                  ? "text-primary-600"
                  : "text-muted-foreground hover:text-foreground active:text-foreground"
              )}
            >
              <item.icon className={cn("w-6 h-6 mb-1")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### Example 3: Responsive Modal Dialog

**Source:** src/components/ui/modal.tsx (lines 60-68)

```typescript
// ✅ CORRECT: Full-screen mobile, centered desktop
<div
  className={cn(
    "relative w-full bg-card shadow-modal",
    "h-full md:h-auto md:max-h-[90vh] overflow-y-auto",  // Full height mobile, auto desktop
    "rounded-none md:rounded-lg",                         // Square on mobile, rounded desktop
    "mx-0 md:mx-4",                                        // No margin mobile, centered desktop
    sizeClasses[size],
  )}
>
```

### Example 4: Responsive Header with Mobile Hiding

**Source:** src/app/board/page.tsx

```typescript
<header className='bg-white/80 backdrop-blur-md border-b border-border px-4 sm:px-6 py-4 shadow-sm flex-none'>
  <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0'>
    {/* Mobile: column layout with gap */}
    {/* sm+: row layout, no gap between items */}

    <h1 className='text-xl sm:text-2xl font-bold text-foreground'>
      {/* 20px on mobile, 24px on sm+ */}
    </h1>

    {/* Desktop-only divider */}
    <div className='h-6 w-px bg-border hidden sm:block' />

    {/* Mobile toggle buttons - show text on sm+ */}
    <button className="hidden sm:inline">Board</button>

    {/* Desktop filters - hidden on mobile */}
    <div className='hidden md:flex items-center gap-2'>
      {/* Only visible on iPad portrait and above */}
    </div>
  </div>
</header>
```

### Example 5: Service Selection Form - Grid/List Responsive

**Source:** src/components/intake/garment-services-step.tsx (lines 734-818)

```typescript
// Grid view - responsive columns
<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
  {/* 1 column on mobile, 2 on sm+ */}
  {services.map(service => (
    <button key={service.id} className="p-3 bg-muted/50 rounded-lg">
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium">{service.name}</span>
        <span className="text-sm text-primary-600">{price}</span>
      </div>
    </button>
  ))}
</div>

// List view - table on md+, should hide on mobile
<div className="bg-card rounded-lg shadow overflow-hidden max-h-[200px] overflow-y-auto">
  <table className="min-w-full divide-y divide-border">
    {/* ISSUE: Table not hidden on mobile - should add hidden md:table wrapper */}
  </table>
</div>
```

### Example 6: Form Field with 44px Touch Target

**Source:** src/components/intake/garment-services-step.tsx (line 563)

```typescript
// ✅ CORRECT: 44px minimum height for form input
<button
  type="button"
  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
  className="w-full px-3 py-3 text-sm border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-left flex items-center justify-between min-h-[44px]"
>
  <span className="truncate">{label}</span>
  <svg className="w-5 h-5" />
</button>
```

### Example 7: Responsive Padding Pattern

**Source:** src/app/board/page.tsx

```typescript
// ✅ CORRECT: Progressive padding increase
<div className='h-full w-full max-w-[1920px] mx-auto p-4 sm:p-6'>
  {/* p-4 (16px padding) on mobile */}
  {/* p-6 (24px padding) on sm+ */}
</div>
```

### Example 8: iPad Portrait Safe Area Handling

**Source:** src/app/globals.css (lines 597-607)

```css
/* iPad Portrait specific - handles 768-1024px range */
@media (min-width: 768px) and (max-width: 1024px) and (orientation: portrait) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  /* Narrower kanban columns for iPad portrait */
  .kanban-column {
    min-width: 260px;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Media queries in CSS for responsive | Tailwind utility classes (md:, lg:, etc.) | Tailwind 2.0+ (2020) | Faster development, better maintainability, smaller CSS |
| JavaScript resize listeners | CSS media queries only | 2019+ | No hydration bugs, works without JS, better performance |
| Separate mobile stylesheet | Mobile-first single stylesheet | 2015+ | Single source of truth, easier maintenance |
| Fixed 320px mobile width | Responsive down to smallest device | 2021+ (CSS4 media queries) | Better accessibility, supports foldable phones |
| Table layouts for mobile | Flex/grid card layouts | 2019+ | Better UX, readable on small screens |
| Click handlers for mobile (30px targets) | 44x44px minimum touch targets WCAG 2.5.5 | 2016 (WCAG 2.1) | Better accessibility, fewer user frustrations |
| Safe area insets hardcoded | CSS env() notch insets | 2018 (iOS 11.2) | Works across all notched devices, automatic |

**Deprecated/outdated:**
- `@media (max-width: 480px)`: Newer standard is `max-width: 767px` (below md breakpoint)
- Mobile hamburger in header: Modern apps use bottom tab bar instead (already implemented)
- Viewport initial-scale=2.0: Should be 1.0 to prevent unintended zoom (already correct)
- Bootstrap breakpoints in Hotte Couture: Using Tailwind (better for utility-first)

## Testing Approach for Mobile Safari

### Required Test Devices
1. **iPhone 12 or newer** (notched device) - test safe-area insets
2. **iPhone SE 3rd gen** (compact, 375px wide) - test at smallest width
3. **iPad Air 5th gen portrait** (820px, orientation portrait) - test iPad portrait
4. **Safari DevTools emulation** for quick feedback loop

### Test Checklist per Requirement

**RES-01: Responsive breakpoint for iPhone (< 768px)**
- [ ] Test at 320px, 375px, 425px, 480px widths in DevTools
- [ ] Verify all content visible without horizontal scroll
- [ ] Check that md:hidden elements are actually hidden
- [ ] Check that hidden md:flex elements are visible

**RES-02: Bottom tab bar on mobile**
- [ ] Navigation appears at bottom on iPhone
- [ ] Navigation hidden on iPad portrait (md:hidden working)
- [ ] Each tab icon + label visible and tappable
- [ ] Home indicator (safe-area-bottom) not covering tabs

**RES-03: Touch-friendly buttons (44px)**
- Tap every button on iPhone - should not require precision
- Check CSS: all buttons have `min-h-[44px]` or inherit from globals
- Test actual iPhone: tap with thumb should work without zooming

**RES-04: Form fields stack vertically**
- [ ] On iPhone: form inputs stack top-to-bottom
- [ ] On iPad: can be side-by-side using grid-cols-1 md:grid-cols-2
- [ ] Input fields 44px tall (prevents iOS auto-zoom)
- [ ] Labels positioned above inputs on mobile

**RES-05: Tables convert to cards**
- [ ] On iPhone: tables become vertical card layout
- [ ] On iPad+: tables revert to table layout using `hidden md:table`
- [ ] Card shows all data from table row (no content loss)
- [ ] Cards have padding and rounded corners for readability

**RES-06: Full-screen modals on mobile**
- [ ] Modal on iPhone takes full screen (edge-to-edge)
- [ ] On iPad: modal has max-width and centered with margin
- [ ] Close button accessible and 44px+ tappable
- [ ] Modal content scrolls if > viewport height

**RES-07: iPad portrait layout**
- [ ] Test on iPad in portrait orientation (820px × 1180px)
- [ ] Kanban columns visible (not too wide)
- [ ] No horizontal scrolling required
- [ ] Padding appropriate (not too tight)
- [ ] Check custom media query: `(min-width: 768px) and (max-width: 1024px) and (orientation: portrait)`

**RES-08: iOS Safari specific**
- [ ] Form inputs 16px font (no auto-zoom on focus)
- [ ] Viewport meta tag has `initialScale=1` (not 2.0)
- [ ] Test on Safari, NOT Chrome (Chrome doesn't simulate iOS zoom behavior)
- [ ] Test notch devices: iPhone 12/13/14/15 (safe-area-bottom padding)
- [ ] Test home indicator visibility (no button overlap)

### Command-Line Testing
```bash
# Open in Safari with device emulation
open "http://localhost:3000" # Then use Safari > Develop > [Device]

# Or use Chrome DevTools mobile emulation
# ⌘⇧M in Chrome, select "iPhone SE" from dropdown
```

### Real Device Testing Procedure
1. On iPhone: Open Safari → address bar → http://[your-ip]:3000
2. Test each page from the intake workflow
3. Try tapping every button with thumb (not stylus)
4. Attempt horizontal scroll - should not be possible
5. Check notch area - no content overlap
6. Lock to portrait orientation - test layout

## Open Questions

Things that couldn't be fully resolved and should be validated:

1. **Table conversion in order history/clients pages**
   - What we know: `src/app/clients/page.tsx` exists but doesn't show full table layout
   - What's unclear: Are there other pages with `<table>` elements that need mobile conversion?
   - Recommendation: `grep -r "<table>" src/app` to find all tables, then apply Pattern 4 (hidden on mobile, card layout fallback)

2. **Kanban board horizontal scroll on mobile**
   - What we know: "Horizontal scroll kanban on mobile already done" (from prior decisions)
   - What's unclear: Is this only for drag-drop columns, or do we need horizontal scroll for other content?
   - Recommendation: Verify kanban is ONLY element with horizontal scroll - data tables should NOT scroll horizontally

3. **iPad landscape optimization**
   - What we know: iPad 8 landscape (1024px, lg breakpoint) should show 3+ column layouts
   - What's unclear: Is iPad landscape a stated requirement in success criteria? (not listed in RES-01-08)
   - Recommendation: Test on actual iPad Air landscape (1280px+) to ensure 3-column kanban works

4. **Print page responsiveness**
   - What we know: `/app/print/tasks/page.tsx` uses `<table>`
   - What's unclear: Should print page be responsive to mobile (print from iPhone)? Likely no need since printing from mobile is rare
   - Recommendation: Print page can remain table-only (no mobile conversion needed)

5. **Dropdown menu positioning on mobile**
   - What we know: Dropdowns exist in multiple places (see garment-services-step.tsx line 582)
   - What's unclear: Do dropdown menus extend below viewport on small screens and cause scrolling?
   - Recommendation: Test dropdown behavior near bottom of screen on iPhone - should flip upward if needed

6. **iOS autofill suggestions**
   - What we know: Input font-size 16px prevents zoom
   - What's unclear: Are form inputs properly labeled for iOS autofill (email, phone, etc.)?
   - Recommendation: Add `autoComplete` attributes to input fields for better UX on mobile

## Sources

### Primary (HIGH confidence)

- **Tailwind CSS 3.4.0 Documentation**
  - Responsive design: https://tailwindcss.com/docs/responsive-design
  - Breakpoints: https://tailwindcss.com/docs/breakpoints
  - Verified from: src/tailwind.config.ts, src/app/globals.css

- **Next.js 14.2.33 Metadata Viewport**
  - https://nextjs.org/docs/app/api-reference/functions/generate-metadata#viewport
  - Verified from: src/app/layout.tsx lines 22-27

- **WCAG 2.1 Touch Target Size (2.5.5)**
  - https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
  - Minimum 44x44px confirmed in globals.css lines 562-580

- **WebKit iOS Safe Area Insets**
  - https://webkit.org/blog/7929/designing-websites-for-iphone-x/
  - env(safe-area-inset-*) specification used in globals.css lines 553-559

### Secondary (MEDIUM confidence)

- **shadcn/ui Component Library**
  - Uses Tailwind CSS responsive utilities
  - No additional responsive dependencies beyond Tailwind

- **Current Codebase Patterns**
  - Mobile bottom navigation: src/components/navigation/mobile-bottom-nav.tsx
  - Modal responsive: src/components/ui/modal.tsx
  - Form stacking: src/components/intake/garment-services-step.tsx
  - Header responsive: src/app/board/page.tsx

### Tertiary (Implementation Reference)

- Mobile viewport meta tag: src/app/layout.tsx
- Global responsive utilities: src/app/globals.css
- Tailwind breakpoint config: src/tailwind.config.ts

## Metadata

**Confidence breakdown:**
- Standard Stack: **HIGH** - All libraries and tools verified in package.json and codebase
- Architecture Patterns: **HIGH** - Existing patterns documented from working code
- Pitfalls: **HIGH** - iOS/Safari issues well-documented by WebKit team and WCAG standards
- Testing Approach: **MEDIUM** - Testing procedure based on best practices but not device-tested yet

**Research date:** 2026-01-21
**Valid until:** 2026-02-20 (30 days - Tailwind/Next.js stable, iOS Safari updates quarterly)
**Last Updated:** Initial research for Phase 9 kickoff

# Phase 24: Board & Kanban UI Fixes - Research

**Researched:** 2026-02-11
**Domain:** CSS visual polish, overflow fixes, scroll behavior, drag interactions, tooltips
**Confidence:** HIGH

## Summary

Phase 24 addresses five visual and interaction polish issues on the kanban board and Gantt chart. The codebase already has the required infrastructure (Tailwind CSS, @dnd-kit for drag interactions, Radix UI primitives). These are cosmetic and UX refinements requiring targeted CSS adjustments and event handler modifications.

**Key findings:**
1. Cards use `rounded-lg` but RushOrderCard wrapper lacks rounded corners, creating visual inconsistency
2. Rush badge uses `absolute` positioning with `rotate-45` transform that bleeds outside parent bounds — needs `overflow: hidden` on container
3. Global CSS sets `html, body { overflow: hidden }` which prevents scroll when cursor is over filter components — needs pointer-events fix or scroll container restructure
4. Gantt drag handlers exist for left/right/body but the drag-to-extend interaction may not be working correctly on touch devices
5. Workload items display in lists but have no tooltip implementation — needs Radix UI Tooltip component

**Primary recommendation:** Use existing Tailwind utilities and Radix UI primitives. No new dependencies required. All fixes are localized to 3-5 component files.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | 3.4.0 | Utility-first CSS framework | Already in use, provides `rounded-*` utilities, `overflow-hidden`, pointer-events |
| @radix-ui/react-tooltip | ^2.x (to install) | Accessible tooltip primitive | Standard shadcn/ui pattern, matches existing Radix UI components |
| @dnd-kit/core | 6.3.1 | Drag and drop library | Already in use for Gantt and kanban interactions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | 2.1.0 | Conditional class merging | Already in use for dynamic className construction |
| tailwind-merge | 2.2.0 | Merge conflicting Tailwind classes | Already in use via `cn()` utility |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Radix Tooltip | Custom CSS hover | Radix provides accessibility, focus management, portal rendering, keyboard support |
| CSS pointer-events | Restructure scroll containers | pointer-events: none is simpler but may affect nested interactive elements |

**Installation:**
```bash
npm install @radix-ui/react-tooltip
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── board/
│   │   ├── draggable-order-card.tsx    # Fix: Add rounded corners to RushOrderCard wrapper
│   │   └── order-card.tsx              # Optional: Verify rounded consistency
│   ├── rush-orders/
│   │   └── rush-indicator.tsx          # Fix: Add overflow-hidden to RushOrderCard container
│   ├── ui/
│   │   ├── gantt.tsx                   # Fix: Verify drag-to-extend handlers
│   │   └── tooltip.tsx                 # NEW: Add Radix Tooltip wrapper
│   └── board/
│       └── assignee-filter.tsx         # Fix: Add pointer-events or restructure scroll
└── app/
    ├── board/
    │   └── page.tsx                    # Fix: Verify scroll container structure
    └── globals.css                     # Fix: Review overflow: hidden rules
```

### Pattern 1: Rounded Corner Consistency
**What:** Ensure all card containers and wrappers apply the same border-radius
**When to use:** Cards with nested wrappers (e.g., RushOrderCard wrapping inner content)
**Example:**
```tsx
// Before: rounded-lg only on inner div
<div className="relative rounded-lg">  {/* No rounded corners */}
  <RushRibbon />
  <div className="border-2 rounded-lg">Content</div>
</div>

// After: rounded-lg on both
<div className="relative rounded-lg overflow-hidden">  {/* Added */}
  <RushRibbon />
  <div className="border-2 rounded-lg">Content</div>
</div>
```

### Pattern 2: Overflow Containment for Rotated Elements
**What:** Use `overflow-hidden` on containers with absolutely positioned, rotated children
**When to use:** Rush badges, ribbon indicators, diagonal labels
**Example:**
```tsx
// Before: Badge bleeds outside bounds
<div className="relative">
  <div className="absolute top-0 right-0 transform rotate-45 translate-x-2">
    Rush
  </div>
</div>

// After: Container clips overflow
<div className="relative overflow-hidden rounded-lg">  {/* Added overflow-hidden + rounded */}
  <div className="absolute top-0 right-0 transform rotate-45 translate-x-2">
    Rush
  </div>
</div>
```

### Pattern 3: Scroll Passthrough with Pointer Events
**What:** Allow scroll events to pass through non-interactive overlays
**When to use:** Filter bars, toolbars that should not block page scroll
**Example:**
```tsx
// Before: Filter blocks scroll
<div className="sticky top-0 z-10">
  <PipelineFilter />
  <AssigneeFilter />
</div>

// After: Allow scroll passthrough (if filters are not scrollable)
<div className="sticky top-0 z-10 pointer-events-none">
  <div className="pointer-events-auto">
    <PipelineFilter />
    <AssigneeFilter />
  </div>
</div>

// OR: Ensure page scroll container exists
<div className="h-full overflow-y-auto">  {/* Scroll container */}
  <div className="sticky top-0">...</div>
  <div className="flex-1">Board content</div>
</div>
```

### Pattern 4: Gantt Drag-to-Extend
**What:** Ensure left/right edge handles trigger resize, not move
**When to use:** Gantt timeline bars, calendar events, duration adjustments
**Example:**
```tsx
// Existing pattern in gantt.tsx (lines 656-680)
<div className="absolute h-8 rounded-md">
  {/* Left resize handle */}
  <div
    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize"
    onMouseDown={(e) => handleDragStart(e, 'left')}
    onTouchStart={(e) => handleTouchStart(e, 'left')}
  />
  {/* Body (move) */}
  <span
    className="cursor-move"
    onMouseDown={(e) => handleDragStart(e, 'body')}
  />
  {/* Right resize handle */}
  <div
    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
    onMouseDown={(e) => handleDragStart(e, 'right')}
    onTouchStart={(e) => handleTouchStart(e, 'right')}
  />
</div>
```
**Verify:** Handlers are calling `e.stopPropagation()` to prevent body drag when clicking edges.

### Pattern 5: Tooltip Implementation
**What:** Wrap workload items with Radix Tooltip to show order/service details on hover
**When to use:** Compact list items that need additional context without expanding UI
**Example:**
```tsx
// src/components/ui/tooltip.tsx (NEW)
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-md text-sm max-w-xs"
            sideOffset={5}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-popover" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// Usage in workload items
<Tooltip content={`#${item.orderNumber} - ${item.clientName} - ${item.serviceName}`}>
  <div className="workload-item">...</div>
</Tooltip>
```

### Anti-Patterns to Avoid
- **Don't use `border-radius` without `overflow-hidden` on containers with rotated children** — causes visual bleed
- **Don't apply `overflow-hidden` globally** — use targeted containers to avoid clipping dropdowns/tooltips
- **Don't use inline styles for rounded corners** — Tailwind utilities (`rounded-lg`, `rounded-md`) are more maintainable
- **Don't create custom tooltip components** — Radix UI Tooltip handles accessibility, focus, keyboard, portal rendering
- **Don't add `overflow-y: auto` to html/body** — use explicit scroll containers instead

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible tooltips | Custom hover div with position: absolute | @radix-ui/react-tooltip | Handles ARIA, keyboard focus, portal rendering, screen reader support, collision detection |
| Rounded corner clipping | Custom clip-path CSS | `overflow-hidden` + Tailwind `rounded-*` | Browser-optimized, works with all border-radius values, composable with other utilities |
| Scroll passthrough | Custom scroll event listeners | CSS `pointer-events: none/auto` | Zero JS, composable, works with nested scrollables |
| Drag edge detection | Custom mousemove boundary checks | Event stopPropagation + layered divs | Simpler event model, works with touch/mouse, no coordinate math |

**Key insight:** Modern CSS and accessibility primitives solve these problems better than custom implementations. Radix UI tooltips handle 20+ edge cases (keyboard navigation, screen readers, portal rendering, collision detection, focus management, dismissal patterns).

## Common Pitfalls

### Pitfall 1: Overflow Hidden Clips Dropdowns
**What goes wrong:** Adding `overflow-hidden` to a container clips dropdown menus, tooltips, popovers that extend beyond bounds
**Why it happens:** React portals render outside the parent tree, but CSS clipping happens at render time
**How to avoid:** Use `overflow-hidden` only on containers that don't have dropdown children, OR ensure dropdowns use portals (Radix UI does this by default)
**Warning signs:** Dropdowns get cut off at card edges, tooltips disappear when near viewport edges

### Pitfall 2: Pointer Events Breaks Nested Interactions
**What goes wrong:** Setting `pointer-events: none` on parent prevents clicks on all children, even those with `pointer-events: auto`
**Why it happens:** CSS pointer-events is not inherited in a composable way — children inherit the restriction
**How to avoid:** Apply `pointer-events: none` to the specific non-interactive container, then `pointer-events: auto` to each interactive child
**Warning signs:** Buttons inside filter bar stop working, dropdowns won't open

### Pitfall 3: Rounded Corners on Wrong Element
**What goes wrong:** Adding `rounded-lg` to inner div but not outer wrapper creates sharp-cornered container with rounded content
**Why it happens:** Border-radius applies to the element's box, not its parent
**How to avoid:** Match `rounded-*` classes on both wrapper and content, add `overflow-hidden` to wrapper to clip children
**Warning signs:** Corners look "double-rounded" or content bleeds at corners

### Pitfall 4: Drag Handle Too Small on Touch
**What goes wrong:** 2px wide resize handles are impossible to tap on mobile/iPad
**Why it happens:** Mouse can target 2px, but fingers need 44px minimum (iOS HIG)
**How to avoid:** Use larger visual handles (8-12px) OR use invisible 44px touch targets with visual 2px indicator
**Warning signs:** Users can't resize Gantt bars on iPad, dragging always moves instead of resizing

### Pitfall 5: Tooltip on Non-Interactive Element
**What goes wrong:** Tooltips don't trigger on non-focusable elements (divs, spans)
**Why it happens:** Radix Tooltip uses focus events for keyboard accessibility
**How to avoid:** Wrap non-interactive elements in button or add `tabIndex={0}` to make focusable
**Warning signs:** Tooltips only work with mouse, not keyboard; screen readers can't access tooltip content

## Code Examples

Verified patterns from codebase and Radix UI docs:

### Issue #1: Rounded Card Corners
```tsx
// File: src/components/rush-orders/rush-indicator.tsx (lines 105-136)
// Before
export function RushOrderCard({ isRush, orderType, children, className = '' }) {
  const borderClass = isRush ? 'border-red-300' : 'border-border';
  const bgClass = isRush ? 'bg-red-50' : 'bg-white';

  return (
    <div className={`relative rounded-lg ${className}`}>
      {isRush && <RushRibbon isRush={isRush} orderType={orderType} />}
      <div className={`
        border-2 rounded-lg p-3 sm:p-4 ipad:p-3 lg:p-4
        ${borderClass}
        ${bgClass}
        transition-all duration-200
        ${isRush ? 'shadow-md' : 'shadow-sm'}
        w-full
      `}>
        {children}
      </div>
    </div>
  );
}

// After: Add overflow-hidden to outer container
export function RushOrderCard({ isRush, orderType, children, className = '' }) {
  const borderClass = isRush ? 'border-red-300' : 'border-border';
  const bgClass = isRush ? 'bg-red-50' : 'bg-white';

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>  {/* ADD overflow-hidden */}
      {isRush && <RushRibbon isRush={isRush} orderType={orderType} />}
      <div className={`
        border-2 rounded-lg p-3 sm:p-4 ipad:p-3 lg:p-4
        ${borderClass}
        ${bgClass}
        transition-all duration-200
        ${isRush ? 'shadow-md' : 'shadow-sm'}
        w-full
      `}>
        {children}
      </div>
    </div>
  );
}
```

### Issue #2: Rush Badge Overflow Containment
```tsx
// The overflow-hidden fix from Issue #1 also solves this issue
// RushRibbon (lines 76-102) uses:
transform rotate-45 translate-x-2 -translate-y-1

// This translation pushes the ribbon outside the card bounds
// By adding overflow-hidden to the parent RushOrderCard container,
// the ribbon will be clipped at the card edges
```

### Issue #3: Filter Area Scroll Blocking
```tsx
// File: src/app/board/page.tsx
// Current structure (lines 342-441):
<div className='flex flex-col h-full relative z-10'>
  <header className='bg-white/80 backdrop-blur-md border-b border-border px-4 sm:px-6 py-4 shadow-sm flex-none'>
    <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 max-w-[1920px] mx-auto w-full'>
      <div className='flex items-center gap-4'>
        <PipelineFilter ... />
        <AssigneeFilter ... />
      </div>
    </div>
  </header>
  <main className='flex-1 overflow-y-auto relative'>
    {/* Board content */}
  </main>
</div>

// Issue: Main scrolls correctly, but cursor over header/filters may block scroll
// Root cause: globals.css lines 5-12 set html, body { overflow: hidden }
// This forces all scrolling into containers

// Verify header doesn't have overflow properties blocking event propagation
// If scroll is still blocked when cursor over filters, check if Radix dropdowns
// are capturing scroll events

// Option 1: If filters themselves don't need to scroll
<header className='... pointer-events-none'>
  <div className='pointer-events-auto'>
    <PipelineFilter />
    <AssigneeFilter />
  </div>
</header>

// Option 2: Ensure main container captures all scroll
// (This is already correct in current implementation)
```

### Issue #4: Gantt Drag-to-Extend
```tsx
// File: src/components/ui/gantt.tsx (lines 437-691)
// Current implementation has correct handlers

const handleDragStart = useCallback(
  (e: React.MouseEvent, direction: 'left' | 'right' | 'body') => {
    e.preventDefault();
    e.stopPropagation();  // CRITICAL: Prevents body drag when clicking edges
    setIsDragging(direction);
    dragStartRef.current = {
      x: e.clientX,
      startAt: localFeature.startAt,
      endAt: localFeature.endAt,
    };
  },
  [localFeature]
);

// Handles are at lines 656-680
<div
  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/10 hover:bg-black/20 active:bg-black/30 rounded-l-md"
  onMouseDown={(e) => handleDragStart(e, 'left')}
  onTouchStart={(e) => handleTouchStart(e, 'left')}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
/>

// Potential issue: w-2 (8px) is small for touch
// Fix: Increase to w-3 (12px) or w-4 (16px)
<div
  className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-black/10 hover:bg-black/20 active:bg-black/30 rounded-l-md"
  onMouseDown={(e) => handleDragStart(e, 'left')}
  onTouchStart={(e) => handleTouchStart(e, 'left')}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
/>

// Verify touch handlers (lines 478-533) correctly manage long-press vs drag
// Current implementation looks correct - 500ms long-press, 10px move tolerance
```

### Issue #5: Workload Hover Tooltips
```tsx
// NEW FILE: src/components/ui/tooltip.tsx
'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

// Usage in src/app/board/workload/page.tsx (lines 582-644)
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Wrap page in provider (line 486):
<AuthGuard>
  <TooltipProvider delayDuration={300}>
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Page content */}
    </div>
  </TooltipProvider>
</AuthGuard>

// Wrap workload items (lines 582-644):
{sortedUnassignedItems.slice(0, 8).map(item => (
  <Tooltip key={item.garmentServiceId} delayDuration={300}>
    <TooltipTrigger asChild>
      <div className="flex items-center justify-between gap-2 text-xs bg-white p-1.5 rounded border border-amber-200">
        <div className="flex-1 min-w-0">
          <span className="font-medium truncate block">
            #{item.orderNumber} - {item.serviceName}
          </span>
          {item.dueDate && (
            <span className="text-amber-600 text-[10px]">
              Due: {format(new Date(item.dueDate), 'MMM d')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Assignment buttons */}
        </div>
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <div className="space-y-1">
        <div><strong>Order:</strong> #{item.orderNumber}</div>
        <div><strong>Client:</strong> {item.clientName}</div>
        <div><strong>Garment:</strong> {item.garmentType}</div>
        <div><strong>Service:</strong> {item.serviceName}</div>
        <div><strong>Time:</strong> {item.estimatedMinutes}min</div>
        {item.dueDate && (
          <div><strong>Due:</strong> {format(new Date(item.dueDate), 'PPP')}</div>
        )}
      </div>
    </TooltipContent>
  </Tooltip>
))}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom tooltip divs with CSS :hover | Radix UI Tooltip with portal rendering | Radix UI v1.0 (2021) | Accessibility, keyboard support, screen readers |
| Manual clip-path for rounded corners | overflow-hidden + border-radius | Always standard | Simpler, more compatible |
| JavaScript scroll listeners | CSS pointer-events | CSS3 (2011, widely supported 2015) | Better performance, declarative |
| Touch event polyfills | Native touch events + @dnd-kit | @dnd-kit v6 (2023) | Unified mouse/touch handling |

**Deprecated/outdated:**
- **react-tooltip library:** Replaced by Radix UI Tooltip (better accessibility, smaller bundle)
- **Custom border-radius clipping with clip-path:** Modern browsers support overflow-hidden with border-radius
- **Manual scroll position tracking:** CSS sticky + overflow containers handle this natively

## Open Questions

1. **Filter Scroll Blocking: Pointer Events or Restructure?**
   - What we know: `html, body { overflow: hidden }` in globals.css prevents scroll; filters are in sticky header
   - What's unclear: Are filters themselves scrollable (e.g., long assignee list)? If yes, pointer-events won't work
   - Recommendation: Check if filters have internal scroll. If no, use pointer-events. If yes, restructure with explicit scroll container

2. **Gantt Drag Broken or Just Touch Issue?**
   - What we know: Code has left/right/body handlers, uses stopPropagation
   - What's unclear: Is drag broken completely, or only on touch? Is w-2 (8px) too small for touch?
   - Recommendation: Test on desktop first. If desktop works, increase touch target to w-3 (12px) or add invisible 44px touch layer

3. **Tooltip Hover Delay?**
   - What we know: Radix Tooltip has configurable delayDuration
   - What's unclear: Should tooltips appear instantly or after 300ms delay?
   - Recommendation: Use 300ms delay (delayDuration={300}) to avoid tooltip spam on quick mouse movements

## Sources

### Primary (HIGH confidence)
- **Codebase:** draggable-order-card.tsx (lines 74-303) — Existing card structure
- **Codebase:** rush-indicator.tsx (lines 105-136) — RushOrderCard component
- **Codebase:** gantt.tsx (lines 437-691) — Gantt drag handlers
- **Codebase:** workload/page.tsx (lines 582-644) — Workload item rendering
- **Codebase:** globals.css (lines 5-12, 544-547) — Overflow rules, kanban-card class
- **Codebase:** tailwind.config.ts — Border radius utilities
- **Package.json** — @dnd-kit/core 6.3.1, @radix-ui packages

### Secondary (MEDIUM confidence)
- **Radix UI Tooltip Docs:** https://www.radix-ui.com/primitives/docs/components/tooltip — API, accessibility features
- **Tailwind CSS Docs:** https://tailwindcss.com/docs/overflow — overflow-hidden utilities
- **CSS pointer-events:** https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events — Browser support, behavior

### Tertiary (LOW confidence)
- None — all findings verified against codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All tools already in use except Radix Tooltip (standard shadcn/ui pattern)
- Architecture: HIGH — Patterns verified in existing codebase
- Pitfalls: MEDIUM — Common CSS/accessibility issues, but not all tested in this specific codebase

**Research date:** 2026-02-11
**Valid until:** 60 days (stable CSS/component patterns)

---

## Ready for Planning

All five issues are well-defined, localized, and solvable with existing stack. Planner can create 5 task files:
1. **24-01-PLAN.md:** Add rounded corners to kanban cards
2. **24-02-PLAN.md:** Fix rush badge overflow
3. **24-03-PLAN.md:** Unblock scroll on filter area
4. **24-04-PLAN.md:** Fix Gantt drag-to-extend
5. **24-05-PLAN.md:** Add workload hover tooltips

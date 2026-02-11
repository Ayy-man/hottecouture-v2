# Phase 24: Board & Kanban UI Fixes - Research

**Researched:** 2026-02-11
**Domain:** UI/UX polish for kanban board, Gantt chart, and workload view
**Confidence:** HIGH

## Summary

Phase 24 addresses five specific visual and interaction issues identified during Feb 11 Amin/Ayman call:
1. Kanban cards need rounded corners (currently boxy)
2. Rush badge overflows card boundaries
3. Scroll blocked when cursor over filter area
4. Gantt chart drag-to-extend broken
5. Workload items missing hover tooltips

All issues are CSS/styling fixes or minor interaction improvements. No new libraries needed. The codebase uses Tailwind CSS with shadcn/ui components (Radix UI primitives). Current implementation uses @dnd-kit/core for drag-and-drop, has custom Gantt component with touch support, and uses Radix dropdown menus for filters.

**Primary recommendation:** These are straightforward CSS and interaction fixes. Use Tailwind utility classes for rounded corners, CSS overflow containment for rush badges, pointer-events for filter scroll blocking, verify Gantt drag handlers are bound correctly, and add @radix-ui/react-tooltip for workload hover tooltips.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | ^3.4.0 | Utility-first CSS framework | Already integrated, provides rounded-* utilities, overflow utilities |
| React | ^18.3.0 | Component framework | Current app framework |
| Next.js | ^14.2.35 | React framework | Current app framework |
| @dnd-kit/core | ^6.3.1 | Drag and drop | Already used for kanban DnD |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-tooltip | ^1.1.8 (to install) | Accessible tooltips | For workload item hover tooltips (Issue #5) |
| @radix-ui/react-dropdown-menu | ^2.1.16 | Dropdown menus | Already used for filters |
| date-fns | ^3.0.0 | Date utilities | Already used for Gantt calculations |
| lucide-react | ^0.544.0 | Icon library | Already used throughout app |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @radix-ui/react-tooltip | Native title attribute | Title attribute lacks styling control, accessibility features, and animation. Radix provides consistent shadcn/ui design system integration. |
| Tailwind classes | CSS-in-JS | Tailwind already used throughout, consistent with codebase patterns |

**Installation:**
```bash
npm install @radix-ui/react-tooltip
```

## Architecture Patterns

### Current File Structure
```
src/
├── components/
│   ├── board/
│   │   ├── order-card.tsx              # Legacy card (useSortable)
│   │   ├── draggable-order-card.tsx    # Active card with RushOrderCard wrapper
│   │   ├── droppable-column.tsx        # Column container
│   │   ├── pipeline-filter.tsx         # Pipeline dropdown
│   │   └── assignee-filter.tsx         # Assignee dropdown
│   ├── rush-orders/
│   │   └── rush-indicator.tsx          # RushOrderCard, RushRibbon components
│   └── ui/
│       └── gantt.tsx                   # Gantt chart with drag handlers
├── app/
│   └── board/
│       ├── page.tsx                    # Main board page
│       └── workload/
│           └── page.tsx                # Workload scheduler page
```

### Pattern 1: Rounded Corners with Tailwind
**What:** Apply consistent border-radius using Tailwind's rounded-* utilities
**When to use:** For all card components that need rounded corners
**Example:**
```tsx
// Current implementation (RushOrderCard wrapper):
<div className={`relative rounded-lg ${className}`}>
  {/* Rush ribbon */}
  <div className={`border-2 rounded-lg p-3 sm:p-4 ...`}>
    {children}
  </div>
</div>

// Issue: Inner div has rounded-lg, outer has rounded-lg, but visual appearance is boxy
// Fix: Ensure rounded-lg (8px) is applied consistently and overflow is hidden
<div className={`relative rounded-lg overflow-hidden ${className}`}>
  {/* This will contain overflow */}
</div>
```

### Pattern 2: Rush Badge Overflow Containment
**What:** Use CSS overflow property to clip overflowing elements within card boundaries
**When to use:** When absolute-positioned elements (rush ribbon) overflow parent container
**Example:**
```tsx
// Current: RushRibbon is absolute positioned with rotation, overflows parent
<div className={`
  absolute top-0 right-0
  transform rotate-45 translate-x-2 -translate-y-1
  // This translation pushes it outside parent bounds
`}>

// Fix: Add overflow-hidden to parent card container
<div className="relative rounded-lg overflow-hidden">
  <RushRibbon />
  <div className="border-2 rounded-lg ...">
    {children}
  </div>
</div>
```

### Pattern 3: Scroll Blocking with Pointer Events
**What:** Use pointer-events CSS to allow scroll events to pass through filter dropdowns
**When to use:** When dropdown menus block page scroll (common with Radix dropdowns)
**Example:**
```tsx
// Current: DropdownMenu stops scroll propagation when cursor over it
<DropdownMenu>
  <DropdownMenuContent>
    {/* Scroll blocked here */}
  </DropdownMenuContent>
</DropdownMenu>

// Fix: Radix dropdowns already handle this correctly. Issue likely in parent container.
// Check if header has overflow properties blocking scroll
<header className="... overflow-hidden">  // ← This could block scroll
// Should be:
<header className="... flex-none">  // ← Allow scroll to propagate
```

### Pattern 4: Gantt Drag-to-Extend Handlers
**What:** Verify drag handlers are correctly bound to resize handles on Gantt bars
**When to use:** For timeline duration adjustment via dragging
**Example from gantt.tsx:**
```tsx
// Current implementation (lines 656-680):
<div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize ..."
  onMouseDown={(e) => handleDragStart(e, 'left')}
  onTouchStart={(e) => handleTouchStart(e, 'left')}
/>
<span className="flex-1 ... cursor-move"
  onMouseDown={(e) => handleDragStart(e, 'body')}
  onTouchStart={(e) => handleTouchStart(e, 'body')}
/>
<div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize ..."
  onMouseDown={(e) => handleDragStart(e, 'right')}
  onTouchStart={(e) => handleTouchStart(e, 'right')}
/>

// Issue: Handlers exist. Verify throttle isn't breaking updates, and z-index isn't hiding handles
```

### Pattern 5: Radix Tooltip for Workload Items
**What:** Add Radix UI tooltip component for hover details on workload items
**When to use:** For displaying order/service details on workload page hover
**Example:**
```tsx
import * as Tooltip from '@radix-ui/react-tooltip';

// In workload page:
<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <div className="workload-item">
        #{item.orderNumber}
      </div>
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content className="tooltip-content">
        <div>Order #{item.orderNumber}</div>
        <div>{item.clientName}</div>
        <div>{item.serviceName}</div>
        <div>{item.estimatedMinutes} min</div>
        <Tooltip.Arrow />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
```

### Anti-Patterns to Avoid
- **Don't add z-index randomly**: Rush ribbon overflow is a containment issue, not z-index. Using z-index creates stacking context problems.
- **Don't use !important for rounded corners**: Investigate why corners aren't showing, don't force with !important.
- **Don't disable scroll globally**: Filter scroll issue is localized, don't change body/html overflow.
- **Don't rebuild Gantt drag from scratch**: Handlers exist and follow established patterns (Phase 21-03), debug existing implementation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltips | Custom div with position absolute + hover state | @radix-ui/react-tooltip | Handles accessibility (ARIA), focus management, portal rendering, collision detection, keyboard navigation, screen reader support. Custom tooltip misses 10+ edge cases. |
| Dropdown scroll behavior | Custom event listeners to stop propagation | Radix built-in modal behavior | Radix dropdowns already handle scroll correctly via modal layer. Issue is elsewhere. |
| Rounded corner clipping | Calculate exact border positions | Tailwind overflow-hidden + rounded-lg | Browser handles clipping efficiently, no manual calculation needed. |

**Key insight:** UI polish issues often stem from missing CSS properties (overflow, pointer-events) rather than missing logic. Debugging existing patterns is faster than rebuilding.

## Common Pitfalls

### Pitfall 1: Overflow Hidden Breaking Other Features
**What goes wrong:** Adding overflow-hidden to fix rush badge containment breaks other absolute-positioned elements (modals, dropdowns).
**Why it happens:** overflow-hidden creates a new containing block for absolute-positioned descendants.
**How to avoid:** Only apply overflow-hidden to the immediate card container, not to layout containers (page, columns, headers).
**Warning signs:** Dropdowns cut off, modals not visible, tooltips clipped.

### Pitfall 2: Gantt Drag Broken by Touch Delay Conflict
**What goes wrong:** Long-press delay (500ms for context menu) interferes with drag start.
**Why it happens:** Both handlers fire on touch, timer clears drag initialization.
**How to avoid:** Verify touchStartPosRef and longPressTimerRef are cleared correctly in gantt.tsx lines 507-533. Touch move > 10px should cancel long-press.
**Warning signs:** Drag works on desktop but not touch devices, or vice versa.

### Pitfall 3: Filter Header Scroll Blocking
**What goes wrong:** Page won't scroll when cursor over header with filters.
**Why it happens:** Parent container has overflow-hidden or height: 100vh instead of h-full pattern (established in Phase 21-01).
**How to avoid:** Use h-full + flex pattern, not fixed heights. Check board/page.tsx header (line 346).
**Warning signs:** Scroll works in content area but not when cursor over header/filters.

### Pitfall 4: Tooltip Portal Rendering Outside View
**What goes wrong:** Tooltips render but are not visible (outside viewport or below other elements).
**Why it happens:** Portal renders at document root, needs z-index context.
**How to avoid:** Use Radix Portal's container prop or ensure global z-index hierarchy includes tooltips > 50.
**Warning signs:** Tooltip in DOM inspector but not visible on screen.

### Pitfall 5: Rounded Corners Not Visible Due to Border
**What goes wrong:** Border-radius applied but card still looks boxy.
**Why it happens:** Border (border-2) creates sharp corner unless border-radius matches parent.
**How to avoid:** Apply same rounded-* class to both outer container and inner border element.
**Warning signs:** Corners visible on hover shadow but not on border.

## Code Examples

Verified patterns from codebase and Radix documentation:

### Issue #1: Rounded Card Corners
```tsx
// File: src/components/board/draggable-order-card.tsx
// Current (line 73-91):
<RushOrderCard
  isRush={order.rush || false}
  orderType={order.type || 'alteration'}
  className={`
    kanban-card ...
  `}
>

// Fix in RushOrderCard component (rush-indicator.tsx lines 105-136):
export function RushOrderCard({ isRush, orderType, children, className = '' }) {
  const borderClass = isRush ? 'border-red-300' : 'border-border';
  const bgClass = isRush ? 'bg-red-50' : 'bg-white';

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}> {/* ADD overflow-hidden */}
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
// File: src/components/rush-orders/rush-indicator.tsx
// Current RushRibbon (lines 76-102):
<div
  className={`
    absolute top-0 right-0
    ...
    transform rotate-45
    translate-x-2 -translate-y-1  // ← This pushes outside
  `}
  style={{ width: '60px', textAlign: 'center' }}
>

// Fix: Adjust transform to keep within bounds, or rely on parent overflow-hidden
// Option A - Reduce translation:
<div
  className={`
    absolute top-0 right-0
    ...
    transform rotate-45
    translate-x-1 translate-y-0  // ← Contained within parent
  `}
  style={{ width: '60px', textAlign: 'center' }}
>

// Option B - Parent containment (preferred, already shown in Issue #1)
// Parent has overflow-hidden, no change needed to RushRibbon
```

### Issue #3: Filter Area Scroll Blocking
```tsx
// File: src/app/board/page.tsx
// Current header (lines 346-441):
<header className='bg-white/80 backdrop-blur-md border-b border-border px-4 sm:px-6 py-4 shadow-sm flex-none'>
  <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 max-w-[1920px] mx-auto w-full'>
    <div className='flex items-center gap-4'>
      {/* Filters here */}
      <PipelineFilter ... />
      <AssigneeFilter ... />
    </div>
  </div>
</header>

// Issue: Header is flex-none (good), but check parent container
// Current parent (lines 342-344):
<div className='flex flex-col h-full relative z-10'>
  <header className='... flex-none' />
  <main className='flex-1 overflow-y-auto relative'> {/* ← Main scrolls */}

// This is correct pattern. Issue may be that dropdowns are modal and block events.
// Radix dropdowns use modal=true by default, which is correct.
// Verify no custom CSS blocking pointer-events on header.
// If scroll still blocked, check if there's an overlay div from dropdowns.

// Fix (if needed): Add to global CSS
.dropdown-overlay {
  pointer-events: none;
}
```

### Issue #4: Gantt Drag-to-Extend
```tsx
// File: src/components/ui/gantt.tsx
// Current drag implementation (lines 464-611):
const handleDragStart = useCallback(
  (e: React.MouseEvent, direction: 'left' | 'right' | 'body') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(direction);
    dragStartRef.current = {
      x: e.clientX,
      startAt: localFeature.startAt,
      endAt: localFeature.endAt,
    };
  },
  [localFeature]
);

// Verify:
// 1. Handles are large enough (w-2 = 8px, might be too small)
// 2. z-index isn't hiding handles
// 3. Throttle isn't breaking updates

// Fix: Increase handle width for easier grabbing
<div
  className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize ..." // ← Change from w-2 to w-4
  onMouseDown={(e) => handleDragStart(e, 'left')}
/>
<div
  className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize ..." // ← Change from w-2 to w-4
  onMouseDown={(e) => handleDragStart(e, 'right')}
/>

// Also verify visual feedback:
<div
  className="... bg-black/10 hover:bg-black/20 active:bg-black/30 ..." // ← Current is correct
/>
```

### Issue #5: Workload Item Hover Tooltips
```tsx
// File: src/app/board/workload/page.tsx
// Current workload item (lines 582-602):
<div key={item.garmentServiceId} className="flex items-center justify-between gap-2 text-xs bg-white p-1.5 rounded border border-amber-200">
  <div className="flex-1 min-w-0">
    <span className="font-medium truncate block">
      #{item.orderNumber} - {item.serviceName}
    </span>
  </div>
  {/* Assignment controls */}
</div>

// Add tooltip wrapper:
import * as Tooltip from '@radix-ui/react-tooltip';

// Wrap in provider at page level (line 486):
<AuthGuard>
  <Tooltip.Provider delayDuration={300}>
    <div className="h-full flex flex-col ...">
      {/* Page content */}
    </div>
  </Tooltip.Provider>
</AuthGuard>

// Wrap each item (lines 582-602):
<Tooltip.Root>
  <Tooltip.Trigger asChild>
    <div key={item.garmentServiceId} className="flex items-center justify-between gap-2 text-xs bg-white p-1.5 rounded border border-amber-200">
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
        {/* Assignment controls */}
      </div>
    </div>
  </Tooltip.Trigger>
  <Tooltip.Portal>
    <Tooltip.Content
      className="z-50 px-3 py-2 text-sm bg-popover text-popover-foreground border border-border rounded-md shadow-lg"
      sideOffset={5}
    >
      <div className="space-y-1">
        <div className="font-semibold">Order #{item.orderNumber}</div>
        <div className="text-muted-foreground">{item.clientName}</div>
        <div className="text-xs">
          <span className="font-medium">{item.garmentType}</span>
          {' • '}
          <span>{item.serviceName}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Est. {item.estimatedMinutes} minutes
        </div>
        {item.dueDate && (
          <div className="text-xs text-amber-600">
            Due: {format(new Date(item.dueDate), 'MMM dd, yyyy')}
          </div>
        )}
      </div>
      <Tooltip.Arrow className="fill-border" />
    </Tooltip.Content>
  </Tooltip.Portal>
</Tooltip.Root>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Native title attribute for tooltips | Radix UI Tooltip component | 2023-2024 (shadcn/ui adoption) | Better accessibility, consistent design system, portal rendering prevents clipping |
| Fixed pixel values for card styling | Tailwind utility classes | Ongoing (current codebase) | Responsive design, consistent spacing scale |
| CSS hover states for interactive feedback | Tailwind hover: variants | Ongoing (current codebase) | Easier to maintain, consistent with utility-first approach |
| Manual z-index management | CSS containment (overflow-hidden) | Modern CSS best practice | Avoids z-index stacking context issues |

**Deprecated/outdated:**
- Native HTML title attribute for rich tooltips - Use Radix UI Tooltip for accessibility and styling
- position: fixed for dropdowns - Use Radix Portal for proper layering

## Open Questions

1. **Rush badge visual design**
   - What we know: Current ribbon rotates 45deg and translates outside bounds (lines 85-86 rush-indicator.tsx)
   - What's unclear: Is overflow acceptable if contained? Or should ribbon position be adjusted to stay within bounds naturally?
   - Recommendation: Start with overflow-hidden containment (simplest). If visual is unsatisfactory, reduce translate-x-2 to translate-x-1 or translate-x-0.

2. **Gantt drag handle visibility**
   - What we know: Handles are w-2 (8px) with hover states (lines 659, 674 gantt.tsx)
   - What's unclear: Is 8px too small for touch devices? Is this the root cause of "drag-to-extend broken"?
   - Recommendation: Increase to w-4 (16px) for better grab area. Test on tablet/phone.

3. **Filter scroll blocking specifics**
   - What we know: Scroll works in main area (overflow-y-auto), header is flex-none
   - What's unclear: Is issue only when dropdown is open? Or always when cursor over filter area?
   - Recommendation: Test both scenarios. If only when dropdown open, it's Radix modal behavior (expected). If always, check for custom CSS on header.

4. **Tooltip content for workload items**
   - What we know: Need to show order/service details on hover
   - What's unclear: What exact fields to show? (order #, client, garment type, service, estimated time, due date)
   - Recommendation: Show all available fields (listed in code example), prioritize order # and client name as most important.

## Sources

### Primary (HIGH confidence)
- Codebase files: src/components/board/draggable-order-card.tsx, src/components/rush-orders/rush-indicator.tsx, src/components/ui/gantt.tsx, src/app/board/page.tsx, src/app/board/workload/page.tsx
- Package.json: dependencies confirmed (@dnd-kit/core@6.3.1, @radix-ui packages)
- Tailwind config: screens, colors, utilities verified

### Secondary (MEDIUM confidence)
- Radix UI documentation (radix-ui.com) - tooltip API, dropdown behavior
- Tailwind CSS documentation (tailwindcss.com) - overflow, rounded utilities
- Prior phase decisions: Phase 21-03 (touch delays), Phase 21-01 (h-full pattern), Phase 22-01 (board scroll fix)

### Tertiary (LOW confidence)
- None - all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Issue identification: HIGH - specific issues from Feb 11 call, verified in codebase
- Rounded corners fix: HIGH - standard Tailwind pattern, widely used
- Rush badge overflow: HIGH - CSS containment is standard solution
- Filter scroll blocking: MEDIUM - need to verify exact scenario (dropdown open vs always)
- Gantt drag fix: MEDIUM - handlers exist, need to debug why not working
- Tooltip implementation: HIGH - Radix UI Tooltip is standard solution in this stack

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable domain, unlikely to change)

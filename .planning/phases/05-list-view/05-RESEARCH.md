# Phase 05: List View + Product Names - Research

**Researched:** 2026-01-20
**Domain:** UI view modes, service display, localStorage persistence
**Confidence:** HIGH

## Summary

This phase adds a list view option to the GarmentServicesStep component and replaces any generic item labels with actual product names. The codebase already has an established pattern for view toggles (Grid/List) in the board page that should be replicated.

Key findings:
- The board page (`/src/app/board/page.tsx`) already implements a Grid/List view toggle using state and lucide-react icons
- `GarmentServicesStep` is the merged component from Phase 3 that handles garment selection + service selection in one step
- Services are displayed in a grid layout currently, will need list view alternative
- Product names come from `service.name` field in the database - no "Number 1", "Number 2" pattern was found in the codebase
- localStorage pattern is established via `useCurrentStaff` hook - view preference should follow same pattern

**Primary recommendation:** Replicate the board page's view toggle pattern directly into GarmentServicesStep, using the same icons and styling for consistency.

## Standard Stack

The established libraries/tools already in use:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lucide-react | in package.json | Icons (LayoutGrid, List) | Already used for board view toggle |
| React useState | built-in | View mode state management | Standard React pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| localStorage | browser API | Persist view preference | For "View preference persists across sessions" requirement |
| Tailwind CSS | in project | Styling grid/list layouts | Project standard |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| localStorage | sessionStorage | Doesn't persist across sessions |
| Custom hook | Direct localStorage calls | Hook provides reusability |

## Architecture Patterns

### Existing View Toggle Pattern (from board/page.tsx)

```typescript
// Source: /src/app/board/page.tsx lines 48, 297-315
const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

// Toggle UI
<div className='flex bg-muted p-1 rounded-lg border border-border'>
  <Button
    variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
    size='sm'
    onClick={() => setViewMode('kanban')}
    className={`gap-2 h-8 ${viewMode === 'kanban' ? 'shadow-sm ring-1 ring-black/5' : 'text-muted-foreground hover:text-foreground'}`}
  >
    <LayoutGrid className='w-4 h-4' />
    <span className='hidden sm:inline'>Board</span>
  </Button>
  <Button
    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
    size='sm'
    onClick={() => setViewMode('list')}
    className={`gap-2 h-8 ${viewMode === 'list' ? 'shadow-sm ring-1 ring-black/5' : 'text-muted-foreground hover:text-foreground'}`}
  >
    <List className='w-4 h-4' />
    <span className='hidden sm:inline'>List</span>
  </Button>
</div>

// Conditional rendering
{viewMode === 'kanban' ? (
  <InteractiveBoard ... />
) : (
  <OrderListView ... />
)}
```

### Existing List View Pattern (from order-list-view.tsx)

```typescript
// Source: /src/components/board/order-list-view.tsx
<div className='bg-card rounded-lg shadow overflow-hidden'>
  <table className='min-w-full divide-y divide-border'>
    <thead className='bg-muted/50'>
      <tr>
        <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
          Column Header
        </th>
        ...
      </tr>
    </thead>
    <tbody className='bg-card divide-y divide-border'>
      {items.map(item => (
        <tr key={item.id} className='hover:bg-muted/50'>
          <td className='px-4 py-3 whitespace-nowrap'>Content</td>
          ...
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### localStorage Persistence Pattern (from useCurrentStaff.ts)

```typescript
// Source: /src/lib/hooks/useCurrentStaff.ts
const STORAGE_KEY = 'hc_staff_session';

// Load from localStorage on mount
useEffect(() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setState(parsed);
    }
  } catch (err) {
    console.error('Failed to load session:', err);
    localStorage.removeItem(STORAGE_KEY);
  } finally {
    setIsLoading(false);
  }
}, []);

// Save to localStorage
const save = useCallback((data: SessionData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  setSession(data);
}, []);
```

### Recommended Project Structure Addition
```
src/
├── lib/
│   └── hooks/
│       └── useViewPreference.ts    # New hook for view persistence
├── components/
│   └── intake/
│       └── garment-services-step.tsx  # Modify existing
```

### Anti-Patterns to Avoid
- **Inline localStorage calls:** Use a custom hook for consistency and error handling
- **Missing error boundaries:** localStorage can throw in private browsing mode

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| View toggle UI | Custom toggle component | Copy board page pattern | Consistency, already tested |
| Table styling | Custom table styles | Copy order-list-view.tsx pattern | Matches Pipeline section style (requirement UI-08) |
| Storage persistence | Raw localStorage | Create hook following useCurrentStaff pattern | Error handling, SSR safety |

**Key insight:** All UI patterns needed for this phase already exist in the codebase. The implementation is primarily about adapting existing patterns to the GarmentServicesStep context.

## Common Pitfalls

### Pitfall 1: SSR/Hydration Issues with localStorage
**What goes wrong:** `localStorage is not defined` errors on server
**Why it happens:** Next.js renders on server first, localStorage is browser-only
**How to avoid:**
- Check `typeof window !== 'undefined'` before accessing
- Use `useEffect` for all localStorage reads (not in useState initializer)
- Default to 'grid' view until client-side hydration completes
**Warning signs:** Hydration mismatch errors in console

### Pitfall 2: View Toggle Not Visible on Mobile
**What goes wrong:** Toggle buttons hidden or too small on mobile
**Why it happens:** Space constraints, responsive design oversight
**How to avoid:**
- Use `hidden sm:inline` for labels (like board page does)
- Keep icon-only on mobile, add labels on desktop
- Ensure touch targets are at least 44px
**Warning signs:** Visual testing on mobile device/simulator

### Pitfall 3: "Number 1" Labels Not Found
**What goes wrong:** Requirement mentions "Number 1, Number 2" but no such pattern exists
**Why it happens:** Requirements may be based on old version or different codebase
**How to avoid:**
- The current codebase uses actual product names (`service.name`, `garment.type`)
- Verify with stakeholder if this is still a real issue
- If found dynamically generated, trace the generation logic
**Warning signs:** Grep search found no "Number 1" patterns in src/

### Pitfall 4: Long Product Names Overflow
**What goes wrong:** Names break table layout or overflow containers
**Why it happens:** Variable content length, fixed column widths
**How to avoid:**
- Use `truncate` Tailwind class with `max-w-*`
- Add `title` attribute for full name on hover (native tooltip)
- Consider CSS `text-overflow: ellipsis`
**Warning signs:** Testing with long product names

## Code Examples

### Example 1: View Toggle Hook (to create)

```typescript
// Source: Pattern from useCurrentStaff.ts, adapted for view preference
// File: /src/lib/hooks/useViewPreference.ts

'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'hc_services_view_mode';

export type ViewMode = 'grid' | 'list';

export function useViewPreference(defaultMode: ViewMode = 'grid') {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'grid' || stored === 'list') {
          setViewMode(stored);
        }
      }
    } catch (err) {
      console.error('Failed to load view preference:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Persist changes to localStorage
  const setAndPersistViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, mode);
      }
    } catch (err) {
      console.error('Failed to save view preference:', err);
    }
  }, []);

  return {
    viewMode,
    setViewMode: setAndPersistViewMode,
    isLoaded,
  };
}
```

### Example 2: List View for Services

```typescript
// Pattern from order-list-view.tsx adapted for services
// Columns: Service | Price | Time | Select

<table className='min-w-full divide-y divide-border'>
  <thead className='bg-muted/50'>
    <tr>
      <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
        Service
      </th>
      <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
        Price
      </th>
      <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
        Time
      </th>
      <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider'>
        Select
      </th>
    </tr>
  </thead>
  <tbody className='bg-card divide-y divide-border'>
    {services.map(service => (
      <tr key={service.id} className='hover:bg-muted/50'>
        <td className='px-4 py-3 whitespace-nowrap'>
          <span className='truncate max-w-[200px] block' title={service.name}>
            {service.name}
          </span>
        </td>
        <td className='px-4 py-3 whitespace-nowrap font-medium'>
          {formatCurrency(service.base_price_cents)}
        </td>
        <td className='px-4 py-3 whitespace-nowrap text-muted-foreground text-sm'>
          {service.estimated_minutes ? `${service.estimated_minutes}m` : '-'}
        </td>
        <td className='px-4 py-3 whitespace-nowrap'>
          <Button
            size='sm'
            onClick={() => addServiceToCurrentGarment(service)}
          >
            Add
          </Button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### Example 3: Truncation with Tooltip

```typescript
// Native HTML tooltip via title attribute
<span
  className='truncate max-w-[200px] block'
  title={service.name}  // Full name shows on hover
>
  {service.name}
</span>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A - new feature | View toggle with localStorage persistence | This phase | Consistent with board page pattern |

**Deprecated/outdated:**
- None for this phase - implementing new feature using existing patterns

## Open Questions

Things that couldn't be fully resolved:

1. **"Number 1, Number 2" Labels**
   - What we know: Grep search found no such pattern in src/ directory
   - What's unclear: Whether this exists in edge cases, dynamic generation, or was fixed previously
   - Recommendation: Verify with stakeholder; if found during implementation, trace and fix

2. **Estimated Time Column**
   - What we know: Service table has no `estimated_minutes` field in database.ts
   - What's unclear: Whether this should be added or use existing `service.estimated_minutes` if it exists
   - Recommendation: Check if estimated_minutes exists in actual Supabase schema; if not, omit Time column

## Sources

### Primary (HIGH confidence)
- `/src/app/board/page.tsx` - View toggle implementation
- `/src/components/board/order-list-view.tsx` - List view table pattern
- `/src/lib/hooks/useCurrentStaff.ts` - localStorage persistence pattern
- `/src/components/intake/garment-services-step.tsx` - Component to modify
- `/src/lib/types/database.ts` - Database schema for Service type

### Secondary (MEDIUM confidence)
- Codebase grep for "Number" patterns - no matches in src/components

### Tertiary (LOW confidence)
- None - all findings verified with codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using existing libraries already in project
- Architecture: HIGH - all patterns exist in codebase
- Pitfalls: HIGH - based on actual codebase analysis and React/Next.js knowledge

**Research date:** 2026-01-20
**Valid until:** 60 days (stable patterns, no external dependencies)

# Phase 23: Intake & Pricing Fixes - Research

**Researched:** 2026-02-11
**Domain:** Next.js form state management, React inline editing patterns, tax recalculation
**Confidence:** HIGH

## Summary

This phase addresses six specific UX and data integrity issues in the intake flow identified during the Feb 11 Amin/Ayman call. The codebase uses a merged garment+services step (`garment-services-step.tsx`) with centralized pricing calculation logic (`calcTotal.ts`) and rush service configuration (`rush-indicators.ts`). All fixes are isolated to existing components with well-defined API boundaries.

The research identified that: (1) garment categories are hardcoded in the API response but database-driven, (2) price editing already exists at order detail level with tax recalculation, (3) custom service creation is not yet implemented, (4) rush labels use a configuration system but show confusing text in specific scenarios, (5) tax recalculation on total override is missing, and (6) date inputs use native HTML5 `type="date"`.

**Primary recommendation:** Implement fixes incrementally in dependency order: (1) categories → (2) rush labels → (3) inline price editing → (4) tax recalculation → (5) custom services → (6) date picker.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14 (App Router) | Framework | Project standard, API routes for mutations |
| TypeScript | 5.4 (strict + exactOptionalPropertyTypes) | Type safety | Project standard, enforces null handling |
| Tailwind CSS | 3.4 | Styling | Project standard for all UI |
| React Hook Form | Not used | Form state | **NOT USED** - local state with `useState` is project pattern |
| Radix UI | Current | Primitives | Project standard for dropdowns, modals |
| Supabase | PostgreSQL | Database | Project standard, service role for mutations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | Current | Validation | API route body validation (e.g., `/api/garment-service/[id]/price`) |
| nanoid | Current | ID generation | Already used for label codes, can use for custom service IDs |

### Date Picker Options
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `<input type="date">` | Radix UI Calendar + Popover | Better UX, more code; requires installation |
| Native HTML5 date | shadcn/ui Calendar | Pre-built component, consistent with design system |
| Custom calendar | react-day-picker | More flexibility, steeper learning curve |

**Installation (for shadcn/ui Calendar):**
```bash
npx shadcn-ui@latest add calendar popover
```

**Recommendation:** Use shadcn/ui Calendar component for consistency with existing UI patterns and accessibility.

## Architecture Patterns

### Recommended Project Structure
Current structure is already correct - no changes needed:
```
src/
├── app/api/
│   ├── garment-types/route.ts         # GET garment types with categories
│   ├── admin/garment-types/route.ts   # POST/PUT/DELETE custom types
│   ├── garment-service/[id]/price/    # PATCH price with tax recalc
│   └── services/route.ts              # GET all services
├── components/intake/
│   ├── garment-services-step.tsx      # Merged garment+service step
│   ├── pricing-step.tsx               # Pricing & rush config
│   └── order-summary.tsx              # Summary display
└── lib/
    ├── pricing/calcTotal.ts           # Centralized tax calculation
    └── rush-orders/rush-indicators.ts # Rush label configuration
```

### Pattern 1: Inline Editing with Optimistic Updates
**What:** Allow users to edit values in-place without navigating to a separate form.
**When to use:** Small, frequent edits (prices, quantities, time estimates).
**Example:**
```typescript
// Source: Existing pattern in order-detail-modal.tsx lines 48-56
const [editingPrice, setEditingPrice] = useState(false);
const [editPriceCents, setEditPriceCents] = useState(0);

// Toggle edit mode
const handleEditClick = () => {
  setEditingPrice(true);
  setEditPriceCents(currentPrice);
};

// Save with API call + recalculation
const handleSave = async () => {
  await fetch(`/api/garment-service/${id}/price`, {
    method: 'PATCH',
    body: JSON.stringify({ new_price_cents: editPriceCents })
  });
  // Automatically recalculates order totals including tax
};
```

### Pattern 2: Centralized Tax Recalculation
**What:** Single source of truth for pricing calculations to prevent stale data.
**When to use:** Any price mutation (item price, total override, rush fee change).
**Example:**
```typescript
// Source: calcTotal.ts lines 284-316
export function recalculateOrderPricing(
  orderId: string,
  items: PricingItem[],
  isRush: boolean
): {
  subtotal_cents: number;
  tax_cents: number;
  tps_cents: number;
  tvq_cents: number;
  total_cents: number;
} {
  // Calculates: subtotal → taxable (sub + rush) → TPS (5%) + TVQ (9.975%) → total
  // Returns all fields needed to update order table
}
```

**Critical:** Tax is calculated on `subtotal + rush_fee`, not just subtotal. When total is overridden, you must back-calculate the new pre-tax amount before recalculating tax.

### Pattern 3: Configuration-Driven Rush Labels
**What:** Use `RUSH_ORDER_CONFIGS` object to centralize rush service settings.
**When to use:** Any rush-related display logic.
**Example:**
```typescript
// Source: rush-indicators.ts lines 21-56
export const RUSH_ORDER_CONFIGS: Record<OrderType, RushOrderConfig> = {
  alteration: {
    visualIndicator: { text: 'RUSH', icon: '⚡' },
    timelineReduction: 50, // 50% faster
  },
  custom: {
    visualIndicator: { text: 'URGENT', icon: '🔥' },
    timelineReduction: 30, // 30% faster
  }
};

// Usage in pricing-step.tsx lines 333-343
<RushOrderTimeline
  isRush={data.rush}
  orderType={data.type}
  estimatedDays={data.rush_fee_type === 'large' ? 1 : 2}
/>
```

**Issue identified:** Hardcoded `estimatedDays` causes "0 days faster" when reduction > days. Need to calculate from actual order `due_date` or use minimum 1 day.

### Anti-Patterns to Avoid
- **Duplicating tax calculation logic:** Always use `recalculateOrderPricing()` instead of custom math.
- **Editing total without recalculating tax:** Leads to stale tax_cents. Must back-calculate taxable amount first.
- **Hardcoding category names in UI:** Categories are database-driven; fetch from `/api/admin/categories`.
- **Creating services without API validation:** Services have unique constraints; use `/api/admin/services` POST endpoint.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date picker UI | Custom calendar component | shadcn/ui Calendar + Popover | Handles accessibility, keyboard nav, localization out of box |
| Tax calculation | Inline math in components | `recalculateOrderPricing()` | Single source of truth prevents inconsistencies |
| Price validation | Client-side regex | Zod schema in API route | Type-safe, prevents invalid data at DB boundary |
| Custom service creation | Direct DB insert in component | `/api/admin/services` POST | Enforces unique codes, display_order, category validation |

**Key insight:** Pricing calculations have complex edge cases (rush fees, deposits, overrides). Centralizing in `calcTotal.ts` prevents bugs from arithmetic scattered across components.

## Common Pitfalls

### Pitfall 1: Stale Tax After Price Override
**What goes wrong:** User overrides total to $100. Tax stays at original value. Balance due is incorrect.
**Why it happens:** Total override bypasses tax recalculation. `pricing-step.tsx` lines 445-525 only update `total_cents`, not `tax_cents` or `tps_cents`/`tvq_cents`.
**How to avoid:**
1. Back-calculate taxable amount: `taxable = override / 1.14975` (1 + 0.05 + 0.09975)
2. Recalculate taxes: `tps = taxable * 0.05`, `tvq = taxable * 0.09975`
3. Update all tax fields in order table
**Warning signs:** Deposit + balance due ≠ total, tax percentage changes when total is overridden

### Pitfall 2: "0 Days Faster" Rush Label
**What goes wrong:** Rush timeline shows "0 days faster" or negative days when `timelineReduction` > `estimatedDays`.
**Why it happens:** `RushOrderTimeline` in `pricing-step.tsx` line 336-342 uses hardcoded `estimatedDays` (1-10 days) but `timelineReduction` is 50% for alterations. 50% of 1 day = 0.5 → rounds to 0.
**How to avoid:**
1. Calculate actual working days from `created_at` to `due_date`
2. Use `Math.max(1, ...)` to enforce minimum 1 day
3. Show absolute days ("2 days") instead of relative ("2 days faster")
**Warning signs:** Timeline component shows "0 days faster", rush fee applied but timeline unchanged

### Pitfall 3: Editing Price Without Updating Quantity Total
**What goes wrong:** User edits unit price, but qty × price total doesn't update immediately. Confusing UX.
**Why it happens:** `customPriceCents` is used for display but not multiplied by `qty` in edit state.
**How to avoid:**
1. Show both unit price edit field AND calculated line total (read-only)
2. Update line total immediately on unit price change (before API call)
3. Use same `formatCurrency()` helper everywhere for consistency
**Warning signs:** Edited price shows as saved but order subtotal doesn't change

### Pitfall 4: Duplicate Custom Services
**What goes wrong:** User types "Hemming" in custom service field, creates duplicate of existing service.
**Why it happens:** No validation against existing service names before creation.
**How to avoid:**
1. Implement autocomplete with existing services from `/api/services`
2. Show "already exists" warning if name matches (case-insensitive)
3. Allow override with "Create anyway" confirmation
**Warning signs:** Multiple services with same/similar names in dropdown

### Pitfall 5: Category Label Mismatch (Home vs Sur mesure)
**What goes wrong:** Garment type dropdown shows "Home" category header, but should show "Sur mesure" (custom design) or "Alteration".
**Why it happens:** Category labels hardcoded in `/api/garment-types/route.ts` line 67:
```typescript
categories: {
  home: 'Home Textiles',  // ← Wrong label for French context
  // ...
}
```
**How to avoid:**
1. Fetch category labels from `category` table via `/api/admin/categories`
2. Use `name` field (already localized) instead of hardcoded English
3. Add `alteration` category if missing in database
**Warning signs:** Category names don't match business terminology, missing "Alteration" category

## Code Examples

Verified patterns from codebase:

### Inline Price Editing (Service Item)
```typescript
// Source: Adapted from order-detail-modal.tsx lines 48-56
const [editingServicePrice, setEditingServicePrice] = useState<string | null>(null);
const [editServicePriceCents, setEditServicePriceCents] = useState(0);

// In service item row
{editingServicePrice === service.serviceId ? (
  <div className="flex items-center gap-2">
    <span>$</span>
    <input
      type="text"
      inputMode="decimal"
      value={(editServicePriceCents / 100).toFixed(2)}
      onChange={e => {
        const dollars = parseFloat(e.target.value) || 0;
        setEditServicePriceCents(Math.round(dollars * 100));
      }}
      className="w-20 px-2 py-1 border rounded"
      autoFocus
    />
    <Button size="sm" onClick={handleSavePrice}>Save</Button>
    <Button size="sm" variant="ghost" onClick={() => setEditingServicePrice(null)}>
      Cancel
    </Button>
  </div>
) : (
  <div className="flex items-center gap-2">
    <span>{formatCurrency(service.customPriceCents || 0)}</span>
    <Button size="sm" variant="ghost" onClick={() => {
      setEditingServicePrice(service.serviceId);
      setEditServicePriceCents(service.customPriceCents || 0);
    }}>
      Edit
    </Button>
  </div>
)}
```

### Tax Recalculation on Total Override
```typescript
// Source: New pattern needed for pricing-step.tsx
const handleTotalOverride = async (newTotalCents: number) => {
  // 1. Back-calculate taxable amount (total includes 5% TPS + 9.975% TVQ)
  const taxRate = 1.14975; // 1 + 0.05 + 0.09975
  const taxableAmount = Math.round(newTotalCents / taxRate);

  // 2. Recalculate individual tax components
  const tps_cents = Math.round(taxableAmount * 0.05);
  const tvq_cents = Math.round(taxableAmount * 0.09975);
  const tax_cents = tps_cents + tvq_cents;

  // 3. Back-calculate subtotal (taxable - rush fee)
  const subtotal_cents = taxableAmount - (data.rush ? calculation.rush_fee_cents : 0);

  // 4. Update state/API with ALL pricing fields
  const updatedPricing = {
    subtotal_cents,
    tax_cents,
    tps_cents,
    tvq_cents,
    total_cents: newTotalCents,
    rush_fee_cents: data.rush ? calculation.rush_fee_cents : 0,
  };

  // Update local state for UI
  setCalculation(updatedPricing);

  // Note: Actual DB update happens in intake API, not here
  onTotalOverrideChange(newTotalCents);
};
```

### Custom Service Creation (Inline)
```typescript
// Source: Adapted from garment-services-step.tsx custom garment type pattern (lines 329-366)
const [showAddCustomService, setShowAddCustomService] = useState(false);
const [customServiceName, setCustomServiceName] = useState('');
const [customServicePrice, setCustomServicePrice] = useState(0);

const handleCreateCustomService = async () => {
  if (!customServiceName.trim()) return;

  // Validate against existing services
  const existing = services.find(
    s => s.name.toLowerCase() === customServiceName.toLowerCase()
  );

  if (existing) {
    alert(`Service "${customServiceName}" already exists. Use existing service instead?`);
    return;
  }

  // Create via API
  const response = await fetch('/api/admin/services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: customServiceName.trim(),
      base_price_cents: customServicePrice,
      category: activeTab, // Use current category tab
      is_custom: true,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    alert(result.error || 'Failed to create service');
    return;
  }

  // Add to current garment immediately
  addServiceToCurrentGarment(result.service);

  // Reset form
  setCustomServiceName('');
  setCustomServicePrice(0);
  setShowAddCustomService(false);

  // Refresh services list
  await fetchServices();
};
```

### Improved Rush Timeline (No "0 Days Faster")
```typescript
// Source: Improved version of pricing-step.tsx lines 333-343
const calculateRushTimeline = () => {
  if (!data.due_date || !data.rush) return null;

  const dueDate = new Date(data.due_date);
  const today = new Date();

  // Calculate working days between now and due date
  let workingDays = 0;
  const currentDate = new Date(today);

  while (currentDate < dueDate) {
    currentDate.setDate(currentDate.getDate() + 1);
    // Skip weekends
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      workingDays++;
    }
  }

  // Rush service guarantees minimum 1 day, max reduction 50% for alterations
  const rushDays = Math.max(1, workingDays);
  const standardDays = data.type === 'alteration' ? 10 : 14;
  const daysSaved = Math.max(0, standardDays - rushDays);

  return {
    rushDays,
    daysSaved,
    displayText: `${rushDays} jour${rushDays !== 1 ? 's' : ''} (${daysSaved} jour${daysSaved !== 1 ? 's' : ''} plus rapide)`,
  };
};

// Usage in UI
{data.rush && calculation && (
  <div className="text-xs text-red-600 bg-red-100 rounded px-2 py-1">
    ⚡ {calculateRushTimeline()?.displayText || 'Service express'}
  </div>
)}
```

### shadcn/ui Calendar Integration (Inline Date Picker)
```typescript
// Source: shadcn/ui documentation + project patterns
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const [datePickerOpen, setDatePickerOpen] = useState(false);

// Replace current date input (pricing-step.tsx line 244-249)
<Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      className="w-full justify-start text-left font-normal"
    >
      {data.due_date ? (
        format(new Date(data.due_date), 'PPP', { locale: fr })
      ) : (
        <span>Choisir une date</span>
      )}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start">
    <Calendar
      mode="single"
      selected={data.due_date ? new Date(data.due_date) : undefined}
      onSelect={(date) => {
        if (date) {
          handleInputChange('due_date', format(date, 'yyyy-MM-dd'));
          setDatePickerOpen(false);
        }
      }}
      disabled={(date) => {
        // Disable dates before tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return date < tomorrow;
      }}
      initialFocus
      locale={fr}
    />
  </PopoverContent>
</Popover>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate garment + service steps | Merged `garment-services-step.tsx` | Phase 19 | Reduced step count, but component complexity increased |
| Client-side tax calculation | Centralized `calcTotal.ts` + API recalc | Phase 12 | Single source of truth, but must use for all price changes |
| Hardcoded rush fees | Config-driven `RUSH_ORDER_CONFIGS` | Phase 14 | Easier to adjust fees, but text still needs improvement |
| No price editing | Item-level price override in order detail | Phase 13 | Better flexibility, pattern exists to extend to intake |
| Native HTML5 date input | Still using native | - | No change yet, inline picker would improve UX |

**Deprecated/outdated:**
- **`type="number"` for prices:** Use `type="text"` with `inputMode="decimal"` for better mobile UX (prevents spinner UI)
- **Editing `custom_price_cents` directly:** Use `final_price_cents` for post-creation edits (three-tier hierarchy in `calculateItemPrice()`)

## Open Questions

1. **Custom service category assignment**
   - What we know: Services are grouped by category in UI (e.g., "Alterations", "Accessories")
   - What's unclear: Should custom services created during intake inherit the currently selected category tab, or should user choose category explicitly?
   - Recommendation: Inherit current tab category (simpler UX), allow recategorization in admin panel later

2. **Rush label for "0 days faster" edge case**
   - What we know: `RushOrderTimeline` can show "0 days faster" when reduction > available days
   - What's unclear: Should we show absolute days ("1 day turnaround") or hide the comparison in this case?
   - Recommendation: Show absolute days without comparison when < 2 days: "Service express: 1 jour"

3. **Total override tax recalculation UX**
   - What we know: Tax must be recalculated when total is overridden
   - What's unclear: Should tax breakdown (TPS/TVQ) be editable separately, or always recalculated from total?
   - Recommendation: Always recalculate from total (maintains tax compliance, simpler UX)

4. **Inline price editing permission**
   - What we know: Order detail modal allows price editing (no auth check visible)
   - What's unclear: Should intake price editing be restricted to certain roles, or allow all staff?
   - Recommendation: Allow all staff during intake (same as order detail), log changes in `price_change_log` for audit

## Sources

### Primary (HIGH confidence)
- Codebase: `/src/components/intake/garment-services-step.tsx` (lines 1-1147) - merged intake step implementation
- Codebase: `/src/components/intake/pricing-step.tsx` (lines 1-618) - pricing UI and total override
- Codebase: `/src/lib/pricing/calcTotal.ts` (lines 1-317) - centralized tax calculation logic
- Codebase: `/src/lib/rush-orders/rush-indicators.ts` (lines 1-252) - rush service configuration
- Codebase: `/src/app/api/garment-service/[id]/price/route.ts` (lines 1-199) - price editing with tax recalc
- Codebase: `/src/app/api/garment-types/route.ts` (lines 1-89) - category labels hardcoded
- Codebase: `/src/components/board/order-detail-modal.tsx` (lines 48-56) - inline edit pattern

### Secondary (MEDIUM confidence)
- shadcn/ui Calendar component documentation - date picker implementation pattern
- Radix UI Popover documentation - inline popup positioning

### Tertiary (LOW confidence)
- None - all findings verified from codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - directly observed in codebase imports and package.json
- Architecture: HIGH - patterns verified in multiple components with consistent usage
- Pitfalls: HIGH - identified from actual code patterns and inline comments about known issues

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable domain, pricing logic unlikely to change)

## Implementation Order Recommendation

Based on dependencies and risk:

1. **Category labels** (lowest risk) - Simple data mapping change
2. **Rush labels** (low risk) - Configuration + display logic update
3. **Inline price editing in services step** (medium risk) - Extend existing pattern to new location
4. **Tax recalculation on total override** (medium risk) - Add missing calculation step
5. **Custom service creation** (higher risk) - New API endpoint validation + UI flow
6. **Inline date picker** (lowest impact) - Optional UX improvement, can defer if needed

**Rationale:** Start with data/display fixes (1-2), then pricing integrity (3-4), finally new features (5-6). This allows early validation of fixes without blocking on complex features.

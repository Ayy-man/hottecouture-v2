# Phase 2: Item-Level Pricing - Research

**Researched:** 2026-01-20
**Domain:** Database schema extension, pricing calculation, audit logging
**Confidence:** HIGH

## Summary

This research analyzes the current Hotte Couture pricing system to understand how to add item-level final price editing after invoice creation. The current system has a well-structured pricing architecture with `garment_service` tracking individual items, `custom_price_cents` for price overrides during intake, and an existing `event_log` table for audit trails.

**Current State:**
1. **Item pricing:** `garment_service.custom_price_cents` (overrides `service.base_price_cents`)
2. **Order totals:** Calculated client-side and stored in `order` table (`subtotal_cents`, `tax_cents`, `tps_cents`, `tvq_cents`, `total_cents`)
3. **Tax calculation:** Quebec taxes (TPS 5% + TVQ 9.975%) calculated on subtotal + rush fee
4. **Audit logging:** Existing `event_log` table with `entity`, `entity_id`, `action`, `actor`, `details` pattern
5. **Price editing UI:** Order detail modal already has inline total price editing capability

**Primary recommendation:** Add `final_price_cents` column to `garment_service`, create `price_change_log` table for detailed audit trail, update pricing calculation to use `final_price_cents` when present, and enhance UI to show both estimated and final prices.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase | Current | PostgreSQL database | Already in use, supports triggers |
| Next.js API Routes | 14+ | Server-side operations | All price mutations go through API |
| Zod | 3.x | Schema validation | Already in `src/lib/dto.ts` for validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | Current | Date formatting | For audit log timestamps |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `price_change_log` table | Use `event_log.details` JSONB | Dedicated table provides better querying, indexing |
| Client-side recalculation | Database trigger | API route gives more control, easier testing |
| Modify `custom_price_cents` | Add `final_price_cents` | New column preserves original estimate for comparison |

**Installation:**
No new packages needed - all required tools already in stack.

## Architecture Patterns

### Current Pricing Data Flow

```
service.base_price_cents
        |
        v
garment_service.custom_price_cents (optional override during intake)
        |
        v
calculateItemPrice() in src/lib/pricing/calcTotal.ts
        |
        v
order.subtotal_cents, order.total_cents (stored in order table)
```

### Target Pricing Data Flow (with final_price)

```
service.base_price_cents
        |
        v
garment_service.custom_price_cents (optional override during intake)
        |                                          |
        v                                          v
Estimated Price (readonly display)       garment_service.final_price_cents (editable post-invoice)
        |                                          |
        +------------------------------------------+
        |
        v (use final_price_cents if set, else custom_price_cents, else base_price_cents)
calculateItemPrice() - UPDATED
        |
        v
order.subtotal_cents, order.total_cents (auto-recalculated)
        |
        v
price_change_log (audit record for each change)
```

### Pattern 1: Three-Tier Price Hierarchy

**What:** Item price determined by first non-null value: `final_price_cents` > `custom_price_cents` > `base_price_cents`
**When to use:** All price calculations
**Example:**
```typescript
// src/lib/pricing/calcTotal.ts - Updated calculateItemPrice
export function calculateItemPrice(item: PricingItem): {
  unit_price_cents: number;
  total_price_cents: number;
  is_final: boolean;
  is_custom: boolean;
} {
  // Priority: final_price > custom_price > base_price
  const unit_price_cents = item.final_price_cents
    ?? item.custom_price_cents
    ?? item.base_price_cents;
  const total_price_cents = unit_price_cents * item.quantity;

  return {
    unit_price_cents,
    total_price_cents,
    is_final: item.final_price_cents !== null,
    is_custom: item.custom_price_cents !== null && item.final_price_cents === null,
  };
}
```

### Pattern 2: Audit Logging with Dedicated Table

**What:** Dedicated `price_change_log` table for granular audit trail
**When to use:** Every price modification
**Example:**
```sql
-- Price change audit table structure
CREATE TABLE price_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    garment_service_id UUID NOT NULL REFERENCES garment_service(id) ON DELETE CASCADE,
    order_id UUID NOT NULL,
    changed_by VARCHAR(100),  -- Staff name or 'system'
    old_price_cents INTEGER,
    new_price_cents INTEGER,
    reason TEXT,
    CONSTRAINT fk_order FOREIGN KEY (order_id)
        REFERENCES "order"(id) ON DELETE CASCADE
);

CREATE INDEX idx_price_change_log_garment_service ON price_change_log(garment_service_id);
CREATE INDEX idx_price_change_log_order ON price_change_log(order_id);
CREATE INDEX idx_price_change_log_created ON price_change_log(created_at);
```

### Pattern 3: Auto-Recalculate Order Total

**What:** API endpoint that updates item price AND recalculates order total in single transaction
**When to use:** Every price change
**Example:**
```typescript
// API route pattern for price update
export async function PATCH(request: Request) {
  const { garmentServiceId, newPriceCents, changedBy, reason } = await request.json();

  // 1. Get current price for audit log
  const { data: current } = await supabase
    .from('garment_service')
    .select('final_price_cents, custom_price_cents, service:service_id(base_price_cents), garment:garment_id(order_id)')
    .eq('id', garmentServiceId)
    .single();

  const oldPrice = current.final_price_cents
    ?? current.custom_price_cents
    ?? current.service?.base_price_cents;

  // 2. Update item price
  await supabase
    .from('garment_service')
    .update({ final_price_cents: newPriceCents })
    .eq('id', garmentServiceId);

  // 3. Log the change
  await supabase.from('price_change_log').insert({
    garment_service_id: garmentServiceId,
    order_id: current.garment.order_id,
    changed_by: changedBy,
    old_price_cents: oldPrice,
    new_price_cents: newPriceCents,
    reason: reason || null,
  });

  // 4. Recalculate order total
  await recalculateOrderTotal(current.garment.order_id);

  return { success: true };
}
```

### Anti-Patterns to Avoid
- **Modifying `custom_price_cents` for post-invoice changes:** This loses the original estimate; use separate `final_price_cents` column
- **Client-side only recalculation:** Must update `order` table totals server-side to maintain data consistency
- **Skipping audit log:** Every price change must be logged for accountability
- **Showing time in customer documents:** Customer-facing displays should show only prices, never time worked

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Price formatting | Manual string formatting | `formatCurrency()` from `src/lib/pricing/client.ts` | Handles CAD formatting, edge cases |
| Tax calculation | Custom tax math | `calculateTax()` from `src/lib/pricing/calcTotal.ts` | Quebec TPS/TVQ rates built in |
| Order total recalc | Manual sum | `updateOrderPricing()` from `src/lib/pricing/database.ts` | Handles rush fees, taxes, all items |
| Audit logging | Inline INSERT | Pattern from `src/app/api/webhooks/stripe/route.ts` | Consistent with existing `event_log` usage |
| Staff identification | Username string | `useCurrentStaff()` hook | Gets logged-in staff for audit `changed_by` |

**Key insight:** The codebase already has a complete pricing calculation system in `src/lib/pricing/`. The task is to extend it with `final_price_cents`, not replace it.

## Common Pitfalls

### Pitfall 1: Breaking Existing Price Calculations
**What goes wrong:** Adding `final_price_cents` breaks existing orders that don't have it
**Why it happens:** Calculation code assumes the column exists and has a value
**How to avoid:**
- Use NULL-safe logic: `final_price_cents ?? custom_price_cents ?? base_price_cents`
- Migration adds column as NULLABLE
- All existing rows start with NULL (no behavior change)
**Warning signs:** "NaN" prices, "$0.00" totals after migration

### Pitfall 2: Order Total Out of Sync
**What goes wrong:** Item price changes but order total doesn't update
**Why it happens:** Only updating `garment_service`, forgetting to recalc `order` totals
**How to avoid:**
- API endpoint MUST call `updateOrderPricing()` after any price change
- Consider using database trigger as backup
**Warning signs:** Order total doesn't match sum of item prices

### Pitfall 3: Incomplete Audit Trail
**What goes wrong:** Price changes not logged, or missing critical info
**Why it happens:** Audit logging added as afterthought, skipped in error cases
**How to avoid:**
- Log BEFORE update (captures old value)
- Make logging non-optional (always insert)
- Include order_id for easy querying
**Warning signs:** Disputes with no history, "who changed this?" questions

### Pitfall 4: Showing Time to Customers
**What goes wrong:** Customer sees hours worked next to price
**Why it happens:** Reusing internal UI components for customer-facing documents
**How to avoid:**
- Explicit separation: internal views vs customer views
- Labels page already correctly hides time (only shows order#, garment type, QR)
- Review all customer-facing components: receipts, invoices, confirmations
**Warning signs:** Client asks "why does it say 2 hours?"

### Pitfall 5: UI Shows Wrong Price Source
**What goes wrong:** User edits "estimated" but it saves to "final"
**Why it happens:** UI doesn't clearly distinguish the three price tiers
**How to avoid:**
- Clear labeling: "Estimated Price" (readonly) vs "Final Price" (editable)
- Visual distinction (e.g., estimated grayed out, final editable)
- Toast confirmation on save: "Final price updated"
**Warning signs:** Users confused about which price they're editing

## Code Examples

### Migration: Add final_price_cents Column

```sql
-- File: supabase/migrations/0033_add_final_price_cents.sql

-- Add final_price_cents to garment_service
-- This is the price used AFTER work is complete, editable post-invoice
-- NULL means use custom_price_cents or base_price_cents

ALTER TABLE garment_service
ADD COLUMN IF NOT EXISTS final_price_cents INTEGER;

-- Comment for documentation
COMMENT ON COLUMN garment_service.final_price_cents IS
  'Final price after work completion. NULL = use custom_price_cents or base price. Editable post-invoice.';

-- Index for NULL checks in calculations (partial index for non-null values)
CREATE INDEX IF NOT EXISTS idx_garment_service_has_final_price
ON garment_service(id) WHERE final_price_cents IS NOT NULL;
```

### Migration: Create Price Change Log Table

```sql
-- File: supabase/migrations/0034_create_price_change_log.sql

-- Dedicated audit table for price changes
-- Provides detailed history of who changed what, when, and why

CREATE TABLE IF NOT EXISTS price_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- What was changed
    garment_service_id UUID NOT NULL REFERENCES garment_service(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,

    -- Who changed it
    changed_by VARCHAR(100) NOT NULL,  -- Staff name or 'system'

    -- What changed
    old_price_cents INTEGER,  -- NULL if first final price set
    new_price_cents INTEGER NOT NULL,

    -- Why (optional)
    reason TEXT
);

-- Indexes for common queries
CREATE INDEX idx_pcl_garment_service ON price_change_log(garment_service_id);
CREATE INDEX idx_pcl_order ON price_change_log(order_id);
CREATE INDEX idx_pcl_created_at ON price_change_log(created_at DESC);
CREATE INDEX idx_pcl_changed_by ON price_change_log(changed_by);

-- Enable RLS
ALTER TABLE price_change_log ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read and insert
CREATE POLICY "Enable all operations for authenticated users" ON price_change_log
    FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE price_change_log IS
  'Audit trail for item-level price changes. Every final_price_cents modification is logged.';
```

### TypeScript Type Updates

```typescript
// File: src/lib/types/database.ts - Add to garment_service type

garment_service: {
  Row: {
    id: string;
    garment_id: string;
    service_id: string | null;
    custom_service_name: string | null;
    quantity: number;
    custom_price_cents: number | null;
    final_price_cents: number | null;  // NEW: Post-invoice editable price
    notes: string | null;
    stage: string | null;
    is_active: boolean | null;
    started_at: string | null;
    stopped_at: string | null;
    assignee: string | null;
    assigned_seamstress_id: string | null;  // From Phase 1
  };
  Insert: {
    // ... existing fields ...
    final_price_cents?: number | null;
  };
  Update: {
    // ... existing fields ...
    final_price_cents?: number | null;
  };
};

// NEW: Price change log type
price_change_log: {
  Row: {
    id: string;
    created_at: string;
    garment_service_id: string;
    order_id: string;
    changed_by: string;
    old_price_cents: number | null;
    new_price_cents: number;
    reason: string | null;
  };
  Insert: {
    id?: string;
    created_at?: string;
    garment_service_id: string;
    order_id: string;
    changed_by: string;
    old_price_cents?: number | null;
    new_price_cents: number;
    reason?: string | null;
  };
  Update: {
    // Audit logs should not be updated
  };
};
```

### Updated Pricing Types

```typescript
// File: src/lib/pricing/types.ts - Extended PricingItem

export interface PricingItem {
  garment_id: string;
  service_id: string;
  quantity: number;
  custom_price_cents: number | null;
  final_price_cents: number | null;  // NEW
  base_price_cents: number;
}

// New type for price update requests
export interface PriceUpdateRequest {
  garment_service_id: string;
  new_price_cents: number;
  changed_by: string;
  reason?: string;
}

// Response includes audit trail
export interface PriceUpdateResponse {
  success: boolean;
  garment_service: {
    id: string;
    final_price_cents: number;
  };
  order: {
    id: string;
    subtotal_cents: number;
    tax_cents: number;
    total_cents: number;
  };
  audit_log_id: string;
}
```

### Updated Price Calculation

```typescript
// File: src/lib/pricing/calcTotal.ts - Updated calculateItemPrice

export function calculateItemPrice(item: PricingItem): {
  unit_price_cents: number;
  total_price_cents: number;
  price_source: 'final' | 'custom' | 'base';
} {
  // Priority: final_price > custom_price > base_price
  let unit_price_cents: number;
  let price_source: 'final' | 'custom' | 'base';

  if (item.final_price_cents !== null && item.final_price_cents !== undefined) {
    unit_price_cents = item.final_price_cents;
    price_source = 'final';
  } else if (item.custom_price_cents !== null && item.custom_price_cents !== undefined) {
    unit_price_cents = item.custom_price_cents;
    price_source = 'custom';
  } else {
    unit_price_cents = item.base_price_cents;
    price_source = 'base';
  }

  const total_price_cents = unit_price_cents * item.quantity;

  return {
    unit_price_cents,
    total_price_cents,
    price_source,
  };
}
```

### API Route: Update Item Price

```typescript
// File: src/app/api/garment-service/[id]/price/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { recalculateOrderPricing } from '@/lib/pricing/calcTotal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const priceUpdateSchema = z.object({
  new_price_cents: z.number().int().min(0),
  changed_by: z.string().min(1),
  reason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: garmentServiceId } = await params;
    const body = await request.json();
    const { new_price_cents, changed_by, reason } = priceUpdateSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get current item with price info
    const { data: current, error: fetchError } = await supabase
      .from('garment_service')
      .select(`
        id,
        final_price_cents,
        custom_price_cents,
        garment:garment_id (
          order_id
        ),
        service:service_id (
          base_price_cents
        )
      `)
      .eq('id', garmentServiceId)
      .single();

    if (fetchError || !current) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const orderId = (current.garment as any).order_id;
    const oldPrice = current.final_price_cents
      ?? current.custom_price_cents
      ?? (current.service as any)?.base_price_cents;

    // 2. Update the final price
    const { error: updateError } = await supabase
      .from('garment_service')
      .update({ final_price_cents: new_price_cents })
      .eq('id', garmentServiceId);

    if (updateError) {
      throw updateError;
    }

    // 3. Log the price change
    const { data: auditLog, error: logError } = await supabase
      .from('price_change_log')
      .insert({
        garment_service_id: garmentServiceId,
        order_id: orderId,
        changed_by,
        old_price_cents: oldPrice,
        new_price_cents: new_price_cents,
        reason: reason || null,
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to log price change:', logError);
      // Don't fail the request, but log the issue
    }

    // 4. Recalculate order totals
    // Get all items for this order
    const { data: orderItems } = await supabase
      .from('garment_service')
      .select(`
        id,
        garment_id,
        service_id,
        quantity,
        custom_price_cents,
        final_price_cents,
        service:service_id (
          base_price_cents
        )
      `)
      .eq('garment.order_id', orderId);

    // Get order rush status
    const { data: order } = await supabase
      .from('order')
      .select('rush, rush_fee_cents')
      .eq('id', orderId)
      .single();

    // Calculate new totals
    const items = (orderItems || []).map(item => ({
      garment_id: item.garment_id,
      service_id: item.service_id || '',
      quantity: item.quantity,
      custom_price_cents: item.custom_price_cents,
      final_price_cents: item.final_price_cents,
      base_price_cents: (item.service as any)?.base_price_cents || 0,
    }));

    const totals = recalculateOrderPricing(orderId, items, order?.rush || false);

    // 5. Update order totals
    const { data: updatedOrder, error: orderUpdateError } = await supabase
      .from('order')
      .update({
        subtotal_cents: totals.subtotal_cents,
        tax_cents: totals.tax_cents,
        tps_cents: totals.tps_cents,
        tvq_cents: totals.tvq_cents,
        total_cents: totals.total_cents,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderUpdateError) {
      throw orderUpdateError;
    }

    return NextResponse.json({
      success: true,
      garment_service: {
        id: garmentServiceId,
        final_price_cents: new_price_cents,
      },
      order: {
        id: orderId,
        subtotal_cents: updatedOrder.subtotal_cents,
        tax_cents: updatedOrder.tax_cents,
        total_cents: updatedOrder.total_cents,
      },
      audit_log_id: auditLog?.id,
    });

  } catch (error) {
    console.error('Error updating price:', error);
    return NextResponse.json(
      { error: 'Failed to update price' },
      { status: 500 }
    );
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Order-level price edit | Item-level price edit | This phase | Granular pricing control |
| Single price field | Three-tier hierarchy (base/custom/final) | This phase | Preserves estimate, allows adjustment |
| No audit trail | Dedicated `price_change_log` table | This phase | Full accountability |
| Manual total update | Auto-recalculate on price change | This phase | Data consistency |

**Deprecated/outdated:**
- Direct editing of `order.total_cents` without item price update (currently possible in UI)
- Using `event_log` for price changes (too generic, use dedicated table instead)

## Key Files to Modify

Based on codebase analysis, these files need updates:

### Database (Migrations)
1. New migration: Add `final_price_cents` column to `garment_service`
2. New migration: Create `price_change_log` table

### TypeScript Types
1. `src/lib/types/database.ts`: Add `final_price_cents` to `garment_service`, add `price_change_log` type
2. `src/lib/pricing/types.ts`: Update `PricingItem` interface

### Pricing Logic
1. `src/lib/pricing/calcTotal.ts`: Update `calculateItemPrice()` to use three-tier hierarchy
2. `src/lib/pricing/database.ts`: Update `getOrderPricingBreakdown()` to include `final_price_cents`

### API Routes
1. **NEW** `src/app/api/garment-service/[id]/price/route.ts`: PATCH endpoint for price updates
2. `src/app/api/order/[id]/details/route.ts`: Include `final_price_cents` in response
3. `src/app/api/intake/route.ts`: No changes needed (final_price not set at intake)

### Components
1. `src/components/board/order-detail-modal.tsx`: Show both estimated and final prices per item
2. `src/components/tasks/garment-task-summary.tsx`: Optional - show price (currently shows time only)
3. `src/components/intake/pricing-step.tsx`: No changes (shows estimated only at intake)
4. `src/components/intake/order-summary.tsx`: No changes (shows totals at intake)

### RPC Function Updates
1. Update `get_orders_with_details` to include `final_price_cents` in garment services JSON

## UI Design Recommendations

### Price Display Pattern

```
Per-item in order detail modal:
+------------------------------------------+
| Hem Pants                                 |
| Estimated: $25.00 (readonly, grayed out) |
| Final:     $30.00 [Edit]                 |
+------------------------------------------+

After editing:
+------------------------------------------+
| Hem Pants                                 |
| Estimated: $25.00                        |
| Final:     [$_____] [Save] [Cancel]      |
+------------------------------------------+
```

### Order Summary Pattern

```
+------------------------------------------+
| Subtotal:                        $85.00  |
| Rush Fee:                        $30.00  |
| TPS (5%):                         $5.75  |
| TVQ (9.975%):                    $11.48  |
| ----------------------------------       |
| Total:                          $132.23  |
+------------------------------------------+
```

Note: Customer-facing documents (labels, receipts) show prices only - never time worked.

## Open Questions

Things that couldn't be fully resolved:

1. **Price Change Reason Field**
   - What we know: Audit log has optional `reason` field
   - What's unclear: Should UI require a reason? Dropdown of common reasons?
   - Recommendation: Make it optional for MVP, consider adding common reasons dropdown later

2. **Price Change Permissions**
   - What we know: Currently any authenticated user can edit prices
   - What's unclear: Should only certain roles be allowed to change final prices?
   - Recommendation: No role restrictions for MVP (small team), revisit if needed

3. **Bulk Price Updates**
   - What we know: Current UI edits one item at a time
   - What's unclear: Will users need to update multiple items at once?
   - Recommendation: Single-item updates for MVP, add bulk if requested

4. **Price History UI**
   - What we know: Audit log captures all changes
   - What's unclear: Where/how to display price history?
   - Recommendation: Don't build history viewer in Phase 2, just capture the data

## Sources

### Primary (HIGH confidence)
- `/Users/aymanbaig/Desktop/hottecouture-main/supabase/migrations/0001_init.sql` - Base schema with `garment_service`, `event_log`
- `/Users/aymanbaig/Desktop/hottecouture-main/src/lib/pricing/calcTotal.ts` - Current price calculation logic
- `/Users/aymanbaig/Desktop/hottecouture-main/src/lib/pricing/database.ts` - Order pricing updates
- `/Users/aymanbaig/Desktop/hottecouture-main/src/lib/pricing/types.ts` - Pricing interfaces
- `/Users/aymanbaig/Desktop/hottecouture-main/src/lib/types/database.ts` - Full database types
- `/Users/aymanbaig/Desktop/hottecouture-main/src/components/board/order-detail-modal.tsx` - Current price editing UI
- `/Users/aymanbaig/Desktop/hottecouture-main/src/app/api/order/[id]/route.ts` - Current order update API
- `/Users/aymanbaig/Desktop/hottecouture-main/src/app/api/webhooks/stripe/route.ts` - Example `event_log` usage

### Secondary (MEDIUM confidence)
- `/Users/aymanbaig/Desktop/hottecouture-main/src/components/intake/pricing-step.tsx` - Intake pricing display
- `/Users/aymanbaig/Desktop/hottecouture-main/src/components/tasks/garment-task-summary.tsx` - Item task display
- `/Users/aymanbaig/Desktop/hottecouture-main/.planning/phases/01-item-level-assignment/01-RESEARCH.md` - Phase 1 research for context

### Tertiary (LOW confidence)
- None - all findings verified with codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Based on existing codebase patterns
- Architecture: HIGH - Direct analysis of pricing system
- Pitfalls: HIGH - Identified through code flow analysis
- UI patterns: MEDIUM - Based on existing components, may need adjustment

**Research date:** 2026-01-20
**Valid until:** Indefinite (codebase-specific research)

# Phase 7: Fabric Items in Accessories - Research

**Researched:** 2026-03-18
**Domain:** Supabase seed migration, React unit-based pricing UI, AccessoriesStep extension
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MKT-117 | Add "Fabric by the yard" and "Fabric by the square foot" as pre-built accessory services with unit-based pricing | Full implementation path mapped below — service.unit column already exists, AccessoriesStep already renders accessories |
| MKT-117a | Decimal quantities (yards, sq ft) supported at order time | Already implemented by Phase 6 — garment_service.quantity is NUMERIC(10,2), AccessoriesStep uses step="0.25" inputs |
| MKT-117b | Price formula: quantity × price per unit, both editable at order time | customPriceCents is already per-unit and editable in AccessoriesStep; qty is editable too |
| MKT-117c | Neither fabric item appears in production calendar | Guaranteed by isAccessory: true flag and Phase 6 hasAlterationServices gate in intake API |
| MKT-117d | Both items appear on invoice correctly | Price display already shows "Qte: X × $Y = $Z" in AccessoriesStep summary — needs unit label |
</phase_requirements>

---

## Summary

Phase 7 is a small additive phase that layers on top of Phase 6's fully-implemented Accessories infrastructure. The core work is: (1) one seed migration inserting 2 fabric service records with `unit` column populated, and (2) a UI tweak to `AccessoriesStep` to show the unit label next to the quantity input and in the price display line.

The `service` table already has a `unit VARCHAR(50)` column (migration 0010), already indexed. The TypeScript `Service` type in `database.ts` already includes `unit: string | null`. The `AccessoriesStep` component already fetches from `service` with `is_active = true` and `category IN ('accessories', 'accessory')` and already displays decimal quantities. No new DB schema changes are needed.

The only gap between the current codebase and MKT-117 is: (a) the two fabric rows are missing from the `service` table in the database, and (b) the quantity input in `AccessoriesStep` shows a generic "Qte:" label and the price line says "× $Y" without a unit suffix. Phase 7 adds the seed data and the unit label rendering.

**Primary recommendation:** Write migration `0044_seed_fabric_services.sql` to insert the two fabric service records into the `service` table with `category = 'accessories'` and `unit = 'yard'` / `unit = 'sq ft'`. Then update `AccessoriesStep` to read `service.unit` from the fetched data and display it next to the quantity input and in the "Qty × Price = Total" line.

---

## Standard Stack

### Core (all already in project — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase client | 2.x | Fetching service records in AccessoriesStep | Already used — `createClient()` pattern |
| React | 18.x | Component state for qty/price per service | Already in use |
| Next.js 14 | 14.x | `'use client'` component pattern | Already in use |
| TypeScript | 5.x | Type-safe `service.unit` access | Already in use |

### No New Dependencies Required

This phase is a seed migration plus a 10-20 line UI change. Zero new npm packages.

**Installation:** None required.

---

## Architecture Patterns

### Recommended File Changes

```
supabase/migrations/
└── 0044_seed_fabric_services.sql         # NEW — inserts 2 fabric service rows

src/components/intake/
└── accessories-step.tsx                  # MODIFY — show unit label in qty input + price display
```

No other files need changes. The intake API, pricing logic, assignment step, order summary, and calendar logic are all already correct for accessories.

### Pattern 1: Seed Migration — Insert Fabric Services

The `service` table requires: `code` (UNIQUE VARCHAR(20)), `name`, `base_price_cents`, `category`, `unit`, `is_custom`, `display_order`, `is_active`.

```sql
-- supabase/migrations/0044_seed_fabric_services.sql

INSERT INTO service (code, name, base_price_cents, category, unit, is_custom, display_order, is_active)
VALUES
  ('FABRIC_YARD', 'Tissu au verge', 0, 'accessories', 'yard', false, 100, true),
  ('FABRIC_SQFT', 'Tissu au pied carre', 0, 'accessories', 'sq ft', false, 101, true)
ON CONFLICT (code) DO NOTHING;
```

**Key decisions baked in:**
- `base_price_cents = 0` — the requirement says price is editable at order time. Starting at 0 forces the seamstress to enter the price explicitly on each order. This is correct behavior.
- `category = 'accessories'` — ensures the rows appear in AccessoriesStep's query (`.in('category', ['accessories', 'accessory'])`).
- `unit = 'yard'` / `unit = 'sq ft'` — populates the existing column so the UI can read it.
- `ON CONFLICT (code) DO NOTHING` — idempotent; safe to re-run.
- `display_order = 100, 101` — high values so fabric rows appear at the bottom of the accessories list, after existing items.
- French names ("Tissu au verge", "Tissu au pied carre") — consistent with project convention of French labels.

### Pattern 2: AccessoriesStep Unit Label Display

The current AccessoriesStep renders a service row like this:

```tsx
{/* Service Info */}
<div className="flex-1 min-w-0">
  <p className="text-sm font-medium truncate">{service.name}</p>
  <p className="text-xs text-primary-600 font-medium">
    {formatCurrency(service.base_price_cents)} / unite
  </p>
</div>
```

The hardcoded "/ unite" string should become `/ ${service.unit ?? 'unite'}` so fabric rows show "/ yard" and "/ sq ft" while non-unit services fall back to "/ unite".

The quantity label is currently:
```tsx
<label className="text-xs text-muted-foreground whitespace-nowrap">Qte:</label>
```

For fabric items, this should show the unit: `{service.unit ? service.unit : 'Qte'}:`.

The price summary line in the "added accessories" section is:
```tsx
<p className="text-xs text-muted-foreground">
  Qte: {acc.qty} &times; {formatCurrency(acc.customPriceCents)} ={' '}
  {formatCurrency(acc.customPriceCents * acc.qty)}
</p>
```

For fabric items, this should become:
```tsx
<p className="text-xs text-muted-foreground">
  {acc.qty} {acc.unit ?? 'unité'} &times; {formatCurrency(acc.customPriceCents)} / {acc.unit ?? 'unité'} ={' '}
  {formatCurrency(acc.customPriceCents * acc.qty)}
</p>
```

This matches the requirement: "X yards × $Y/yard = $Z".

### Pattern 3: Passing Unit Through AddedAccessory

The `AddedAccessory` interface in `accessories-step.tsx` tracks what was added to the order for the summary panel. Currently it does not include `unit`. Add it:

```typescript
// Current AddedAccessory interface
interface AddedAccessory {
  serviceId: string;
  serviceName: string;
  qty: number;
  customPriceCents: number;
  garmentIndex: number;
  serviceIndex: number;
}

// Updated AddedAccessory interface — add unit
interface AddedAccessory {
  serviceId: string;
  serviceName: string;
  qty: number;
  customPriceCents: number;
  unit?: string | null;      // NEW — from service.unit
  garmentIndex: number;
  serviceIndex: number;
}
```

Populate `unit` in `handleAddAccessory`:
```typescript
result.push({
  serviceId: svc.serviceId,
  serviceName: svc.serviceName || svc.customServiceName || 'Accessoire',
  qty: svc.qty,
  customPriceCents: svc.customPriceCents || 0,
  unit: /* need unit from service */ ???  // problem: GarmentService doesn't have unit
  garmentIndex,
  serviceIndex,
});
```

This surfaces a gap: `GarmentService` (the interface from `alteration-step.tsx`) does not currently carry a `unit` field. Two options:

**Option A (simpler):** In `handleAddAccessory`, store the unit directly in the `AddedAccessory` object from the `Service` object available at that point in the handler — `unit: service.unit`.

**Option B (complete):** Add `unit?: string | null` to the `GarmentService` interface exported from `alteration-step.tsx`, set it in `handleAddAccessory` (`unit: service.unit`), read it back in the `addedAccessories` computed useMemo.

Option B is slightly more work but gives downstream components (pricing step, order detail modal) access to the unit if they ever need to display it. Given the small scope of Phase 7, Option A is sufficient.

### Pattern 4: Price Editability — Already Implemented

The AccessoriesStep already supports editing the price per unit (`customPriceCents`). The current UI shows a static price on the service row and applies `base_price_cents` as the initial `customPriceCents` when adding. With `base_price_cents = 0`, the user will see a $0.00 default price.

**Important:** The requirement says "both editable at order time". The price editing in AccessoriesStep currently happens ONLY at the per-service listing level (setting the initial price when clicking "Ajouter"). Once added to the summary, the price is not editable in the current implementation — it shows as a static line.

**Gap found:** There is no inline price editing in the AccessoriesStep added-accessories summary. The alteration step (`alteration-step.tsx`) has inline per-service price editing (pencil icon → input field pattern). The AccessoriesStep summary panel shows static prices.

For fabric items where `base_price_cents = 0`, the user must be able to set the price. Current flow: they can type in the qty, but there is no price input on the service row card before clicking "Ajouter". A price input needs to be added to the service row in the listing section (before adding), or the summary section must allow editing after adding.

**Recommendation:** Add a price-per-unit input to each service row in the AccessoriesStep listing (the section above, not the summary). Keep it simple: a small price input next to the qty input. This is consistent with the requirement "both editable at order time".

### Anti-Patterns to Avoid

- **Don't use `category = 'fabrics'`** — the `category` table does have a `fabrics` key (migration 0009), but `AccessoriesStep` filters for `['accessories', 'accessory']` only. Using `fabrics` would make the items invisible to the current UI. Use `accessories`.
- **Don't set `is_custom = true` for fabric rows** — custom services use the `custom_` prefixed ID pattern in the frontend for special handling. Pre-seeded fabric rows are regular catalog services.
- **Don't hardcode unit labels** — read `service.unit` from the fetched service record. The unit is already stored in the DB; don't duplicate it in the UI.
- **Don't add `unit` to the `GarmentService` interface as required** — it is optional (`unit?: string | null`). Non-fabric accessories have `unit = null`.
- **Don't modify the intake API or calcTotal** — price formula `qty × customPriceCents` is already correct. The API already handles accessories. No changes needed.
- **Don't add fabric services to the `fabrics` category** — that category exists in the DB but AccessoriesStep does not query it. Either change the AccessoriesStep query to include `fabrics` (scope creep), or keep fabric services under `accessories`. The latter is simpler and consistent.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Seeding service records | Manual INSERT via Supabase dashboard | Migration file `0044_*` | Reproducible, tracked in git, runs on deploy |
| Unit display logic | A new "unit pricing" component | Extend the existing service row in AccessoriesStep | 10-line change in the existing 300-line component |
| Price × qty formula | Custom calculation | `acc.customPriceCents * acc.qty` already in component | Already implemented and correct |
| Migration idempotency | Version checks, IF EXISTS | `ON CONFLICT (code) DO NOTHING` | Standard Postgres upsert pattern — already used in project (0036, 0039) |
| Decimal input | Custom step enforcement | `type="number" inputMode="decimal" step="0.25"` | Already in AccessoriesStep — fabric just inherits it |

---

## Common Pitfalls

### Pitfall 1: Fabric Items Hidden Because Category is Wrong
**What goes wrong:** Fabric service rows inserted with `category = 'fabrics'` don't appear in AccessoriesStep because the query filters for `['accessories', 'accessory']`.
**Why it happens:** The `category` table has a `fabrics` key, which might seem like the right choice for fabric products. But the AccessoriesStep does not query that category.
**How to avoid:** Use `category = 'accessories'` in the migration. Verified: AccessoriesStep line 68 uses `.in('category', ['accessories', 'accessory'])`.
**Warning signs:** AccessoriesStep loads but fabric rows don't appear in the service list.

### Pitfall 2: $0.00 Default Price With No Edit UI
**What goes wrong:** `base_price_cents = 0` means fabric items show $0.00 in the listing. If there's no price input on the row before adding, the user cannot set a price for fabric. The item gets added at $0 and the order is wrong.
**Why it happens:** AccessoriesStep applies `service.base_price_cents` as the initial `customPriceCents` when adding. With 0 as the base, the added item is $0. The summary panel shows the $0 price but doesn't let you edit it.
**How to avoid:** Add a price-per-unit input to the service listing row (alongside the qty input) in AccessoriesStep. Show it for all services (not just fabric), but it's especially critical for fabric. The user sets the price before clicking "Ajouter".
**Warning signs:** Fabric item added to order with $0.00 price; no way to correct it in the accessories step.

### Pitfall 3: `code` Must Be 20 Characters or Fewer
**What goes wrong:** The `code` column has `VARCHAR(20) UNIQUE NOT NULL`. A code like `FABRIC_BY_YARD` is 14 chars — fine. But `FABRIC_BY_SQ_FT` is 15 chars — still fine. Just don't exceed 20.
**Why it happens:** DB constraint.
**How to avoid:** Use short codes: `FABRIC_YARD` (11 chars) and `FABRIC_SQFT` (11 chars). Verify character count before writing migration.
**Warning signs:** Migration error `value too long for type character varying(20)`.

### Pitfall 4: Unit Not Persisted in GarmentService
**What goes wrong:** The `AddedAccessory` summary shows "yard" from the service row at add-time, but if the summary reads `unit` from `GarmentService` (which doesn't carry it), the unit label disappears after adding.
**Why it happens:** The `GarmentService` interface has no `unit` field. The unit is on `Service` (fetched from DB) but not copied into the form data when adding.
**How to avoid:** Either (a) pass unit through from the `Service` object in `handleAddAccessory` directly to `AddedAccessory`, or (b) add `unit?: string | null` to `GarmentService`. Option (a) is simpler. See Pattern 3 above.
**Warning signs:** Service list shows "yard" but summary shows "unité".

### Pitfall 5: display_order Conflicts With Existing Services
**What goes wrong:** If another accessory service already has `display_order = 100`, the fabric rows may sort in an unexpected position or cause display conflicts.
**Why it happens:** `display_order` is not UNIQUE — multiple services can have the same value.
**How to avoid:** Use high values (100, 101) for the fabric services. The existing seeded accessories (ZIPPER, BUTTONS) likely have low display_order values. Non-unique display_order is fine — the secondary sort is by `name`.
**Warning signs:** None critical; worst case is ordering looks slightly different.

---

## Code Examples

Verified patterns from codebase source (all HIGH confidence — read directly from source):

### Migration: Insert Fabric Services

```sql
-- supabase/migrations/0044_seed_fabric_services.sql
-- MKT-117: Pre-built fabric accessory services with unit-based pricing

INSERT INTO service (code, name, base_price_cents, category, unit, is_custom, display_order, is_active)
VALUES
  ('FABRIC_YARD', 'Tissu au verge',        0, 'accessories', 'yard',  false, 100, true),
  ('FABRIC_SQFT', 'Tissu au pied carre',   0, 'accessories', 'sq ft', false, 101, true)
ON CONFLICT (code) DO NOTHING;
```

### AccessoriesStep: Service Row — Add Price and Unit Label

```tsx
// src/components/intake/accessories-step.tsx
// In the service listing (filteredServices.map) — MODIFY existing row

<div key={service.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-muted/50 rounded-lg">
  {/* Service Info */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium truncate">{service.name}</p>
    <p className="text-xs text-primary-600 font-medium">
      {formatCurrency(pendingPrice[service.id] ?? service.base_price_cents)}
      {service.unit ? ` / ${service.unit}` : ' / unité'}
    </p>
  </div>

  {/* Price Input (per unit — editable before adding) */}
  <div className="flex items-center gap-2">
    <label className="text-xs text-muted-foreground whitespace-nowrap">
      Prix/{service.unit ?? 'unité'}:
    </label>
    <input
      type="number"
      inputMode="decimal"
      min="0"
      step="0.01"
      value={((pendingPrice[service.id] ?? service.base_price_cents) / 100).toFixed(2)}
      onChange={e => handlePriceChange(service.id, Math.round(parseFloat(e.target.value || '0') * 100))}
      className="w-20 text-center border border-border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500"
    />
  </div>

  {/* Quantity Input (decimal) */}
  <div className="flex items-center gap-2">
    <label className="text-xs text-muted-foreground whitespace-nowrap">
      {service.unit ?? 'Qte'}:
    </label>
    <input
      type="number"
      inputMode="decimal"
      min="0.25"
      step="0.25"
      value={getQtyForService(service.id)}
      onChange={e => handleQtyChange(service.id, parseFloat(e.target.value) || 0.25)}
      className="w-20 text-center border border-border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500"
    />
  </div>

  {/* Add Button */}
  <button
    type="button"
    onClick={() => handleAddAccessory(service)}
    className="flex items-center gap-1 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm min-h-[44px] touch-manipulation transition-colors whitespace-nowrap"
  >
    <Plus className="w-4 h-4" />
    Ajouter
  </button>
</div>
```

### AccessoriesStep: State and Handlers for Price Input

```typescript
// Add to component state
const [pendingPrice, setPendingPrice] = useState<Record<string, number>>({});

// Add handler
const handlePriceChange = (serviceId: string, priceCents: number) => {
  setPendingPrice(prev => ({ ...prev, [serviceId]: Math.max(0, priceCents) }));
};

// Update handleAddAccessory to use pendingPrice
const handleAddAccessory = (service: Service) => {
  const qty = getQtyForService(service.id);
  const priceCents = pendingPrice[service.id] ?? service.base_price_cents;

  const accessoryService: GarmentService = {
    serviceId: service.id,
    serviceName: service.name,
    qty,
    customPriceCents: priceCents,   // uses pendingPrice not base_price_cents
    assignedSeamstressId: null,
    estimatedMinutes: 0,
    isAccessory: true,
  };
  // ... rest of handler unchanged
};
```

### AccessoriesStep: AddedAccessory Summary — Unit Display

```tsx
// Updated AddedAccessory interface
interface AddedAccessory {
  serviceId: string;
  serviceName: string;
  qty: number;
  customPriceCents: number;
  unit?: string | null;       // NEW
  garmentIndex: number;
  serviceIndex: number;
}

// In addedAccessories useMemo — add unit capture
// (requires tracking unit in GarmentService or looking it up from services[])
// Simplest approach: track unit in addedAccessories by matching serviceId back to services[]
const addedAccessories: AddedAccessory[] = useMemo(() => {
  const result: AddedAccessory[] = [];
  const serviceMap = new Map(services.map(s => [s.id, s]));
  data.forEach((garment, garmentIndex) => {
    garment.services.forEach((svc, serviceIndex) => {
      if (svc.isAccessory === true) {
        const catalogService = serviceMap.get(svc.serviceId);
        result.push({
          serviceId: svc.serviceId,
          serviceName: svc.serviceName || svc.customServiceName || 'Accessoire',
          qty: svc.qty,
          customPriceCents: svc.customPriceCents || 0,
          unit: catalogService?.unit ?? null,   // look up unit from catalog
          garmentIndex,
          serviceIndex,
        });
      }
    });
  });
  return result;
}, [data, services]);

// Updated summary line using unit
<p className="text-xs text-muted-foreground">
  {acc.qty} {acc.unit ?? 'unité'} &times;{' '}
  {formatCurrency(acc.customPriceCents)}/{acc.unit ?? 'unité'} ={' '}
  {formatCurrency(acc.customPriceCents * acc.qty)}
</p>
```

---

## State of the Art

| Old Approach | Current Approach | Change in Phase 7 | Impact |
|--------------|------------------|-------------------|--------|
| No fabric products in system | No fabric services in service table | Add 2 rows via migration | Fabric appears in AccessoriesStep |
| Generic "/ unité" price label | Hardcoded "/ unite" in AccessoriesStep | Read `service.unit`, show "/ yard" or "/ sq ft" | User sees unit-specific label |
| Price defaults to base_price_cents (0) | No price input before add | Add price input per service row | User can set price before adding |
| Summary shows "Qte: X × $Y" | Generic quantity label | "X yard × $Y/yard = $Z" | Matches requirement format |

---

## Open Questions

1. **French unit label for "yard" and "sq ft"**
   - What we know: The requirement uses English unit names ("yard", "sq ft"). The project primary language is French.
   - What's unclear: Should the DB unit value be French ("verge", "pied carre") or English ("yard", "sq ft")? The `unit` column value is displayed directly in the UI.
   - Recommendation: Store English unit values in the DB (`unit = 'yard'`, `unit = 'sq ft'`) since they are internationally recognized unit abbreviations. If French is required, use `unit = 'vg'` (verge) and `unit = 'pi²'`. Since the requirement spec uses "yard" and "sq ft" explicitly, use those.

2. **Price input: show for all accessories or only for `base_price_cents = 0` items**
   - What we know: Currently no price input exists before adding. The fabric items require it because `base_price_cents = 0`.
   - What's unclear: Is adding a price input to every accessory row desirable, or should it only appear for items with a 0 base price?
   - Recommendation: Show the price input on every accessory row. It's useful for all items (seamstress may want to override any price). Consistent with the alteration step's inline price editing pattern.

3. **Category: `accessories` vs creating a new `fabrics` category query**
   - What we know: `service.category = 'fabrics'` values would not appear in AccessoriesStep. A `fabrics` category does exist in the `category` table.
   - What's unclear: Should `AccessoriesStep` be extended to also query `fabrics` category? The phase 7 scope only requires 2 fabric items, not a full fabrics category feature.
   - Recommendation: Use `category = 'accessories'` for the two fabric rows. Keep the scope minimal. If a full fabrics category is needed later (MKT-119 or future), that's a separate phase.

---

## Validation Architecture

> Note: `workflow.nyquist_validation` key absent from `.planning/config.json` — treat as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — project uses TypeScript + manual testing |
| Config file | None |
| Quick run command | `npx tsc --noEmit` |
| Full suite command | `npx tsc --noEmit && npx next build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MKT-117 | Fabric rows appear in AccessoriesStep service list | smoke | `npx tsc --noEmit` (compile) + manual — open accessories step, verify 2 fabric rows appear | N/A |
| MKT-117a | Decimal qty accepted (1.5 yards) | unit | `npx tsc --noEmit` (Zod schema unchanged) | N/A |
| MKT-117b | Price input visible and editable before adding | smoke | Manual — verify price field on each service row | N/A |
| MKT-117c | Fabric items excluded from calendar | integration | Manual — create accessories-only fabric order, verify no calendar event in N8N | N/A |
| MKT-117d | Invoice shows "1.5 yard × $5.00/yard = $7.50" | smoke | Manual — create order with fabric, check summary | N/A |

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit`
- **Per wave merge:** `npx tsc --noEmit && npx next build`
- **Phase gate:** TypeScript clean + manual test of fabric order creation before `/gsd:verify-work`

### Wave 0 Gaps

None — existing infrastructure covers all phase requirements. No new test files needed.

---

## Sources

### Primary (HIGH confidence)

- Direct source read: `src/components/intake/accessories-step.tsx` — full component, category query filter, price display logic, AddedAccessory interface
- Direct source read: `src/components/intake/alteration-step.tsx` — GarmentService and Garment interface definitions (exported, used by AccessoriesStep)
- Direct source read: `src/lib/types/database.ts` — `Service` type includes `unit: string | null`, `GarmentService` type, full schema
- Direct source read: `supabase/migrations/0010_add_service_unit_column.sql` — `unit VARCHAR(50)` on service table confirmed
- Direct source read: `supabase/migrations/0009_create_category_table.sql` — `fabrics` category exists; `accessories` category key confirmed
- Direct source read: `supabase/migrations/0043_accessories_quantity_and_recategorize.sql` — category normalized to `accessories`, NUMERIC(10,2) qty confirmed
- Direct source read: `src/app/api/intake/route.ts` — `isAccessory: true` skips estimatedMinutes and calendar gate confirmed at lines 68, 671
- Direct source read: `src/app/(protected)/intake/page.tsx` — AssignmentStep filters `isAccessory` items, confirming accessories are handled correctly end-to-end
- Direct source read: `.planning/phases/06-order-form-restructure-4-sections/06-RESEARCH.md` — Phase 6 architecture documentation

### Secondary (MEDIUM confidence)

- REQUIREMENTS.md MKT-117 section — requirement specification verified
- ROADMAP-M2.md Phase 7 section — success criteria verified

### Tertiary (LOW confidence)

- Live database state of existing accessory service `display_order` values — cannot verify without DB access; using high values (100, 101) as safe default

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools verified from source
- Architecture: HIGH — full codebase read of all affected files
- DB migration: HIGH — service table schema and unit column verified from migrations
- Pitfalls: HIGH — identified from direct code path analysis
- Open questions: LOW — minor naming/scope decisions; none block implementation

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable codebase; no fast-moving dependencies)

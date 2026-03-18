# Phase 6: Order Form Restructure — 4 Sections - Research

**Researched:** 2026-03-18
**Domain:** React multi-step form refactoring, Supabase schema migration, service categorization
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MKT-116 | Split intake form into 4 sections: Client Info, Alteration (labour), Accessories (products), Pricing/Finalization | Full architecture mapped below |
| MKT-116a | Both Alteration and Accessories are OPTIONAL — order can be either or both | Validation guard pattern documented |
| MKT-116b | Product items (invisible zippers, separable zips, thread, buttons, velcro) moved to Accessories | DB recategorization migration documented |
| MKT-116c | Only Alteration items feed production calendar | Calendar webhook filter pattern documented |
| MKT-116d | Accessories appear on invoice only — zero calendar/workload impact | No estimated_minutes required for accessories |
| MKT-116e | Time estimates per alteration item are editable on the fly | Already implemented in garment-services-step.tsx |
| MKT-116f | Accessories support decimal quantities (0.25, 0.5, 1.75) | DB migration + dto.ts change documented |
</phase_requirements>

---

## Summary

Phase 6 restructures the intake form from 3 functional steps (Client, GarmentServices, Pricing) into 4 explicit sections: Client Info, Alteration, Accessories, and Pricing/Finalization. The core work is splitting the monolithic `garment-services-step.tsx` (80 KB, ~1700 lines) into two purpose-specific steps while updating the data model to treat alteration services and accessory products as distinct categories.

The critical architectural insight is that the current form already has the category infrastructure in place — the `category` table has both `alterations` and `accessories` keys, and `service.category` is a VARCHAR field. The work is: (1) route each category to the right step in the form UI, (2) migrate misclassified services (zippers, buttons, thread, velcro) from `alterations` to `accessories` in the DB, (3) change `garment_service.quantity` from INTEGER to NUMERIC(10,2) for decimal support, (4) update the intake API validation to skip the `estimatedMinutes > 0` guard for accessory services, and (5) filter the calendar webhook to only fire for alteration services.

The key data-flow change: both alteration and accessories services are stored in the same `garment_service` table — the distinction is tracked via `service.category`. The `AssignmentStep` and `PricingStep` do not need structural changes, only the intake page step flow and the garment-services component need splitting.

**Primary recommendation:** Split `GarmentServicesStep` into `AlterationStep` and `AccessoriesStep` by extracting the service-tab UI logic and filtering by `service.category`. Keep the garment configuration (type, color, brand, notes) in `AlterationStep` since alterations always require a garment. Accessories can share garments from the alteration step or operate independently.

---

## Standard Stack

### Core (already in project — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | Component state and step management | Already in use |
| Next.js 14 | 14.x | App Router, `use client` | Already in use |
| Supabase client | 2.x | Direct DB queries from service components | Already in use — `createClient()` pattern |
| Zod | 3.x | Schema validation in dto.ts | Already in use |
| nanoid | Latest | Label code generation | Already in use in garment-services-step |

### No New Dependencies Required
This phase is pure refactoring and migration work. No new npm packages needed.

**Installation:** None required.

---

## Architecture Patterns

### Current Step Flow (Before Phase 6)

```
client -> pipeline -> garment-services -> pricing -> assignment -> summary
```

The `garment-services` step is a single merged component that handles:
- Garment type selection
- Service selection (all categories in one tabbed UI)
- Per-service quantity, price, time, and assignment

### Target Step Flow (After Phase 6)

```
client -> pipeline -> alteration -> accessories -> pricing -> assignment -> summary
```

Both `alteration` and `accessories` steps are optional. The progress bar will show 7 steps. The form data model does not change at the top level — both steps populate `formData.garments`.

### Recommended File Structure Changes

```
src/components/intake/
├── client-step.tsx               # unchanged
├── garment-services-step.tsx     # retained for reference / future rollback
├── alteration-step.tsx           # NEW — garment config + alteration services
├── accessories-step.tsx          # NEW — accessories/products selection
├── pricing-step.tsx              # unchanged structure, receives combined garments
└── assignment-step.tsx           # unchanged

src/app/(protected)/intake/page.tsx  # updated: new steps, optional skip logic
src/app/api/intake/route.ts          # updated: skip estimatedMinutes guard for accessories
src/lib/webhooks/calendar-webhook.ts  # updated: filter to alteration category only
src/lib/dto.ts                        # updated: qty z.number().int() -> z.number()
supabase/migrations/0043_accessories_migration.sql  # NEW
```

### Pattern 1: Shared Garment Data Model — Two Steps, One Array

Both `AlterationStep` and `AccessoriesStep` write to `formData.garments`. The garment object already supports mixed services. The split is purely in the UI:

- `AlterationStep` shows only services where `service.category === 'alterations'`
- `AccessoriesStep` shows only services where `service.category === 'accessories'`

Services added in both steps accumulate in the same garment's `services[]` array. The intake API, pricing, and assignment steps receive the combined `formData.garments` unchanged.

```typescript
// IntakeStep type in page.tsx — add two new steps
type IntakeStep =
  | 'pipeline'
  | 'client'
  | 'alteration'       // NEW — replaces 'garment-services' for labour items
  | 'accessories'      // NEW — product items only
  | 'pricing'
  | 'assignment'
  | 'summary';
```

### Pattern 2: Optional Step Validation

Both Alteration and Accessories steps are optional. The form can proceed with either or both populated. The existing `handleSubmit` guard checks `formData.garments.length === 0` — this should remain, but at least ONE of the two sections must have added a garment+service.

```typescript
// In page.tsx handleSubmit — existing guard stays
if (formData.garments.length === 0) {
  setError('Au moins un article (retouche ou accessoire) est requis');
  return;
}
```

The "Next" button on AlterationStep should allow proceeding with 0 garments (user skips to Accessories). Same for AccessoriesStep.

### Pattern 3: Service Category Filtering in Step Components

```typescript
// In AlterationStep — filter services to alteration category only
const fetchAlterationServices = async () => {
  const { data } = await supabase
    .from('service')
    .select('*')
    .eq('is_active', true)
    .eq('category', 'alterations')  // strict filter
    .order('display_order')
    .order('name');
  setServices(data || []);
};

// In AccessoriesStep — filter services to accessories category only
const fetchAccessoryServices = async () => {
  const { data } = await supabase
    .from('service')
    .select('*')
    .eq('is_active', true)
    .eq('category', 'accessories')  // strict filter
    .order('display_order')
    .order('name');
  setServices(data || []);
};
```

### Pattern 4: Decimal Quantity Input

Accessories require decimal quantities (0.25, 0.5, 1.75). The current `qty` field uses `type="number"` with integer step. Accessories need `step="0.25"` or unrestricted decimal input.

```tsx
// AccessoriesStep qty input
<input
  type="number"
  inputMode="decimal"
  min="0.25"
  step="0.25"
  value={svc.qty}
  onChange={e => handleQtyChange(parseFloat(e.target.value) || 0.25)}
/>
```

The `calcTotal.ts` function already handles decimal quantities correctly — `unit_price_cents * item.quantity` works with floats. No change needed in pricing logic.

### Pattern 5: Calendar Webhook Filter

The calendar webhook currently fires when any service is assigned. After Phase 6, it must only fire based on alteration services. The `formatOrderForCalendar` function receives garments and their services — it needs to filter by category.

```typescript
// calendar-webhook.ts — updated formatOrderForCalendar
// Accessories services must NOT add to totalMinutes
// The function needs garments with service category information
// The intake API already has garment service data — pass category info
```

The current intake API calls `formatOrderForCalendar` with order-level data, not service-level data. The calendar fires at the order level based on `assigned_to`. The simplest fix: pass `hasAlterationServices` flag to the calendar condition.

```typescript
// In intake/route.ts — only create calendar event if there are alteration services
const hasAlterationServices = pricingItems.some(item =>
  /* need to track which items are alterations */
);
if (calendarAssignee && dueDate && hasAlterationServices) {
  // create calendar event
}
```

### Pattern 6: Intake API — Skip estimatedMinutes Validation for Accessories

The current API validation (lines 64-75 in route.ts) rejects services without `estimatedMinutes > 0`. Accessories must skip this check:

```typescript
// route.ts — updated validation
for (const garment of garments) {
  for (const service of garment.services || []) {
    // Skip estimatedMinutes check for accessories
    if (service.isAccessory) continue; // or check via DB lookup by category
    if (!service.estimatedMinutes || service.estimatedMinutes <= 0) {
      return NextResponse.json(
        { error: `Le temps estimé est requis pour chaque retouche. Service manquant: ${service.serviceName || service.serviceId}` },
        { status: 400 }
      );
    }
  }
}
```

The cleanest approach: add an `isAccessory: boolean` flag to the `GarmentService` interface in the form data, set it in `AccessoriesStep`, and pass it through to the API. The API then skips time validation and calendar contribution for those items.

### Pattern 7: garment_service.quantity Migration

Current: `quantity INTEGER DEFAULT 1`
Target: `quantity NUMERIC(10,2) DEFAULT 1`

PostgreSQL safely handles ALTER COLUMN type change from INTEGER to NUMERIC — existing integer values (1, 2, 3) become (1.00, 2.00, 3.00) automatically. No data loss.

```sql
-- Migration 0043
ALTER TABLE garment_service
  ALTER COLUMN quantity TYPE NUMERIC(10,2) USING quantity::NUMERIC(10,2);

-- Update service categories
UPDATE service SET category = 'accessories'
WHERE code IN ('ZIPPER', 'BUTTONS')
  AND category = 'alteration';

-- Note: Any other product services (invisible zipper, separable zip, thread, velcro)
-- need to be identified from live DB — add their codes here
```

### Anti-Patterns to Avoid

- **Don't create a separate garments_accessories array** — keep all garments in the single `formData.garments` array. The split is UI-only.
- **Don't change the IntakeRequest API shape** — the API receives `garments[]` with mixed services. Adding an `isAccessory` flag on each service is additive and backward-compatible.
- **Don't require both sections to be filled** — either can be empty. The only requirement is at least one section has content.
- **Don't break the existing AssignmentStep** — accessories still get assigned (for packing/prep work), only their time estimate is skipped from calendar.
- **Don't change calcTotal.ts** — it already handles decimal multiplication correctly.
- **Don't remove the tab-based category navigation from garment-services-step.tsx** — the new components should each have their own simplified service picker (no tabs needed since each step shows only one category).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Decimal qty rounding | Custom rounding logic | `parseFloat(e.target.value)` + `step="0.25"` on input | Browser handles step validation; parseFloat handles the decimal |
| Category detection | Custom classification logic | `service.category === 'accessories'` DB filter | Category already stored in DB — single source of truth |
| Service tab navigation in AccessoriesStep | New tab component | No tabs needed — accessories is a single flat list | Only one category shown; tabs add complexity |
| Two-section progress bar | Custom progress component | Update existing step indicator with 7 steps | Same pattern, just add 2 steps |
| Quantity validation | Custom regex | Zod `z.number().min(0.01)` | Standard Zod pattern |

---

## Common Pitfalls

### Pitfall 1: estimatedMinutes Validation Blocks Accessories
**What goes wrong:** The intake API currently rejects any service without `estimatedMinutes > 0`. Accessories have no time estimate. Without the fix, adding accessories causes a 400 error.
**Why it happens:** The validation was added in Phase 14 (mandatory time field) without distinguishing between alteration and accessory services.
**How to avoid:** Add `isAccessory: boolean` to the service payload, skip the time check for accessories in the API. The form must set this flag when adding from AccessoriesStep.
**Warning signs:** "Le temps estimé est requis" error on order submission with accessories.

### Pitfall 2: Calendar Fires for Accessory-Only Orders
**What goes wrong:** If an order has only accessories (no alterations), the calendar event should NOT fire. Currently the calendar fires whenever there is an assigned seamstress + due date.
**Why it happens:** `formatOrderForCalendar` uses `order.assigned_to` as the trigger, not service categories.
**How to avoid:** Track whether any alteration services exist at the intake API level; gate the calendar call on `hasAlterationServices`.
**Warning signs:** Calendar events appearing for orders that only have product accessories.

### Pitfall 3: Garment Required for Accessories
**What goes wrong:** Accessories like "invisible zipper" still belong to a garment (the garment being repaired), but a user might not think to add a garment type when they only want to sell accessories.
**Why it happens:** Current model requires garment → services. Pure product sales have no garment context.
**How to avoid:** For the AccessoriesStep, still create a garment record in the DB (as a "virtual" container), but make the garment type optional (already nullable). Or: allow AccessoriesStep to add services to the last garment from AlterationStep, or create a default "Accessories" garment automatically.
**Recommendation:** The simplest approach — if Accessories is used standalone (no garments from AlterationStep), auto-create a minimal garment record with type "Accessories" as the container.
**Warning signs:** Foreign key constraint failure when trying to insert garment_service without a garment_id.

### Pitfall 4: Pricing Step Receives Mixed Services
**What goes wrong:** PricingStep shows all services from both alteration and accessories sections. The summary display needs to show them both but may currently calculate pricing incorrectly if `estimatedMinutes` is absent for accessories.
**Why it happens:** PricingStep accesses `garment.services[]` directly; if accessories services have `estimatedMinutes: undefined`, any code that reads it may show NaN or 0.
**How to avoid:** PricingStep's `getServicePrice` function only uses `customPriceCents` and `base_price_cents` — it does not touch `estimatedMinutes`. Safe as-is. Just ensure the pricing display labels accessories correctly.
**Warning signs:** NaN or 0 in pricing summary for accessories.

### Pitfall 5: dto.ts qty Type Change Breaks Existing Validation
**What goes wrong:** `garmentCreateSchema` uses `z.number().int()` for `qty`. After changing to `z.number()`, any existing callers that pass integer qtys still work (integers are valid numbers). But code that reads qty and feeds it to integer-expecting SQL will fail.
**Why it happens:** The DB column was INTEGER — SQL rejects `1.5` if column is still INTEGER.
**How to avoid:** DB migration must run BEFORE dto.ts change goes live. If deploying incrementally, run migration first. The migration is safe (INTEGER → NUMERIC is backward-compatible in PostgreSQL).
**Warning signs:** Postgres error "invalid input syntax for type integer" on decimal quantities.

### Pitfall 6: Assignment Step Shows Accessories
**What goes wrong:** The AssignmentStep lists all services for assignment. Accessories appearing there is fine (they may need to be retrieved from stock) but the time displayed (0 or undefined) could confuse staff.
**Why it happens:** AssignmentStep reads `assignmentItems` computed from all garments/services.
**How to avoid:** Either (a) add an `isAccessory` flag to AssignmentItem and label them as "Accessoire" rather than showing time, or (b) filter accessories from the AssignmentStep display. Option (b) is simpler. Accessories don't need seamstress assignment if they're just physical products.
**Recommendation:** Filter `isAccessory === true` items from the AssignmentStep list. They're added to the order but don't need a seamstress.

---

## Code Examples

### AlterationStep Props Interface

```typescript
// src/components/intake/alteration-step.tsx
interface AlterationStepProps {
  data: Garment[];
  onUpdate: (garments: Garment[]) => void;
  onNext: () => void;
  onPrev: () => void;
  orderType: 'alteration' | 'custom';
  client?: any;
  onChangeCustomer?: () => void;
}
// GarmentService interface extended for category tracking
interface GarmentService {
  serviceId: string;
  serviceName?: string;
  qty: number;
  customPriceCents?: number;
  customServiceName?: string;
  assignedSeamstressId?: string | null;
  estimatedMinutes?: number;
  isAccessory?: boolean;  // NEW — false for alterations, true for accessories
}
```

### AccessoriesStep Props Interface

```typescript
// src/components/intake/accessories-step.tsx
interface AccessoriesStepProps {
  data: Garment[];               // receives existing garments from AlterationStep
  onUpdate: (garments: Garment[]) => void;
  onNext: () => void;
  onPrev: () => void;
}
// AccessoriesStep adds services with isAccessory: true to existing garments
// or creates a new "Accessories" garment if data is empty
```

### DB Migration Template

```sql
-- supabase/migrations/0043_accessories_quantity_and_recategorize.sql

-- 1. Change quantity to NUMERIC(10,2) for decimal support
ALTER TABLE garment_service
  ALTER COLUMN quantity TYPE NUMERIC(10,2)
  USING quantity::NUMERIC(10,2);

-- 2. Update garment_service min_quantity default check if any exists
-- (none exists in current schema — safe to skip)

-- 3. Recategorize physical product services from 'alteration' to 'accessories'
-- These are non-labour items that should not appear in production calendar
UPDATE service
SET category = 'accessories'
WHERE code IN ('ZIPPER', 'BUTTONS')
  AND (category = 'alteration' OR category IS NULL);

-- 4. Verify the accessories category exists (it does — seeded in 0009)
-- ('accessories', 'Accessories', '🧵', 2, true) already in category table

-- Note: Additional product services (invisible zipper, separable zip, thread, velcro)
-- were added via the admin pricing page (not in migrations) — run a targeted
-- UPDATE against the live DB by service name pattern:
-- UPDATE service SET category = 'accessories'
-- WHERE lower(name) SIMILAR TO '%(zipper|fermeture|zip|bouton|velcro|thread|fil|velours)%'
--   AND category = 'alterations';
```

### dto.ts Change

```typescript
// src/lib/dto.ts
// Line 65: CHANGE
// FROM:
qty: z.number().int().min(1, 'Quantity must be at least 1'),
// TO:
qty: z.number().min(0.01, 'Quantity must be greater than 0'),
```

### Intake Route — Accessory Validation Bypass

```typescript
// src/app/api/intake/route.ts
// Updated estimatedMinutes validation (lines 64-75)
for (const garment of garments) {
  for (const service of garment.services || []) {
    // Accessories (isAccessory: true) do not require time estimates
    if (service.isAccessory) continue;
    if (!service.estimatedMinutes || service.estimatedMinutes <= 0) {
      return NextResponse.json(
        { error: `Le temps estimé est requis pour chaque retouche. Service manquant: ${service.serviceName || service.serviceId}` },
        { status: 400 }
      );
    }
  }
}
```

### Calendar — Alteration-Only Filter

```typescript
// src/app/api/intake/route.ts
// After building pricingItems, track if any alteration services exist
let hasAlterationServices = false;
for (const garment of garments) {
  for (const service of garment.services || []) {
    if (!service.isAccessory) {
      hasAlterationServices = true;
      break;
    }
  }
}

// Only create calendar event for orders with alteration work
if (calendarAssignee && dueDate && hasAlterationServices) {
  // existing calendar event creation code
}
```

### page.tsx — Updated IntakeStep and Steps Array

```typescript
// src/app/(protected)/intake/page.tsx
type IntakeStep =
  | 'pipeline'
  | 'client'
  | 'alteration'       // replaces 'garment-services'
  | 'accessories'      // new
  | 'pricing'
  | 'assignment'
  | 'summary';

const steps = [
  { key: 'client',      title: 'Client',       description: 'Informations client' },
  { key: 'pipeline',    title: 'Type',         description: 'Type de commande' },
  { key: 'alteration',  title: 'Retouches',    description: 'Articles et retouches' },
  { key: 'accessories', title: 'Accessoires',  description: 'Produits et accessoires' },
  { key: 'pricing',     title: 'Tarification', description: 'Tarification et date' },
  { key: 'assignment',  title: 'Attribution',  description: 'Attributer les tâches' },
];
// Note: 'summary' not shown in step indicator (it's the success state)
```

---

## Current State Analysis

### What garment-services-step.tsx Currently Does

The component is ~1700 lines and merges three former steps:
1. Garment type selection (dropdown with categories, custom type creation)
2. Service selection (tabs by category: alterations / accessories / outdoor)
3. Per-service configuration: qty, custom price, time estimate, assignment dropdown
4. "Add to Order" — validates all fields, pushes garment to `formData.garments`

The service tab filtering is already done at line ~392-402 via `filteredCategories`:
```typescript
// garment-services-step.tsx line 394-397
result = categories.filter(cat =>
  ['alterations', 'accessories', 'outdoor'].includes(cat.key)
);
```

So the current step ALREADY shows an "Accessories" tab — it just doesn't separate it into its own step. The split is about routing these categories to dedicated steps, not creating new category logic.

### DB Schema: garment_service.quantity

Current type in `database.ts`: `quantity: number` (TypeScript representation)
Current type in DB: `INTEGER DEFAULT 1` (set in migration 0001_init.sql)
Required: `NUMERIC(10,2)` to support 0.25, 0.5, 1.75

### Service Categories Currently in DB

From migrations:
- `alterations` — hemming, waistband, sleeve work (labor)
- `accessories` — category exists in `category` table (migration 0009)
- The seed services (HEM, TAKE_IN, ZIPPER, BUTTONS) are all seeded with `category = 'alteration'` (singular) in 0001_init.sql
- The `category` table key uses `'alterations'` (plural) — there is a category matching issue to investigate

**Critical finding:** The service table uses `category VARCHAR(100)` with values seeded as `'alteration'` (singular). The `category` table has key `'alterations'` (plural). The `getServicesByCategory` function in garment-services-step handles this with fuzzy matching:
```typescript
// garment-services-step.tsx ~line 421-429
if (serviceCategory === key) categoryMatches = true;
else if (serviceCategory === `${key}s` || serviceCategory === key.slice(0, -1)) categoryMatches = true;
```

The migration should normalize: update `service.category` to match the `category.key` values exactly (use plural forms consistently).

### Form Data Interface Changes Required

`IntakeFormData.garments[].services[]` needs `isAccessory` flag:

```typescript
// Current (page.tsx line 45-52)
services: Array<{
  serviceId: string;
  serviceName?: string;
  qty: number;
  customPriceCents?: number;
  assignedSeamstressId?: string | null;
  estimatedMinutes?: number;
}>;

// Required (add isAccessory flag)
services: Array<{
  serviceId: string;
  serviceName?: string;
  qty: number;
  customPriceCents?: number;
  assignedSeamstressId?: string | null;
  estimatedMinutes?: number;
  isAccessory?: boolean;  // NEW
}>;
```

This field flows all the way through to the API payload where it gates the `estimatedMinutes` check and the calendar creation.

---

## State of the Art

| Old Approach | Current Approach | Change in Phase 6 | Impact |
|--------------|------------------|-------------------|--------|
| All services in one step with tabs | One merged step (garment-services) | Two steps: alteration + accessories | Clearer UX |
| Qty always INTEGER | qty INTEGER in DB | qty NUMERIC(10,2) | Decimal quantities work |
| No category distinction in API | API validates time for all services | API skips time for accessories | Accessories can be submitted |
| Calendar fires for any assigned service | No category filtering | Calendar only fires for alterations | Accessories don't pollute calendar |
| Service.category = 'alteration' (singular) | Fuzzy matching in UI | Normalized to 'alterations' (plural) | Consistent DB state |

---

## Open Questions

1. **Pure accessory orders (no garments)**
   - What we know: `garment_service` requires a `garment_id` FK. An order with only accessories still needs a garment record in the DB.
   - What's unclear: Should the AccessoriesStep auto-create a "virtual" garment (type = 'Accessoires'), or should accessories be attached to the garment chosen in AlterationStep?
   - Recommendation: Auto-create a minimal garment record with `type = 'Accessoires'` when AccessoriesStep is used without a prior AlterationStep. This keeps the DB model clean.

2. **Which live services need recategorization**
   - What we know: Seed data has ZIPPER and BUTTONS as `category = 'alteration'`. Live DB may have additional services (invisible zipper, separable zip, thread, velcro) added via the admin pricing import UI.
   - What's unclear: The exact service names and codes in the live database are not visible from the codebase alone.
   - Recommendation: Write a migration that recategorizes by name pattern (ILIKE `%zipper%`, `%zip%`, `%bouton%`, `%button%`, `%velcro%`, `%thread%`, `%fil%`) AND by explicit codes known from the seed.

3. **Accessories assignment (AssignmentStep)**
   - What we know: Currently AssignmentStep shows all services for assignment. Accessories (physical products) typically don't need seamstress assignment.
   - What's unclear: Does the client want accessories to be assignable for stock retrieval purposes?
   - Recommendation: Filter accessories from AssignmentStep by default. If needed later, this can be re-enabled.

---

## Validation Architecture

> Note: `workflow.nyquist_validation` key absent from `.planning/config.json` — treat as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — project uses manual testing |
| Config file | None |
| Quick run command | `npx tsc --noEmit` (TypeScript compile check) |
| Full suite command | `npx tsc --noEmit && npx next build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MKT-116 | Form has 4 steps: Client, Alteration, Accessories, Pricing | smoke | `npx tsc --noEmit` | ❌ Wave 0 |
| MKT-116a | Order can be submitted with only alteration items | integration | Manual — submit order with no accessories | N/A |
| MKT-116a | Order can be submitted with only accessory items | integration | Manual — submit order with no alterations | N/A |
| MKT-116b | Product services appear in Accessories tab not Alteration | smoke | `npx tsc --noEmit` + manual | N/A |
| MKT-116c | Calendar does not fire for accessory-only orders | integration | Manual — check N8N logs | N/A |
| MKT-116f | Quantity 0.5 accepted in accessories | unit | `npx tsc --noEmit` (Zod schema) | N/A |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit`
- **Per wave merge:** `npx tsc --noEmit && npx next build`
- **Phase gate:** TypeScript clean + full intake flow manual test before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] No automated test infrastructure exists in this project
- [ ] All validation is manual + TypeScript compile checks

*(No test framework to install — project relies on TypeScript + manual QA)*

---

## Sources

### Primary (HIGH confidence)
- Direct source reading: `src/app/(protected)/intake/page.tsx` — current step flow, IntakeFormData shape
- Direct source reading: `src/components/intake/garment-services-step.tsx` — full component (~1700 lines)
- Direct source reading: `src/app/api/intake/route.ts` — submission flow, estimatedMinutes validation, calendar call
- Direct source reading: `src/lib/dto.ts` — Zod schemas, qty validation
- Direct source reading: `src/lib/webhooks/calendar-webhook.ts` — calendar trigger logic
- Direct source reading: `src/lib/pricing/calcTotal.ts` — pricing math (handles decimal qty already)
- Direct source reading: `src/lib/types/database.ts` — garment_service.quantity type (number in TS)
- Direct source reading: `supabase/migrations/0001_init.sql` — DB schema origin, service seed data
- Direct source reading: `supabase/migrations/0009_create_category_table.sql` — category table, keys

### Secondary (MEDIUM confidence)
- PostgreSQL documentation pattern: `ALTER COLUMN TYPE NUMERIC` is safe from INTEGER — standard SQL
- REQUIREMENTS.md MKT-116 section — requirement details verified

### Tertiary (LOW confidence)
- Live database state of service categories — cannot verify without DB access; migration uses name-pattern matching as safety net

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already in use
- Architecture: HIGH — full codebase read, patterns verified
- DB migration: HIGH — SQL patterns confirmed from migration history
- Pitfalls: HIGH — identified from actual code paths

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable codebase, no fast-moving dependencies)

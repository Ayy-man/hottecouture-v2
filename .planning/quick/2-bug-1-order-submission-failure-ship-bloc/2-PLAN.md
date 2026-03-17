---
phase: quick
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(protected)/intake/page.tsx
  - src/app/api/intake/route.ts
autonomous: false
requirements: [BUG-1]
must_haves:
  truths:
    - "Clicking 'Creer la commande' on the Assignment step successfully creates an order and navigates to summary"
    - "When order creation fails, the user sees the actual error message from the API (not generic 'Failed to submit order')"
    - "Custom services with non-UUID serviceIds do not cause submission failures"
  artifacts:
    - path: "src/app/(protected)/intake/page.tsx"
      provides: "Client-side order submission with correct error propagation"
    - path: "src/app/api/intake/route.ts"
      provides: "Order creation API with robust error handling and logging"
  key_links:
    - from: "src/app/(protected)/intake/page.tsx"
      to: "/api/intake"
      via: "fetch POST in handleSubmit"
      pattern: "fetch.*api/intake"
    - from: "src/app/api/intake/route.ts"
      to: "supabase.from('order').insert"
      via: "Supabase service role client"
      pattern: "supabase.*from.*order.*insert"
---

<objective>
Fix the ship-blocking bug where the "Creer la commande" button on Step 5 (Assigner les taches) returns "Failed to submit order." No orders can be created in the app until this is resolved.

Purpose: Restore the critical order creation path. Without this fix, the entire application is non-functional for its primary use case.
Output: Working order submission from intake form through API to database.
</objective>

<execution_context>
@/Users/aymanbaig/.claude/get-shit-done/workflows/execute-plan.md
@/Users/aymanbaig/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/(protected)/intake/page.tsx — Client-side form submission logic (handleSubmit at line 206)
@src/app/api/intake/route.ts — Server-side order creation API (POST handler)
@src/lib/dto.ts — Zod schemas including IntakeRequest, garmentCreateSchema (serviceId: uuidSchema at line 64)
@src/lib/supabase/server.ts — Supabase client factory
@src/lib/types/database.ts — Order Insert type (lines 243-273)
@src/components/intake/assignment-step.tsx — The "Creer la commande" button component

<interfaces>
<!-- Key types the executor needs -->

From src/app/(protected)/intake/page.tsx line 254-255 (THE BUG):
```typescript
// Client reads errorData.message but API returns { error: "..." }
const errorData = await response.json();
throw new Error(errorData.message || 'Failed to submit order');
// Should be: errorData.error || errorData.message || 'Failed to submit order'
```

From src/app/api/intake/route.ts — ALL error responses use { error: "..." }:
```typescript
// Line 55: { error: 'Missing required fields: client, order, garments' }
// Line 69: { error: `Le temps estime est requis...` }
// Line 148: { error: `Failed to create client: duplicate detected but not found` }
// Line 153: { error: `Failed to create client: ${clientError.message}` }
// Line 309: { error: `Failed to create order: ${orderError.message}` }
// Line 345: { error: `Failed to create garment: ${garmentError.message}` }
// Line 459: { error: `Service not found: ${service.serviceId}...` }
// Line 492: { error: `Failed to create garment service: ...` }
// Line 699: { error: 'Internal server error', details: ... }
```

From src/lib/dto.ts line 63-66 — serviceId requires UUID but custom services use "custom_" prefix:
```typescript
services: z.array(z.object({
  serviceId: uuidSchema,  // Rejects "custom_a1b2c3d4" format!
  qty: z.number().int().min(1),
  customPriceCents: z.number().int().min(0).optional(),
}))
```

From src/lib/types/database.ts — Order Insert type:
```typescript
Insert: {
  client_id: string;          // REQUIRED
  type: 'alteration' | 'custom'; // REQUIRED
  // Everything else is optional with DB defaults
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix error message propagation and add diagnostic logging</name>
  <files>src/app/(protected)/intake/page.tsx, src/app/api/intake/route.ts</files>
  <action>
TWO changes needed:

**A) Fix error field name mismatch in intake/page.tsx (line 254-255):**
The catch block reads `errorData.message` but the API returns `{ error: "..." }`. Change line 255 from:
```typescript
throw new Error(errorData.message || 'Failed to submit order');
```
to:
```typescript
throw new Error(errorData.error || errorData.message || errorData.details || 'Failed to submit order');
```
This ensures the actual server error message reaches the user. The API consistently uses `{ error: "..." }` in all error responses (9 locations). The 500 catch-all also includes `{ details: "..." }`.

**B) Add a structured diagnostic log at the TOP of the API POST handler in route.ts:**
Right after parsing the request body (after line 43), add a `console.log` that dumps the full request body as JSON string (truncated to 2000 chars) so that when the error occurs, the Vercel function logs will show exactly what payload was sent:
```typescript
console.log('INTAKE_DEBUG_PAYLOAD:', JSON.stringify(body).substring(0, 2000));
```

Also, in the outer catch block (line 687-701), enhance error logging to include the full error object:
```typescript
console.error('INTAKE_FATAL_ERROR:', JSON.stringify({
  message: error instanceof Error ? error.message : String(error),
  stack: error instanceof Error ? error.stack : undefined,
  name: error instanceof Error ? error.name : undefined,
}, null, 2));
```

Do NOT change the API response format. Do NOT change any business logic. These are purely diagnostic and error-propagation fixes.
  </action>
  <verify>
    <automated>cd "/Users/aymanbaig/Desktop/Manual Library/hottecouture-main" && npx tsc --noEmit --pretty 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Error responses from API are correctly displayed to the user (errorData.error is read, not errorData.message)
    - Full request payload is logged for debugging in Vercel logs
    - Fatal errors include structured JSON logging
    - TypeScript compiles clean
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix custom service serviceId validation and harden API payload handling</name>
  <files>src/app/api/intake/route.ts</files>
  <action>
There are two potential failure vectors in the API route that would cause 500 errors without clear messages:

**A) Custom service price lookup fails silently (lines 177-185):**
When the API iterates garments to build `pricingItems`, it queries `supabase.from('service').select('base_price_cents').eq('id', service.serviceId).single()` for EVERY service — including custom services with IDs like `custom_a1b2c3d4`. The `.single()` call will error because no row exists with that ID in the service table, but the code silently falls through to a default `5000`. However, the Supabase error might be logged noisily or could throw in some edge cases.

Fix: Skip the DB lookup for custom services in the pricing loop (lines 169-201). Add a guard at the start of the inner loop:
```typescript
for (const service of garment.services) {
  const isCustom = service.serviceId?.startsWith('custom-') || service.serviceId?.startsWith('custom_');

  let basePrice = 5000;
  let servicePrice = service.customPriceCents || basePrice;

  if (!isCustom) {
    const { data: serviceData } = await supabase
      .from('service')
      .select('base_price_cents')
      .eq('id', service.serviceId)
      .single();

    basePrice = (serviceData as any)?.base_price_cents || 5000;
    servicePrice = service.customPriceCents || basePrice;
  }
  // ... rest of pricing item push
}
```

**B) Null safety on garment fields (lines 327-340):**
The garment insert sends `garment_type_id: garment.garment_type_id` which could be undefined (not null). Supabase may reject undefined values differently from null. Ensure explicit null coalescing:
```typescript
garment_type_id: garment.garment_type_id || null,
```
Also ensure `color`, `brand`, `notes` use `|| null` rather than `|| 'Unknown'` for color/brand — but check existing behavior first. The current code uses `garment.color || 'Unknown'` which is fine for existing DB constraints. Leave color/brand defaults as-is.

**C) Defensive check on service.serviceId being undefined/null:**
Before the custom service check on line 359, add a guard:
```typescript
if (!service.serviceId) {
  console.error('INTAKE_BUG: service missing serviceId', JSON.stringify(service));
  return NextResponse.json(
    { error: 'Un service est invalide (identifiant manquant). Veuillez rafraichir et reessayer.' },
    { status: 400 }
  );
}
```

Do NOT modify the DTO schema (dto.ts) — the schema is not used for runtime validation in the API route (the route parses raw JSON, not validated through Zod). The dto.ts serviceId UUID constraint only affects TypeScript types.
  </action>
  <verify>
    <automated>cd "/Users/aymanbaig/Desktop/Manual Library/hottecouture-main" && npx tsc --noEmit --pretty 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Custom services with "custom_" or "custom-" prefixed IDs skip the service table lookup in the pricing loop
    - garment_type_id is explicitly null-coalesced
    - Missing serviceId produces a clear 400 error instead of a cryptic 500
    - TypeScript compiles clean
    - No changes to business logic or pricing calculations
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Verify order creation works end-to-end</name>
  <files>src/app/(protected)/intake/page.tsx, src/app/api/intake/route.ts</files>
  <action>Human verifies the order creation flow works after fixes are deployed.</action>
  <what-built>Fixed error message propagation (errorData.error vs errorData.message mismatch) and hardened API payload handling for custom services and null fields. Added diagnostic logging for Vercel function logs.</what-built>
  <how-to-verify>
    1. Open the app in browser, navigate to Intake
    2. Fill out a complete order through all 5 steps (Client, Pipeline, Articles with at least one service, Pricing, Assignment)
    3. Click "Creer la commande" on Step 5
    4. EXPECTED: Order is created successfully, navigates to Summary step with order number and QR code
    5. If it still fails: the error message should now show the ACTUAL error from the API (not generic "Failed to submit order")
    6. Check Vercel function logs for "INTAKE_DEBUG_PAYLOAD" to see the exact payload
    7. If possible, also test with a custom service (one added via "Ajouter un service personnalise") to verify custom service IDs don't cause failures
  </how-to-verify>
  <verify>
    <automated>echo "Manual verification required — see how-to-verify steps above"</automated>
  </verify>
  <done>Order creation succeeds through full intake flow, or specific error message is now visible for further debugging</done>
  <resume-signal>Type "approved" if order creation works, or paste the specific error message now shown</resume-signal>
</task>

</tasks>

<verification>
- TypeScript compiles without errors: `npx tsc --noEmit`
- Error message field reads `errorData.error` (matching API response format)
- Custom service IDs handled defensively in pricing loop
- Diagnostic logging present for production debugging
</verification>

<success_criteria>
- Orders can be created through the full intake flow (Client -> Pipeline -> Articles -> Pricing -> Assignment -> Summary)
- When errors occur, users see the actual API error message instead of generic "Failed to submit order"
- Custom service submissions do not cause 500 errors
- Vercel function logs contain structured payload data for any future debugging
</success_criteria>

<output>
After completion, create `.planning/quick/2-bug-1-order-submission-failure-ship-bloc/2-SUMMARY.md`
</output>

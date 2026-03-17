# Phase 02: French-ify All Customer-Facing Templates - Research

**Researched:** 2026-03-18
**Domain:** i18n string replacement — customer-facing UI, SMS/email templates, GHL messaging
**Confidence:** HIGH

---

## Summary

This phase requires replacing all remaining English strings in customer-visible surfaces with French equivalents. The codebase already has a strong French foundation — the portal page, tracking page, and status page are largely French already. The SMS/GHL message templates in `src/lib/ghl/messaging.ts` already have both `fr` and `en` variants and always default to French for Quebec clients. The primary violations are concentrated in two places: **`src/components/intake/order-summary.tsx`** (the post-order-creation confirmation screen shown to staff, but arguably client-visible) and the hardcoded phone number `(514) 855-1234` in `src/app/(protected)/track/[id]/page.tsx`.

The `next-intl` library (v3) is installed and wired into `src/app/layout.tsx` with `NextIntlClientProvider`. Both `locales/fr.json` and `locales/en.json` exist and are structurally parallel. However, in practice almost no component actually calls `useTranslations()` — the calls are commented out. This phase deliberately does NOT wire next-intl into components (that is Phase 10 / MKT-71). Instead, Phase 2 targets customer-visible hardcoded strings and replaces them with hardcoded French equivalents (matching the codebase convention established in Phases 19, 22-01, 24-02).

**Primary recommendation:** Hardcode French strings directly in affected files. Do not introduce useTranslations() — that is Phase 10's scope.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BUG-3 | Every client-facing template (SMS, email, form labels) in English — Quebec client needs French | Audit below identifies every affected surface; GHL messaging.ts already has FR templates; hardcoded strings in order-summary.tsx and track/[id]/page.tsx are the primary gaps |
</phase_requirements>

---

## Audit: Current State of Customer-Facing Surfaces

### PASS — Already in French

| File | Evidence |
|------|----------|
| `src/app/(public)/portal/page.tsx` | All UI text hardcoded in French: "Portail Client", "Vérifiez le statut...", "Par téléphone", "Numéro de commande", "Rechercher", "Nouvelle recherche", "Suivi de commande", "À venir", "Maintenant" |
| `src/app/(protected)/track/[id]/page.tsx` | Status labels all French: "En attente", "Dépôt reçu", "En cours", "Prêt à ramasser", "Livré". Page heading "Suivi de votre commande". Loading text "Chargement..." |
| `src/app/(protected)/status/page.tsx` | Fully French: "Statut de commande", "Numéro de téléphone", "Nom de famille", "Rechercher", status labels, garment/service display |
| `src/app/(protected)/booking/page.tsx` | Bilingual via local `translations` object; defaults to French (`lang = searchParams.lang || 'fr'`) |
| `src/components/board/sms-confirmation-modal.tsx` | Fully French: "Envoyer la notification de ramassage?", "Passer le SMS", "Envoyer SMS" |
| `src/lib/ghl/messaging.ts` | All SMS/email templates have `fr` and `en` variants; language comes from `client.language` |
| `src/lib/ghl/invoices.ts` | Invoice names/descriptions already in French: "Dépôt - Commande #N", "Solde - Commande #N", "Frais express", "Merci pour votre confiance!" |
| `src/components/intake/pricing-step.tsx` | French: "Précédent", "Tarification", "Traitement...", "Soumettre la commande", date picker "Choisir une date" |
| `src/components/intake/client-step.tsx` | Admin-facing intake form (staff use only, not customer-visible) |
| `locales/fr.json` | Structurally complete, covers all defined namespaces |

### FAIL — Contains English Customer-Facing Strings

| File | English Strings to Replace |
|------|---------------------------|
| `src/components/intake/order-summary.tsx` | "Order Created Successfully!", "Order #{n} has been created successfully", "Order Details", "Order #{n} - {date}", "Order Information", "Order Number:", "Order ID:", "Status:", "Pending", "Pricing Summary", "Subtotal:", "Rush Fee:", "Tax:", "TPS: Canada tax", "TVQ: Québec tax", "Total:", "Order QR Code", "Use this QR code to track the order", "Order #{n}", "Print Labels", "New Order", "What's Next?", "Print Labels" (step 1 title), "Start Work", "Update Status" (steps 2, 3), descriptions for each step. Also "No order data available" fallback |
| `src/app/(protected)/track/[id]/page.tsx` | Hardcoded phone `(514) 855-1234` in `href='tel:+15148551234'` — should use `NEXT_PUBLIC_SHOP_PHONE` env var with fallback (already done in portal page) |

### PARTIAL — English strings but staff-only (NOT customer-facing, can skip)

| File | Observation |
|------|-------------|
| All board/admin pages | Staff-facing, not customer-visible. Out of scope for Phase 2. Phase 10 handles these. |
| `src/components/intake/client-step.tsx` | Intake form is staff-operated (seamstress fills it in); customers never see this UI. Out of scope. |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-intl | ^3.0.0 | i18n framework | Already installed and wired. NOT used by this phase — mentioned only to avoid introducing new patterns |
| React (hardcoded JSX) | (project React version) | Inline French string replacement | Established codebase convention per STATE.md Phase 19, 22-01 decisions |

**No new libraries needed for this phase.** String replacement is purely mechanical.

---

## Architecture Patterns

### Pattern 1: Hardcoded French (Project Convention)

**What:** Replace English JSX string literals with French equivalents directly in the component. No abstraction layer.

**When to use:** Every customer-facing string in this phase. This matches the convention from:
- Phase 19: `"Article ajouté à la commande"` hardcoded in garment-services-step.tsx
- Phase 22-01: Board headers `"Tableau de Production"`, `"Nouvelle Commande"` etc. hardcoded directly
- Phase 24-02: French tooltip labels `"Commande #"`, `"Temps estimé"`, `"Échéance"` hardcoded

**Example (from existing codebase — portal page):**
```tsx
// Source: src/app/(public)/portal/page.tsx
<h1 className='text-3xl font-bold ...'>
  Hotte Couture
</h1>
<p className='text-lg text-muted-foreground mt-1'>Portail Client</p>
<p className='text-sm text-muted-foreground'>Vérifiez le statut de votre commande</p>
```

### Pattern 2: Env Var for Phone Number

**What:** Replace hardcoded phone numbers with `NEXT_PUBLIC_SHOP_PHONE` env var using a fallback.

**When to use:** Any phone number in customer-visible text. Already done in portal page:
```tsx
// Source: src/app/(public)/portal/page.tsx
const SHOP_PHONE = process.env.NEXT_PUBLIC_SHOP_PHONE || '514-667-0082';
// ...
<a href={`tel:${SHOP_PHONE.replace(/-/g, '')}`}>{SHOP_PHONE}</a>
```

Apply same pattern in `track/[id]/page.tsx` to replace the hardcoded `(514) 855-1234`.

### Pattern 3: Bilingual GHL Templates (Already Working)

The GHL messaging module already selects language based on `client.language`:
```typescript
// Source: src/lib/ghl/messaging.ts
const template = MESSAGE_TEMPLATES[action];
return template[language](data); // language is 'fr' | 'en' from client record
```

**No changes needed** to GHL templates — they are bilingual and correct. Quebec clients default to `language: 'fr'`. This is **already working**.

### Anti-Patterns to Avoid

- **Do NOT call `useTranslations()`** in this phase. The commented-out `// const t = useTranslations(...)` calls in pricing-step.tsx and order-summary.tsx are intentional — Phase 10 handles that wiring.
- **Do NOT modify `locales/fr.json` or `locales/en.json`** unless adding a new key that Phase 10 will need. These files are already complete for defined namespaces.
- **Do NOT translate admin/staff-only UI.** intake form labels, board columns, admin pages are out of scope for Phase 2.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Language detection | Custom locale resolver | `client.language` field on DB record | Already implemented in GHL messaging; all clients store 'fr' or 'en' |
| Phone number config | Hardcoded phone strings | `NEXT_PUBLIC_SHOP_PHONE` env var | Already established in portal page pattern |
| i18n framework | Custom translation system | next-intl (Phase 10 concern) | Installed but wired-up is Phase 10's job |

---

## Common Pitfalls

### Pitfall 1: Translating Staff-Facing Surfaces
**What goes wrong:** Developer sees English string, translates it, but the string is on an admin/staff page that customers never see.
**Why it happens:** Intake form, board pages, and admin pages contain English but are staff-only.
**How to avoid:** Before translating any string, confirm the page/component is accessible to customers (portal, track, status, booking, or the order-summary receipt shown immediately after order creation).
**Warning signs:** If the file path contains `/board/`, `/admin/`, `/dashboard/`, `/calendar/`, `/clients/` — it is staff-only.

### Pitfall 2: Breaking the GHL Bilingual System
**What goes wrong:** Changing message template strings to French-only removes the English fallback for non-Quebec clients.
**Why it happens:** Misunderstanding that Quebec-only means French-only everywhere.
**How to avoid:** Leave `src/lib/ghl/messaging.ts` MESSAGE_TEMPLATES untouched. The `fr`/`en` variants are correct.

### Pitfall 3: Introducing useTranslations() Prematurely
**What goes wrong:** Phase 2 work adds `useTranslations()` calls, which requires NextIntlClientProvider to be wired into every page. This is Phase 10 scope and creates a dependency conflict.
**Why it happens:** Developers default to "best practice" i18n instead of the project convention.
**How to avoid:** Use hardcoded French strings. Check STATE.md decisions — the convention is explicit.

### Pitfall 4: Wrong Phone Number on Track Page
**What goes wrong:** The track page has `href='tel:+15148551234'` with hardcoded `(514) 855-1234` — this is a different number than the portal page's fallback `514-667-0082`.
**Why it happens:** Two different hardcoded values were used in two different files.
**How to avoid:** Replace both with `NEXT_PUBLIC_SHOP_PHONE` env var. The env var value in production takes precedence; the fallback in code is just a safety net. Confirm with Audrey/client which number is correct.

---

## Code Examples

### Order Summary — French Replacement Pattern

The `order-summary.tsx` file is currently entirely in English. It shows post-order-creation confirmation to the seamstress (and arguably to the client if they are watching). Replace all strings:

```tsx
// BEFORE
<h2 className='text-xl font-bold text-green-800 mb-2'>
  Order Created Successfully!
</h2>
<p className='text-sm text-green-600'>
  Order #{order.orderNumber} has been created successfully
</p>

// AFTER
<h2 className='text-xl font-bold text-green-800 mb-2'>
  Commande créée avec succès !
</h2>
<p className='text-sm text-green-600'>
  La commande #{order.orderNumber} a été créée avec succès
</p>
```

### Track Page — Phone Number and Contact Section

```tsx
// BEFORE (src/app/(protected)/track/[id]/page.tsx, line ~208)
<p className='text-sm text-muted-foreground'>
  Des questions? Contactez-nous au{' '}
  <a href='tel:+15148551234' className='text-primary-600 font-medium hover:underline'>
    (514) 855-1234
  </a>
</p>

// AFTER
const SHOP_PHONE = process.env.NEXT_PUBLIC_SHOP_PHONE || '514-667-0082';
// ...
<p className='text-sm text-muted-foreground'>
  Des questions? Contactez-nous au{' '}
  <a href={`tel:${SHOP_PHONE.replace(/-/g, '')}`} className='text-primary-600 font-medium hover:underline'>
    {SHOP_PHONE}
  </a>
</p>
```

### Order Summary — Full String Map

| English | French |
|---------|--------|
| "No order data available" | "Aucune donnée de commande disponible" |
| "Order Created Successfully!" | "Commande créée avec succès !" |
| "Order #{n} has been created successfully" | "La commande #{n} a été créée avec succès" |
| "Order Details" (CardTitle) | "Détails de la commande" |
| "Order #{n} - {date}" (CardDescription) | "Commande #{n} - {date}" |
| "Order Information" | "Informations de la commande" |
| "Order Number:" | "Numéro de commande :" |
| "Order ID:" | "Identifiant :" |
| "Status:" | "Statut :" |
| "Pending" (status badge) | "En attente" |
| "Pricing Summary" | "Résumé des prix" |
| "Subtotal:" | "Sous-total :" |
| "Rush Fee:" | "Frais express :" |
| "Tax:" | "Taxe :" |
| "TPS: Canada tax" | "TPS (taxe fédérale)" |
| "TVQ: Québec tax" | "TVQ (taxe provinciale)" |
| "Total:" | "Total :" |
| "Order QR Code" (CardTitle) | "Code QR de la commande" |
| "Use this QR code to track the order" | "Utilisez ce code QR pour suivre la commande" |
| "Print Labels" (button) | "Imprimer les étiquettes" |
| "New Order" (button) | "Nouvelle commande" |
| "What's Next?" (CardTitle) | "Prochaines étapes" |
| "Print Labels" (step 1 h4) | "Imprimer les étiquettes" |
| "Print labels for each garment..." | "Imprimez les étiquettes pour chaque vêtement afin de les suivre tout au long du processus" |
| "Start Work" (step 2 h4) | "Commencer le travail" |
| "Begin working on the garments..." | "Commencez à travailler sur les vêtements selon les services sélectionnés" |
| "Update Status" (step 3 h4) | "Mettre à jour le statut" |
| "Update the order status as work progresses" | "Mettez à jour le statut de la commande au fur et à mesure de l'avancement" |
| "Order #{n}" (QR code caption) | "Commande #{n}" |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-intl useTranslations() (commented out) | Hardcoded French strings | Phase 19 decision (STATE.md) | Simpler, no provider wiring needed for Phase 2 |
| Two separate hardcoded phone numbers | Single NEXT_PUBLIC_SHOP_PHONE env var | Phase 25-01 established for portal | Needs to be applied to track page in this phase |
| English SMS templates | Bilingual fr/en templates in GHL messaging.ts | Already implemented pre-M2 | No change needed |

**Deprecated/outdated:**
- Hardcoded `(514) 855-1234` in track page: replaced by env var pattern

---

## Open Questions

1. **Which phone number is correct?**
   - What we know: portal page uses `514-667-0082` as fallback; track page hardcodes `(514) 855-1234`
   - What's unclear: which is the real shop number; the env var `NEXT_PUBLIC_SHOP_PHONE` in Vercel config is the source of truth
   - Recommendation: Planner should note to use `NEXT_PUBLIC_SHOP_PHONE` with the `514-667-0082` fallback (matching portal page), and flag this to the client to confirm the env var is set correctly in Vercel

2. **Is `order-summary.tsx` truly customer-facing?**
   - What we know: It is the post-submission screen shown after order creation in the intake flow; the intake flow is staff-operated (seamstresses use iPads at the counter)
   - What's unclear: Does the client (customer) see this screen, or only the seamstress?
   - Recommendation: Translate it anyway. It renders order details like status "Pending" and pricing — if a customer is present at the counter during intake, they would see this screen. Low cost, high confidence it is correct.

3. **Are there other English strings in files not yet audited?**
   - What we know: The primary suspect files have been audited above
   - What's unclear: There may be minor English strings in components like `garments-step.tsx`, `assignment-step.tsx`, or `order-card.tsx` — these are all staff-facing intake/board components
   - Recommendation: Planner should instruct an audit grep for English strings scoped only to customer-facing file paths: `portal/`, `track/`, `status/`, `booking/`, `order-summary.tsx`

---

## Validation Architecture

> nyquist_validation config not found — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in project (no jest.config.*, no vitest.config.*, no pytest.ini) |
| Config file | None |
| Quick run command | `npx tsc --noEmit` (TypeScript compile check) |
| Full suite command | `npx tsc --noEmit && npx next build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BUG-3 | Customer-facing text displays in French | manual-only | N/A — visual inspection required | N/A |
| BUG-3 | TypeScript compiles after string changes | smoke | `npx tsc --noEmit` | N/A (compiler always available) |

**Note:** This phase is pure string replacement with no logic changes. Automated testing beyond TypeScript compilation is not applicable. Acceptance is verified by visual inspection of the affected pages.

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit`
- **Per wave merge:** `npx tsc --noEmit && npx next build`
- **Phase gate:** TypeScript clean + visual review of portal, track, status, booking, and order-summary pages

### Wave 0 Gaps
None — existing infrastructure (TypeScript compiler) covers all automated checks for this phase.

---

## Sources

### Primary (HIGH confidence)
- Direct file read: `src/components/intake/order-summary.tsx` — confirmed all English strings, lines 31-268
- Direct file read: `src/app/(protected)/track/[id]/page.tsx` — confirmed French status labels, hardcoded phone at line 209
- Direct file read: `src/app/(public)/portal/page.tsx` — confirmed fully French, SHOP_PHONE env var pattern
- Direct file read: `src/app/(protected)/status/page.tsx` — confirmed fully French
- Direct file read: `src/app/(protected)/booking/page.tsx` — confirmed bilingual with fr default
- Direct file read: `src/components/board/sms-confirmation-modal.tsx` — confirmed fully French
- Direct file read: `src/lib/ghl/messaging.ts` — confirmed bilingual fr/en templates, language selection logic
- Direct file read: `src/lib/ghl/invoices.ts` — confirmed French invoice names/descriptions
- Direct file read: `locales/fr.json`, `locales/en.json` — confirmed structural completeness
- Direct file read: `.planning/STATE.md` — hardcoded French convention decisions (Phase 19, 22-01, 24-02)

### Secondary (MEDIUM confidence)
- `package.json`: next-intl ^3.0.0 confirmed installed
- `src/app/layout.tsx`: NextIntlClientProvider confirmed wired (grep verified)
- `src/components/intake/pricing-step.tsx`: useTranslations commented out (confirmed pattern)

---

## Metadata

**Confidence breakdown:**
- Audit completeness: HIGH — all customer-facing file paths read directly
- String translations: HIGH — translations are straightforward; project French already used in 90%+ of customer UI
- Architecture: HIGH — hardcoded French convention is documented in STATE.md with explicit decisions
- Phone number question: MEDIUM — two conflicting hardcoded values; env var is source of truth but Vercel config not readable

**Research date:** 2026-03-18
**Valid until:** 2026-06-18 (stable — no external API dependencies, pure string replacement)

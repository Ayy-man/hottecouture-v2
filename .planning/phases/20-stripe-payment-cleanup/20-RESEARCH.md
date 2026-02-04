# Phase 20: Stripe Payment Link Cleanup - Research

**Researched:** 2026-02-04
**Domain:** Payment processing / GoHighLevel invoice branding
**Confidence:** HIGH

## Summary

This phase addresses client complaints about unprofessional-looking payment pages with "weird text/parameters in URLs." After investigating the codebase, this is **NOT a Stripe integration issue** - the application uses **GoHighLevel (GHL) invoicing** with Stripe as the payment processor behind GHL. The "ugly" URLs and missing branding are controlled entirely through **GHL Dashboard settings**, not code.

The client complained about:
1. Missing logo on payment page
2. Wrong phone number displayed (personal cell instead of shop number)
3. Ugly URL parameters visible to customers

**Root cause:** GHL Business Profile and Invoice Layout settings are incomplete or incorrect.

**Primary recommendation:** This is a 95% Dashboard configuration task, 5% verification. Update GHL Business Profile settings (logo, business name, phone) and Invoice Layout customization. No code changes required unless fallback URL construction is adding extra parameters.

## Standard Stack

### Current Payment Architecture

| Component | Technology | Purpose | Notes |
|-----------|-----------|---------|-------|
| Payment Processor | Stripe | Card processing | Connected to GHL, not directly integrated |
| Invoice System | GoHighLevel (GHL) | Invoice creation & payment links | Primary integration point |
| API Integration | `@/lib/ghl/invoices.ts` | Creates Text2Pay invoices | Uses GHL API v2021-07-28 |
| Payment Flow | Text2Pay | Creates + sends invoice in one step | SMS/Email delivery with payment link |

### Key Files

| File | Purpose | Impact on Phase |
|------|---------|----------------|
| `/src/lib/ghl/invoices.ts` | GHL invoice creation (Text2Pay) | Contains invoice URL logic |
| `/src/app/api/payments/create-checkout/route.ts` | Payment link generation endpoint | Constructs fallback URLs |
| `/src/lib/ghl/client.ts` | GHL API client with auth | No changes needed |

### Dependencies

```json
{
  "stripe": "^20.0.0"  // Connected via GHL, not directly used for checkout
}
```

**Note:** Despite having Stripe SDK installed, the app uses GHL's invoice system which internally uses Stripe for card processing. Direct Stripe Checkout is NOT used.

## Architecture Patterns

### Current Payment Flow

```
1. Client creates order
2. App calls `/api/payments/create-checkout`
3. Backend calls GHL `createText2PayInvoice()`
4. GHL API returns invoice with `invoiceUrl`
5. URL sent to customer via SMS/Email
6. Customer clicks → GHL-hosted payment page
7. Customer pays → Stripe processes (behind GHL)
8. GHL webhook → updates order status
```

### URL Construction Pattern

From `/src/app/api/payments/create-checkout/route.ts`:

```typescript
// Primary: GHL returns invoiceUrl from API
let invoiceUrl = invoice.invoiceUrl ||
                 (invoice as any).paymentLink ||
                 (invoice as any).checkoutUrl;

// Fallback: Manual construction if API doesn't return URL
if (!invoiceUrl) {
  if (invoice._id && invoice._id !== 'unknown') {
    invoiceUrl = `https://api.automatosolution.com/invoice/${invoice._id}`;
  } else {
    // Last resort: link to GHL invoices page
    invoiceUrl = `https://app.gohighlevel.com/v2/location/${locationId}/payments/invoices`;
  }
}
```

**Pattern Analysis:**
- GHL API **should** return `invoiceUrl` directly
- Fallback construction uses custom domain `api.automatosolution.com`
- If invoice creation fails, falls back to GHL dashboard URL

### Invoice URL Structure

**Expected from GHL:** Clean invoice URLs without query parameters
- Format: `https://[custom-domain]/invoice/[invoice_id]`
- No visible query strings to customers
- GHL handles session/tracking internally

**Problem:** If GHL doesn't return `invoiceUrl`, the fallback logic constructs generic URLs that may include unnecessary parameters or redirect to dashboard.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment page branding | Custom Stripe Checkout | GHL Business Profile + Invoice Layout | Already configured in GHL, centralizes branding |
| URL shortening/cleaning | Custom URL shortener | GHL's native invoiceUrl | GHL provides clean URLs, no need to parse/modify |
| Payment link generation | Direct Stripe API | GHL Text2Pay API | Maintains single source of truth, leverages existing integration |
| Phone number formatting | Custom validation | GHL E.164 formatter in `client.ts` | Already implemented: `formatPhoneE164()` |

**Key insight:** GHL is the payment system of record. All branding, URLs, and customer-facing elements are controlled by GHL Dashboard settings, not application code.

## Common Pitfalls

### Pitfall 1: Assuming Code Changes Fix Branding

**What goes wrong:** Developer modifies `createText2PayInvoice()` to add logo/phone parameters, but GHL API ignores them because branding is Dashboard-configured.

**Why it happens:** The API request includes `businessDetails.name` and `businessDetails.phoneNo`, but these are **overridden by Location settings**.

**How to avoid:**
1. Always check GHL Dashboard → Settings → Business Profile first
2. Invoice Layout settings take precedence over API parameters
3. Code should pass correct data, but Dashboard controls display

**Warning signs:** API logs show correct phone/logo being sent, but payment page shows different info.

### Pitfall 2: Modifying Invoice URLs

**What goes wrong:** Developer adds tracking parameters to `invoiceUrl` (e.g., `?source=sms&campaign=ready`), breaking GHL's payment flow.

**Why it happens:** GHL invoice URLs are session-based and shouldn't be modified.

**How to avoid:**
- Use `invoiceUrl` exactly as returned by GHL API
- Don't append query parameters
- Don't URL-encode or transform the URL
- Track campaign data in GHL contact tags instead

**Warning signs:** Payment page shows "Invalid session" or "Invoice not found" errors.

### Pitfall 3: Not Verifying Fallback URLs

**What goes wrong:** Fallback URL construction (when GHL doesn't return `invoiceUrl`) creates generic dashboard links instead of payment-specific URLs.

**Why it happens:** The last-resort fallback is:
```typescript
invoiceUrl = `https://app.gohighlevel.com/v2/location/${locationId}/payments/invoices`;
```
This links to the **invoices dashboard**, not a specific invoice.

**How to avoid:**
1. Log when fallback URLs are used (indicates API issue)
2. Verify Text2Pay returns `invoiceUrl` consistently
3. Test with real phone numbers (SMS delivery)
4. Consider failing loudly instead of using broken fallback

**Warning signs:** Customer receives link to GHL dashboard requiring login instead of payment page.

### Pitfall 4: Wrong Phone Number Source

**What goes wrong:** Payment page shows developer's personal number instead of shop phone.

**Why it happens:** Three possible sources for phone number:
1. GHL Location Business Profile (`GHL_LOCATION_ID` settings)
2. API request `businessDetails.phoneNo` (overridden by Location)
3. Contact's phone (appears in "Bill to" section, not business info)

**How to avoid:**
- Update phone in GHL Dashboard → Settings → Business Profile
- Don't rely on API `businessDetails.phoneNo` for display
- Verify in GHL invoice preview before sending to customers

**Warning signs:** API logs show correct shop phone, but invoice shows different number.

## Code Examples

### Current Text2Pay Invoice Creation

```typescript
// From /src/app/api/payments/create-checkout/route.ts (lines 273-283)
const invoiceResult = await createText2PayInvoice({
  contactId: ghlContactId,
  contactName: clientName,
  contactEmail: client.email || undefined,
  contactPhone: client.phone || undefined,
  name: invoiceName,  // e.g., "Dépôt - Commande #1234"
  items,
  dueDate,
  orderNumber,
  invoiceNumber,  // e.g., "HC-1234-DEPOSIT"
});
```

### Text2Pay API Request Structure

```typescript
// From /src/lib/ghl/invoices.ts (lines 556-577)
const requestBody = {
  altId: locationId,
  altType: 'location',
  action: 'send', // Creates + sends in one step
  userId: '36ZzURYSrDYgjnNgRo94',
  name: String(params.name),
  contactDetails: {
    id: String(params.contactId),
    name?: string,
    email?: string,
    phoneNo?: string  // E.164 format: +15149876543
  },
  businessDetails: {
    name: 'Hotte Couture',
    // phoneNo would be overridden by Location settings anyway
  },
  currency: 'CAD',
  items: invoiceItems,
  issueDate: today,
  dueDate: dueDateStr,
  sentTo: {
    email: [...],
    phoneNo: [...]
  },
  liveMode: true,
  invoiceNumber: params.invoiceNumber
};
```

**Key observations:**
- `businessDetails.name` is hardcoded to "Hotte Couture"
- Phone number is NOT included in `businessDetails` (relies on Location settings)
- `userId` is hardcoded (GHL user for sending invoices)

### Correct URL Extraction

```typescript
// From /src/app/api/payments/create-checkout/route.ts (lines 316-330)
// Get invoice URL - Text2Pay may use different field names
let invoiceUrl = invoice.invoiceUrl ||
                 (invoice as any).paymentLink ||
                 (invoice as any).checkoutUrl ||
                 (invoice as any).url;

// Fallback URL construction if needed
if (!invoiceUrl) {
  if (invoice._id && invoice._id !== 'unknown') {
    invoiceUrl = `https://api.automatosolution.com/invoice/${invoice._id}`;
  } else {
    const locationId = process.env.GHL_LOCATION_ID;
    invoiceUrl = `https://app.gohighlevel.com/v2/location/${locationId}/payments/invoices`;
  }
}
```

**Improvement opportunity:** Log when fallback is used to detect API issues.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct Stripe Checkout | GHL Text2Pay invoices | Dec 2025 | Centralized payment flow, SMS delivery |
| n8n webhook middleware | Direct GHL API calls | Dec 2025 | Eliminated external dependency |
| Manual invoice tracking | GHL invoice system | Dec 2025 | Automatic payment reconciliation |

**Current (Feb 2026):**
- GHL Text2Pay creates + sends invoice in one API call
- Invoice URLs should be returned by GHL API
- Branding controlled via GHL Dashboard (Business Profile + Invoice Layout)
- Stripe processes payments behind GHL's interface

**Deprecated/outdated:**
- `src/lib/integrations/stripe.ts` - Contains old `createPaymentLink()` using Stripe Checkout (lines 43-89) - **NOT USED** in current flow
- Direct Stripe Checkout Sessions - replaced by GHL invoices

## Dashboard Configuration Required

### GHL Business Profile Settings

**Location:** Settings → Business Profile → General Information

**Fields to verify/update:**

1. **Business Logo**
   - Upload shop logo (JPG/PNG, < 512KB, min 128x128px)
   - Appears on all invoices and payment pages

2. **Friendly Business Name**
   - Should be: "Hotte Couture" or "Hotte Design & Couture"
   - Appears in invoice headers and emails

3. **Business Phone**
   - Shop phone: _(client to provide)_
   - **NOT** personal cell number
   - Format: Will be normalized by GHL

4. **Business Address** (optional)
   - Shop address for invoice footer

### GHL Invoice Layout Customization

**Location:** Payments → Invoices & Estimates → Settings → Title, Terms and Layout → Customize Layout

**Settings to configure:**

1. **Business Information Section**
   - ✅ Show company name
   - ✅ Show phone number
   - ✅ Show address (if desired)
   - ❌ Hide any fields showing personal info

2. **Pay Button Branding**
   - Button color: Match shop brand
   - Button text: "Payer" (French) or "Pay" (English)

3. **Custom Values** (optional)
   - Add website URL
   - Add business registration number

**Verification:** Preview invoice in GHL to confirm all branding appears correctly before sending to customers.

## Verification Protocol

### Pre-Implementation Checklist

- [ ] Access GHL Dashboard (credentials needed)
- [ ] Verify Business Profile shows correct logo
- [ ] Verify Business Profile shows shop phone (not personal)
- [ ] Verify Business Profile shows correct business name
- [ ] Customize Invoice Layout to show/hide desired fields
- [ ] Preview invoice in GHL to confirm branding

### Code Verification Checklist

- [ ] Check if `invoiceUrl` is consistently returned by Text2Pay API
- [ ] Add logging when fallback URL construction is used
- [ ] Verify fallback URL domain (`api.automatosolution.com`) is correct
- [ ] Test that invoice URLs don't have ugly query parameters
- [ ] Remove or update old Stripe Checkout code in `stripe.ts` if unused

### Customer-Facing Verification

- [ ] Create test invoice via app
- [ ] Verify SMS/Email contains clean URL
- [ ] Open payment page in browser
- [ ] Confirm logo displays correctly
- [ ] Confirm shop phone number displays (not personal)
- [ ] Confirm business name is correct
- [ ] Complete test payment (Stripe test mode)
- [ ] Verify payment confirmation shows proper branding

## Open Questions

1. **What is the shop phone number?**
   - What we know: Currently showing wrong number (personal cell)
   - What's unclear: Correct shop phone to configure in GHL
   - Recommendation: Get from client, update in GHL Business Profile

2. **Is custom domain `api.automatosolution.com` correct?**
   - What we know: Used in fallback URL construction
   - What's unclear: Whether this domain is controlled by client or GHL
   - Recommendation: Verify domain ownership, ensure it's properly configured for invoice URLs

3. **Should old Stripe Checkout code be removed?**
   - What we know: `stripe.ts` contains `createPaymentLink()` function (lines 43-89)
   - What's unclear: If it's used anywhere or kept for future fallback
   - Recommendation: Search codebase for usages, remove if unused to reduce confusion

4. **What causes "weird text" in URLs?**
   - What we know: Client complained about "textes bizarres" in URL
   - What's unclear: Are these query parameters, encoded characters, or something else?
   - Recommendation: Get screenshot/example from client, test Text2Pay URLs to reproduce issue

5. **Does GHL return invoiceUrl consistently?**
   - What we know: Code has elaborate fallback logic for missing URLs
   - What's unclear: How often fallbacks are used in production
   - Recommendation: Add logging/monitoring to track fallback usage frequency

## Implementation Strategy

### Phase 1: Dashboard Configuration (Primary - 90% of solution)

**Owner:** Client or admin with GHL access
**Estimated time:** 15-30 minutes

1. Access GHL Dashboard
2. Navigate to Settings → Business Profile
3. Update:
   - Logo: Upload shop logo
   - Business name: Verify "Hotte Couture"
   - Phone: Change to shop phone number
   - Address: Add if desired
4. Navigate to Payments → Invoices → Settings → Customize Layout
5. Configure branding colors, visible fields
6. Preview invoice to confirm all changes

**Success criteria:** Invoice preview shows correct logo, phone, and branding.

### Phase 2: Code Verification (Secondary - 10% of solution)

**Owner:** Developer
**Estimated time:** 30-60 minutes

1. Add logging when fallback URL is used
2. Verify Text2Pay returns `invoiceUrl` consistently
3. Test invoice creation → URL format
4. Confirm no extra parameters in URLs
5. Document any discrepancies

**Code changes needed:** Minimal logging additions only.

### Phase 3: Customer Testing

**Owner:** Client
**Estimated time:** 15 minutes

1. Create real order in staging/production
2. Trigger payment request
3. Verify SMS/Email contains clean URL
4. Open payment page
5. Confirm all branding elements correct
6. Complete test payment

**Success criteria:** Payment page looks professional with shop logo, phone, and clean URL.

## Sources

### Primary (HIGH confidence)

- **Codebase files:**
  - `/Users/aymanbaig/Desktop/hottecouture-main/src/lib/ghl/invoices.ts` - Text2Pay implementation
  - `/Users/aymanbaig/Desktop/hottecouture-main/src/app/api/payments/create-checkout/route.ts` - Payment link generation
  - `/Users/aymanbaig/Desktop/hottecouture-main/docs/plans/2025-12-17-ghl-direct-integration.md` - Architecture documentation

- **GHL Official Documentation:**
  - [Customizing Invoice Layouts](https://help.gohighlevel.com/support/solutions/articles/155000006789-customizing-invoice-layouts) - Invoice branding settings
  - [Business Profile Settings](https://help.gohighlevel.com/support/solutions/articles/48000982605-business-profile) - Logo, phone, name configuration

### Secondary (MEDIUM confidence)

- **Stripe Documentation:**
  - [Stripe Checkout Customization](https://docs.stripe.com/payments/checkout/customization) - General checkout branding
  - [Stripe Branding Settings](https://docs.stripe.com/get-started/account/branding) - Account-level branding
  - Note: Less relevant since app uses GHL, not direct Stripe Checkout

### Tertiary (LOW confidence - informational only)

- Web search results about Stripe/GHL payment page customization
- Community discussions about invoice URL formats
- General best practices for payment page UX

## Metadata

**Confidence breakdown:**
- Payment architecture (GHL not Stripe): **HIGH** - Verified in codebase
- Dashboard settings control branding: **HIGH** - Confirmed by GHL official docs
- URL construction logic: **HIGH** - Found in source code
- What "ugly URLs" refers to: **MEDIUM** - Need client example/screenshot
- Custom domain ownership: **MEDIUM** - Domain exists in code but not verified

**Research date:** 2026-02-04
**Valid until:** 60 days (GHL API stable, Dashboard UI may change)

**Key recommendation:** This is primarily a **Dashboard configuration task**, not a code change. Client should update GHL Business Profile and Invoice Layout settings to fix logo, phone number, and ensure clean URLs are generated by Text2Pay API.

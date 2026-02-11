# Phase 26: Staff Management & Infrastructure - Research

**Researched:** 2026-02-12
**Domain:** Self-service staff management, SMS A2P registration, Stripe integration, domain setup, PWA configuration, chatbot removal
**Confidence:** HIGH

## Summary

Phase 26 addresses 6 infrastructure and configuration items from the Feb 11 Amin/Ayman call. This is a **mixed implementation/configuration phase**: 1 item requires code (staff API routes), 4 items are external service configuration (SMS A2P, Stripe, domain, PWA), and 1 item is verification only (chatbot already hidden).

The existing codebase already has a fully-built staff management UI (`team-management-modal.tsx`) with complete CRUD functionality, but it's calling **wrong API endpoints** (`/api/staff` instead of `/api/admin/team`). The team API routes at `/api/admin/team` already exist and are complete with POST/GET/PATCH/DELETE methods.

**Critical Finding:** Staff management is 95% done - just needs API route aliasing or component update to connect the UI to the existing backend.

**Primary recommendation:** (1) Fix staff API endpoint mismatch by creating `/api/staff` routes that wrap existing `/api/admin/team` logic, (2) Follow official provider setup guides for SMS A2P, Stripe, domain, and PWA configuration, (3) Verify chatbot remains hidden and get client confirmation.

## Item Breakdown

### Item 1: Staff Self-Management (CODE + UI - 95% Complete)

**Current State:**
- ✅ Full UI exists: `team-management-modal.tsx` with add/edit/archive/delete
- ✅ Backend API exists: `/api/admin/team/route.ts` (GET, POST) and `/api/admin/team/[id]/route.ts` (PATCH, DELETE)
- ❌ **Mismatch:** UI calls `/api/staff/*` but backend is at `/api/admin/team/*`

**What's Needed:**
- Create `/api/staff/route.ts` (GET, POST) that wraps `/api/admin/team`
- Create `/api/staff/[id]/route.ts` (PATCH, DELETE) that wraps `/api/admin/team/[id]`
- OR: Update component to call correct endpoints (simpler but breaks naming convention)

**API Functionality Already Built:**
- POST: Create staff with validation (name required, duplicate check, optional email/phone/role/color/capacity)
- GET: List all staff (active and inactive)
- PATCH: Update staff fields or toggle is_active status
- DELETE: Hard delete with assignment safety check (prevents deletion if staff has assigned tasks)

**UI Functionality Already Built:**
- Add new staff member form (name, role, email, phone, color, capacity)
- Edit existing staff inline
- Archive/reactivate toggle
- Hard delete (only for inactive staff)
- Show active/archived filter toggle

**What Client Can Do After Fix:**
Admin can open team management modal and add/remove/edit staff members without developer help.

### Item 2: SMS A2P Phone Number (EXTERNAL CONFIGURATION)

**Current State:**
- App uses N8N workflows for SMS sending (external to Next.js app)
- SMS mentioned in multiple places but no direct Twilio/phone number configuration in codebase
- No A2P registration evident in environment variables or config files

**What's Needed:**
- Register with Twilio for A2P 10DLC compliance
- Submit business information to TCR (The Campaign Registry)
- Register brand and campaign (10-15 day approval time)
- Update N8N workflows or SMS integration to use registered A2P number
- Test SMS sending from new number

**A2P Registration Requirements:**
- Business EIN or Sole Proprietor details
- Business name, address, website
- Campaign use case description
- Expected message volume
- Sample message templates

**Timeline:**
- Brand registration: Minutes to hours
- Campaign approval: 10-15 business days
- Configuration update: Hours

### Item 3: Stripe Not Connected (EXTERNAL CONFIGURATION)

**Current State:**
- Stripe SDK installed (`"stripe": "^20.0.0"`)
- App uses **GoHighLevel (GHL) invoicing** system (Phase 20 research confirms this)
- Stripe is payment processor **behind GHL**, not directly integrated
- GHL creates invoices, Stripe processes payments

**What's Needed:**
- Verify GHL account has Stripe connected in GHL dashboard
- If disconnected: Connect Stripe account to GHL (Settings > Payments > Stripe)
- Test payment flow: create invoice → customer pays → verify webhook updates order
- Ensure GHL Business Profile has correct branding (logo, phone, business name)

**NOT Needed:**
- Direct Stripe Checkout integration (app uses GHL Text2Pay invoices)
- Stripe API key changes (handled by GHL)
- Code changes (payment flow is GHL → Stripe)

**Timeline:**
- GHL-Stripe connection: Minutes
- Testing: Hours

### Item 4: Domain Connection (EXTERNAL CONFIGURATION - Vercel)

**Current State:**
- Deployed on Vercel (vercel.json exists with cron configs)
- Default URL: `[project-name].vercel.app`
- No custom domain detected in codebase

**What's Needed:**
- Purchase custom domain (if not already owned)
- Add domain in Vercel dashboard: Project Settings > Domains
- Configure DNS based on Vercel's instructions:
  - **Apex domain (example.com):** A record pointing to Vercel IP
  - **Subdomain (www.example.com):** CNAME to `cname.vercel-dns.com`
  - **Recommended:** Use Vercel nameservers for simplest setup
- Wait for DNS propagation (minutes to 48 hours)
- SSL certificate auto-issues after domain verification

**DNS Configuration Options:**
1. **Nameservers (recommended):** Point domain to `ns1.vercel-dns.com` and `ns2.vercel-dns.com`
2. **A Record:** For apex domain, point to Vercel's IP address
3. **CNAME:** For subdomains, point to `cname.vercel-dns.com`

**Timeline:**
- Vercel setup: Minutes
- DNS propagation: 5 minutes to 48 hours (typically <1 hour)

### Item 5: PWA Setup (CODE + CONFIGURATION)

**Current State:**
- No PWA manifest detected in public folder
- No service worker configuration
- Next.js 14 app without PWA setup
- No `next-pwa` package in dependencies

**What's Needed:**
- Create `public/manifest.json` with app metadata (name, icons, theme colors, start URL)
- Generate PWA icons: 192x192, 512x512, maskable icons
- Add manifest reference to `src/app/layout.tsx` metadata
- Configure Next.js for PWA (optional: use `@ducanh2912/next-pwa` or native approach)
- Test installation on iOS and Android

**Manifest Structure Required:**
```json
{
  "name": "Hotte Couture",
  "short_name": "Hotte",
  "description": "Professional tailoring and custom design services",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**Layout.tsx Metadata Update:**
```typescript
export const metadata: Metadata = {
  // ... existing metadata
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hotte Couture"
  }
};
```

**iOS Specific:**
- Add apple-touch-icon to metadata
- Configure viewport (already exists in layout)
- Test "Add to Home Screen" on iOS Safari

**Timeline:**
- Implementation: 1-2 hours
- Icon generation: 30 minutes
- Testing: 1 hour

### Item 6: Chatbot Removed (VERIFICATION ONLY - Already Done)

**Current State:**
- Chatbot component exists: `GlobalChatWrapper` from `@/components/chat/global-chat-wrapper`
- **Already hidden:** Phase 22 wrapped it in `<div className='hidden print:hidden'>` (line 131-133 in layout.tsx)
- Component rendered but not visible to users

**What's Needed:**
- Confirm with client they want it to stay removed
- If confirmed removed: Delete `GlobalChatWrapper` import and div from layout
- If client wants it back: Remove `hidden` class

**Verification:**
```typescript
// Current state in layout.tsx (lines 131-133):
<div className='hidden print:hidden'>
  <GlobalChatWrapper />
</div>
```

**Decision Required:**
Client must confirm: "Should chatbot stay removed or be restored?"

**Timeline:**
- Verification with client: Minutes
- Code deletion (if confirmed): Minutes

## Standard Stack

### Core Technologies (Already in Project)

| Technology | Version | Purpose | Notes |
|------------|---------|---------|-------|
| Next.js | 14.2.35 | App framework | App Router, SSR |
| Supabase | 2.39.0 | Database + Auth | Staff CRUD already implemented |
| Vercel | N/A | Hosting | vercel.json configured with crons |
| GoHighLevel | API v2021-07-28 | SMS + Invoicing | External, not in package.json |

### New Dependencies Needed

| Library | Version | Purpose | When to Install |
|---------|---------|---------|-----------------|
| @ducanh2912/next-pwa | ^10.x | PWA support (optional) | If using package approach |

**Note:** PWA can be implemented without external packages using native Next.js 14 features (manifest + metadata). Package is optional convenience wrapper.

### External Services (Configuration Only)

| Service | Purpose | Configuration Location |
|---------|---------|------------------------|
| Twilio | A2P 10DLC SMS | Twilio Console + N8N workflow config |
| Stripe | Payment processing | GHL Dashboard > Payments |
| Domain Registrar | DNS settings | Registrar dashboard (Namecheap/Cloudflare/etc) |
| Vercel | Domain connection | Vercel Project Settings > Domains |

## Architecture Patterns

### Pattern 1: Staff API Route Aliasing

**Problem:** UI calls `/api/staff/*` but backend is at `/api/admin/team/*`

**Solution 1 (Recommended):** Create wrapper routes that maintain both endpoints

```typescript
// src/app/api/staff/route.ts
import { GET, POST } from '@/app/api/admin/team/route';
export { GET, POST };

// src/app/api/staff/[id]/route.ts
import { PATCH, DELETE } from '@/app/api/admin/team/[id]/route';
export { PATCH, DELETE };
```

**Why:** Maintains backwards compatibility, doesn't require UI changes, follows REST naming conventions (`/api/staff` is more intuitive than `/api/admin/team`)

**Solution 2 (Alternative):** Update component to call `/api/admin/team`

**Why Not:** Breaks naming convention (staff management should be at `/api/staff`), requires UI changes

### Pattern 2: PWA Manifest Configuration

**Recommended Structure:**
```
public/
├── manifest.json           # PWA manifest
├── icon-192.png           # Standard icon
├── icon-512.png           # Large icon
├── icon-maskable.png      # Adaptive icon for Android
├── apple-touch-icon.png   # iOS home screen icon
└── favicon.ico            # Browser favicon (already exists)
```

**Manifest Best Practices:**
- Use `display: "standalone"` for app-like experience
- Include both standard and maskable icons
- Set `start_url: "/"` to open at root
- Match `theme_color` to brand color (existing: `#6366f1`)
- Include `scope: "/"` to allow all routes

### Pattern 3: Domain Configuration Strategy

**Recommended:** Vercel Nameservers (Simplest)
1. Add domain in Vercel dashboard
2. Point domain nameservers to Vercel: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`
3. Vercel manages all DNS records automatically
4. SSL certificate auto-provisions

**Alternative:** Keep Existing DNS Provider
1. Add domain in Vercel dashboard
2. Get DNS instructions from Vercel
3. Add A/CNAME records at existing provider
4. Verify domain in Vercel
5. SSL certificate auto-provisions

**Why Nameservers:** Fewer steps, Vercel handles DNS management, automatic SSL renewal, faster propagation

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PWA manifest generation | Custom icon resizer, manual manifest | Favicon generator services (favicon.io, realfavicongenerator.net) | Handles all icon sizes, formats, and metadata automatically |
| Service Worker config | Custom SW from scratch | Native Next.js PWA or @ducanh2912/next-pwa | Cache strategies, offline support, updates are complex |
| A2P compliance | Custom SMS provider | Twilio A2P 10DLC | Carrier compliance, deliverability, legal requirements |
| Domain SSL | Self-signed certificates | Vercel auto-SSL | Auto-renewal, trusted CA, zero maintenance |

**Key Insight:** External service configuration (SMS, Stripe, domain) requires no code - only dashboard/console work. Don't try to solve these in the codebase.

## Common Pitfalls

### Pitfall 1: Staff API Endpoint Confusion

**What goes wrong:** Team management modal calls `/api/staff/*` but routes are at `/api/admin/team/*` - results in 404 errors

**Why it happens:** UI was built expecting `/api/staff` naming convention but API was implemented under `/api/admin/team` namespace (probably from Phase 6 team management implementation)

**How to avoid:** Create route aliases so both endpoints work

**Warning signs:** Network errors when trying to add/edit/delete staff in UI

### Pitfall 2: A2P Registration Timeline

**What goes wrong:** Client expects SMS to work immediately but A2P campaign approval takes 10-15 business days

**Why it happens:** Telcos require campaign verification to prevent spam, process is external to Twilio

**How to avoid:** Set expectations up front - brand registration is quick (minutes) but campaign approval is slow (weeks)

**Warning signs:** SMS messages blocked or undelivered to US numbers, carrier filtering, low deliverability

### Pitfall 3: PWA Not Installing on iOS

**What goes wrong:** PWA installs on Android but not iOS, "Add to Home Screen" doesn't work

**Why it happens:** iOS requires specific metadata, icons, and configuration that Android forgives

**How to avoid:**
- Include `apple-touch-icon` in metadata
- Set `appleWebApp.capable: true`
- Use PNG icons (not just SVG)
- Test in actual Safari (not Chrome DevTools)

**Warning signs:** "Add to Home Screen" option missing in Safari share menu

### Pitfall 4: Domain DNS Propagation Confusion

**What goes wrong:** Domain configured but not resolving, client thinks it's broken

**Why it happens:** DNS propagation can take minutes to 48 hours depending on TTL and global caching

**How to avoid:**
- Use low TTL (300s) before migration
- Test with multiple DNS checkers (whatsmydns.net)
- Explain propagation delay to client
- Use Vercel nameservers for fastest propagation

**Warning signs:** Domain works in some locations but not others, intermittent connectivity

### Pitfall 5: Stripe Connection Assumption

**What goes wrong:** Attempting to integrate Stripe API directly when app uses GHL invoicing

**Why it happens:** Stripe SDK in package.json suggests direct integration, but Phase 20 research confirms GHL is the invoice system

**How to avoid:** Verify payment flow first - if GHL invoices are working, Stripe is configured (just verify in GHL dashboard)

**Warning signs:** Trying to add Stripe API keys to .env when not needed

### Pitfall 6: Chatbot Removal Without Client Confirmation

**What goes wrong:** Permanently deleting chatbot code, then client says "Actually we want it back"

**Why it happens:** Assumption that "hidden" means "should be deleted"

**How to avoid:** Verify with client before deleting ANY code - hidden might be temporary

**Warning signs:** Client hasn't explicitly confirmed permanent removal

## Code Examples

### Example 1: Staff API Route Alias (Recommended Approach)

```typescript
// src/app/api/staff/route.ts
// Wrapper that makes /api/staff work with existing /api/admin/team logic

import { GET, POST } from '@/app/api/admin/team/route';

// Re-export the existing GET and POST handlers
export { GET, POST };

// This creates /api/staff endpoint that behaves identically to /api/admin/team
// No code duplication, maintains single source of truth
```

```typescript
// src/app/api/staff/[id]/route.ts
// Wrapper for individual staff member operations

import { PATCH, DELETE } from '@/app/api/admin/team/[id]/route';

// Re-export existing handlers for /api/staff/:id
export { PATCH, DELETE };

// This creates /api/staff/:id endpoint that wraps /api/admin/team/:id
// Staff management UI now works without modification
```

**Why This Works:**
- Next.js App Router allows re-exporting route handlers
- Single source of truth (all logic in `/api/admin/team`)
- Both endpoints work simultaneously
- Zero code duplication
- Maintains backwards compatibility

### Example 2: PWA Manifest Creation

```json
// public/manifest.json
{
  "name": "Hotte Couture",
  "short_name": "Hotte",
  "description": "Professional tailoring and custom design services for all your garment needs",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "categories": ["business", "productivity"],
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

```typescript
// src/app/layout.tsx - Add to existing metadata object
export const metadata: Metadata = {
  // ... existing metadata (title, description, etc.)

  // Add PWA manifest
  manifest: "/manifest.json",

  // iOS specific PWA configuration
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hotte Couture",
  },

  // Icons for various platforms
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png", // 180x180 PNG for iOS
  },

  // ... rest of existing metadata
};
```

**Icon Requirements:**
- `icon-192.png`: 192x192 PNG (Android standard)
- `icon-512.png`: 512x512 PNG (Android large)
- `icon-maskable-512.png`: 512x512 PNG with safe area (Android adaptive)
- `apple-touch-icon.png`: 180x180 PNG (iOS home screen)

**Safe Area for Maskable Icons:**
- Keep important content in center 80% circle
- Outer 10% may be cropped by system
- Use solid background color in outer area

### Example 3: Vercel Domain Configuration (Dashboard Steps)

**Not code - configuration instructions:**

1. **In Vercel Dashboard:**
   - Navigate to Project > Settings > Domains
   - Enter custom domain (e.g., `hottecouture.com`)
   - Click "Add"

2. **Vercel Shows Configuration Method:**
   - **If using Vercel nameservers (recommended):**
     - Copy: `ns1.vercel-dns.com` and `ns2.vercel-dns.com`
     - Go to domain registrar (Namecheap/GoDaddy/etc)
     - Replace nameservers with Vercel's
     - Save changes
     - Wait 5-10 minutes for propagation

   - **If using existing DNS provider:**
     - For apex domain: Add A record to Vercel IP (shown in dashboard)
     - For www: Add CNAME to `cname.vercel-dns.com`
     - For verification: Add TXT record (shown in dashboard)

3. **Verification:**
   - Vercel checks DNS every few minutes
   - Green checkmark appears when verified
   - SSL certificate auto-issues (takes 1-5 minutes)
   - Domain is live

**No code changes needed** - Vercel handles routing automatically

### Example 4: Chatbot Removal (If Client Confirms)

```typescript
// src/app/layout.tsx - Current state (hidden but present)
<div className='hidden print:hidden'>
  <GlobalChatWrapper />
</div>

// After client confirms removal - delete these lines:
// 1. Remove import at top of file:
// import { GlobalChatWrapper } from '@/components/chat/global-chat-wrapper'; // DELETE THIS

// 2. Remove the div and component from JSX:
// <div className='hidden print:hidden'>          // DELETE
//   <GlobalChatWrapper />                         // DELETE
// </div>                                          // DELETE

// Result: Clean removal, no trace of chatbot
```

**Important:** Get written client confirmation before deletion. Easier to remove `hidden` class than restore deleted component.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next-pwa` package | Native Next.js 14 manifest + metadata | Fall 2024 | Official PWA support without dependencies |
| A2P optional for SMS | A2P 10DLC mandatory for US SMS | 2021-2024 rollout | Carriers block unregistered traffic |
| Manual SSL setup | Auto-SSL with domain | Modern hosting | Zero maintenance, auto-renewal |
| Stripe direct integration | Platform invoicing (GHL, Square) | 2020s | Simpler for multi-payment platforms |

**Deprecated/outdated:**
- **@shadowwalker/next-pwa**: Unmaintained, use @ducanh2912/next-pwa or native approach
- **10DLC without A2P registration**: US carriers now block or heavily filter unregistered long codes
- **Direct Stripe integration for invoicing**: GHL provides invoice management + Stripe processing in one

## Open Questions

1. **What domain does client want to use?**
   - What we know: Client wants custom domain, needs to be configured
   - What's unclear: Domain name, registrar, ownership status
   - Recommendation: Ask client for domain name and registrar access before starting

2. **Is Stripe already connected in GHL?**
   - What we know: App uses GHL invoicing, Stripe is payment processor
   - What's unclear: Whether Stripe is already connected in GHL dashboard
   - Recommendation: Check GHL dashboard > Payments > Stripe connection status first

3. **What SMS provider does N8N use?**
   - What we know: SMS is handled by N8N workflows (external to app)
   - What's unclear: Whether it's Twilio, Bandwidth, or other provider
   - Recommendation: Check N8N workflow configuration to identify provider before starting A2P registration

4. **Does client have business EIN for A2P registration?**
   - What we know: A2P requires business information
   - What's unclear: Whether client is sole proprietor or has business EIN
   - Recommendation: Confirm business type (sole prop vs business) to choose correct A2P registration path

5. **Should chatbot be permanently deleted or just kept hidden?**
   - What we know: Chatbot currently hidden via CSS, client mentioned "removed"
   - What's unclear: Whether client wants code deleted or just UI hidden
   - Recommendation: Ask explicitly: "Should we delete the chatbot code completely, or keep it hidden for potential future use?"

6. **What PWA icons already exist?**
   - What we know: Logo files exist in `/public` (logo.jpg, logo-round.jpg, logo-signature.png)
   - What's unclear: Whether these are suitable for PWA icons or need resizing/conversion
   - Recommendation: Check existing logo files, likely need to generate proper PNG icon set (192x192, 512x512) from logo-round.jpg

## Sources

### Primary (HIGH confidence)

- **Next.js 14 PWA Setup:**
  - [Next.js PWA Guide (Official)](https://nextjs.org/docs/app/guides/progressive-web-apps)
  - [How to Build a Next.js PWA in 2025](https://medium.com/@jakobwgnr/how-to-build-a-next-js-pwa-in-2025-f334cd9755df)
  - [Next.js 14 PWA Setup Guide](https://levelup.gitconnected.com/how-to-build-a-pwa-with-next-js-14-and-ducanh2912-next-pwa-c7fcb7a7b0ba)

- **Vercel Domain Configuration:**
  - [Adding & Configuring a Custom Domain (Official)](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
  - [Managing DNS Records (Official)](https://vercel.com/docs/domains/managing-dns-records)
  - [Vercel Custom Domain Setup Guide](https://www.quillcircuit.com/blog/how-to-add-custom-domain-to-vercel-complete-setup-guide)

- **Twilio A2P 10DLC Registration:**
  - [Programmable Messaging and A2P 10DLC (Official)](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc)
  - [A2P 10DLC Registration Quickstart (Official)](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/quickstart)
  - [Direct Standard Registration Guide (Official)](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/direct-standard-onboarding)

- **Stripe Integration:**
  - [Stripe Go-Live Checklist (Official)](https://stripe.com/docs/development/checklist)
  - [Stripe Connect Overview (Official)](https://docs.stripe.com/connect)
  - [Stripe Connect 2026 Updates](https://docs.stripe.com/connect/upcoming-requirements-updates)

### Secondary (MEDIUM confidence)

- **Codebase Analysis:**
  - `src/components/team/team-management-modal.tsx` - Full staff CRUD UI (lines 122, 155, 182, 206 call `/api/staff/*`)
  - `src/app/api/admin/team/route.ts` - GET/POST handlers for staff list and creation
  - `src/app/api/admin/team/[id]/route.ts` - PATCH/DELETE handlers for individual staff operations
  - `src/app/layout.tsx` lines 131-133 - Chatbot wrapped in `hidden` class
  - `.planning/phases/20-stripe-payment-cleanup/20-RESEARCH.md` - Confirms GHL invoicing architecture
  - `.planning/phases/11-cleanup-polish/11-01-PLAN.md` - Staff deletion implementation (Phase 11 Task 3)

- **Phase Context:**
  - `.planning/ROADMAP.md` lines 620-650 - Phase 26 definition and success criteria
  - `.planning/STATE.md` - Project status showing Phases 1-25 complete
  - Phase 6 commit history - Team management API and Marie migration
  - Phase 7 notes - Team management already implemented
  - Phase 22 - Chatbot hidden (not deleted)

## Metadata

**Confidence breakdown:**
- Staff management API fix: **HIGH** - Code exists, just needs route aliases
- SMS A2P registration: **HIGH** - Standard Twilio process, well-documented
- Stripe connection: **HIGH** - GHL dashboard configuration, confirmed in Phase 20
- Domain setup: **HIGH** - Standard Vercel procedure
- PWA configuration: **HIGH** - Native Next.js 14 approach, official docs
- Chatbot verification: **HIGH** - Code inspection confirms current state

**Research date:** 2026-02-12
**Valid until:** 90 days (infrastructure procedures are stable, A2P/Stripe/Vercel docs current as of Feb 2026)

**Key Risks:**
1. A2P campaign approval delay (10-15 days) - communicate timeline expectations
2. Client domain access/ownership unclear - need credentials before starting
3. N8N SMS provider unknown - might not be Twilio, affects A2P process
4. Chatbot deletion confirmation needed - don't delete without explicit approval

**Estimated Effort:**
- Staff API fix: 30 minutes (create wrapper routes)
- PWA setup: 2-3 hours (manifest + icons + testing)
- External configs: 2-4 hours total (domain, verify Stripe, coordinate A2P)
- Chatbot verification: 15 minutes (client communication + deletion if confirmed)
- **Total:** 1 day of development + 10-15 days A2P approval waiting period

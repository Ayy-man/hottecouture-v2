# Codebase Concerns

**Analysis Date:** 2025-01-20

## Tech Debt

**Excessive `as any` Type Assertions:**
- Issue: TypeScript type safety bypassed throughout codebase to work around Supabase type inference issues
- Files:
  - `src/lib/pricing/database.ts` (lines 26, 53, 125, 209, 222, 242)
  - `src/app/api/order/[id]/stage/route.ts` (lines 84, 101, 110, 124, 143, 151, 179, 197, 203, 223, 226)
  - `src/app/board/page.tsx` (line 34 - orders state typed as `any[]`)
  - `src/app/dashboard/analytics/page.tsx` (lines 50, 230, 282, 287)
  - `src/app/admin/pricing/page.tsx` (line 42)
- Impact: Runtime errors go undetected at compile time; refactoring becomes error-prone
- Fix approach: Generate proper Supabase types from database schema using `supabase gen types typescript`

**Debug Console Logs in Production Code:**
- Issue: 80+ console.log/console.error statements remain in source code
- Files:
  - `src/components/timer/timer-button.tsx` (lines 67-74 - debug logging)
  - `src/app/board/page.tsx` (lines 32, 56, 73, 81, 98, 105, 109, 128, 138, 158, 199)
  - `src/lib/board/useBoardData.ts` (lines 15, 22, 51, 80, 83, 128)
  - `src/app/api/timer/*.ts` (extensive logging)
  - `src/lib/webhooks/sms-webhook.ts` (lines 10, 18, 33, 41)
- Impact: Cluttered browser console; potential information leakage; performance overhead
- Fix approach: Implement proper logging service with log levels; remove debug statements for production

**Hardcoded Staff List:**
- Issue: Staff members hardcoded rather than stored in database
- Files: `src/components/staff/staff-session-provider.tsx`
- Impact: Cannot add/remove staff without code changes
- Fix approach: Move staff management to database with admin CRUD interface

**Missing Environment Variable Validation:**
- Issue: .env file contains sensitive API keys; Supabase credentials commented out
- Files:
  - `/.env` (GHL_API_KEY exposed)
  - `/env.example` (shows expected vars but validation at runtime is weak)
- Impact: App may fail silently or behave unexpectedly with missing config
- Fix approach: Add runtime validation for required env vars at startup

## Known Bugs

**Timer Button Always Visible:**
- Symptoms: Timer controls show regardless of order status (line 64: `const shouldShowTimer = true;`)
- Files: `src/components/timer/timer-button.tsx` (line 64)
- Trigger: View any order in the board
- Workaround: Timer functionality still works correctly, just UI clutter

**Race Condition in Order State Update:**
- Symptoms: Orders may flicker or show stale data during drag-and-drop
- Files: `src/app/board/page.tsx` (lines 122-126 - setTimeout hack for state update)
- Trigger: Rapid status changes or drag operations
- Workaround: Manual page refresh

## Security Considerations

**PIN Stored as Plaintext:**
- Risk: Staff PINs stored without hashing; database compromise exposes all PINs
- Files: Staff PIN verification logic (referenced in `PROJECT_STATUS.md`)
- Current mitigation: None
- Recommendations: Hash PINs with bcrypt; add rate limiting on PIN attempts

**API Keys in .env File:**
- Risk: GHL API key visible in .env; if committed to public repo, credentials compromised
- Files: `/.env` (line 2: `GHL_API_KEY=pit-a20f515c-...`)
- Current mitigation: .gitignore should exclude .env
- Recommendations: Verify .env is in .gitignore; rotate exposed keys; use secrets manager

**No Input Sanitization on Webhooks:**
- Risk: Webhook endpoints accept arbitrary JSON payloads
- Files:
  - `src/app/api/webhooks/order-ready/route.ts`
  - `src/app/api/webhooks/order-status/route.ts`
  - `src/app/api/webhooks/payment/route.ts`
  - `src/app/api/webhooks/ghl-invoice/route.ts`
  - `src/app/api/webhooks/stripe/route.ts`
- Current mitigation: Some basic validation with Zod schemas
- Recommendations: Add webhook signature verification; rate limiting

**Admin Endpoints Lack Authentication:**
- Risk: Admin routes may be accessible without proper authorization
- Files:
  - `src/app/api/admin/delete-all-orders/route.ts` (can wipe all data)
  - `src/app/api/orders-nuclear/route.ts` (dangerous endpoint)
  - `src/app/api/admin/delete-services/route.ts`
- Current mitigation: None visible in code
- Recommendations: Add role-based auth checks; audit logging for destructive actions

## Performance Bottlenecks

**Full Order Fetch on Every Board Refresh:**
- Problem: Board page fetches all non-archived orders on every render/refresh
- Files: `src/app/board/page.tsx` (lines 103-135)
- Cause: No pagination; no caching; real-time subscription triggers full refresh
- Improvement path: Implement pagination; use React Query for caching; incremental updates from real-time

**No Data Caching Strategy:**
- Problem: Every navigation triggers fresh API calls
- Files: Throughout client components
- Cause: No client-side caching layer (React Query, SWR not used)
- Improvement path: Add React Query or SWR for data fetching with stale-while-revalidate

## Fragile Areas

**Order Status Transition Logic:**
- Files: `src/app/api/order/[id]/stage/route.ts`
- Why fragile: Complex conditional logic for auto-archive, payment checks, SMS notifications all in single route handler (380 lines)
- Safe modification: Extract into separate service functions; add comprehensive unit tests
- Test coverage: Minimal - only integration tests exist

**Timer State Management:**
- Files:
  - `src/app/api/timer/start/route.ts`
  - `src/app/api/timer/stop/route.ts`
  - `src/app/api/timer/pause/route.ts`
  - `src/app/api/timer/resume/route.ts`
  - `src/components/timer/timer-button.tsx`
- Why fragile: Optimistic updates with manual rollback; multiple API endpoints with similar logic; race conditions possible
- Safe modification: Add comprehensive tests; extract shared timer logic to service
- Test coverage: Unit tests for timer-utils only, not API endpoints

**Intake Form Multi-Step Wizard:**
- Files: `src/app/intake/page.tsx` (400 lines)
- Why fragile: Large monolithic component; complex state management; many child components
- Safe modification: Break into smaller components; add integration tests
- Test coverage: E2E tests exist but may not cover edge cases

## Scaling Limits

**Real-Time Subscriptions:**
- Current capacity: All clients subscribe to same order changes channel
- Limit: Supabase real-time connection limits; broadcast storms on busy days
- Scaling path: Scope subscriptions to specific orders; implement polling fallback

**File Storage:**
- Current capacity: Garment photos stored in Supabase storage
- Limit: Storage quotas; no image optimization
- Scaling path: Implement image compression; add CDN layer

## Dependencies at Risk

**@supabase/auth-helpers-nextjs:**
- Risk: Package deprecated in favor of @supabase/ssr
- Impact: May stop receiving updates; security patches
- Migration plan: Migrate to @supabase/ssr (already included in dependencies)

**GoHighLevel API:**
- Risk: External API dependency; rate limits; breaking changes
- Impact: CRM sync, SMS notifications fail if API changes
- Migration plan: Add retry logic; implement fallback notification path

## Missing Critical Features

**Stripe Integration Keys:**
- Problem: Stripe environment variables commented out in production
- Blocks: Online payment processing; payment links functionality
- Files: `/env.example` (lines 33-36 show Stripe vars as comments)

**Email Notifications:**
- Problem: No email sending capability implemented
- Blocks: Order confirmations; digital receipts

## Test Coverage Gaps

**API Route Handlers:**
- What's not tested: 50+ API routes have no unit tests
- Files: `src/app/api/**/*.ts`
- Risk: Breaking changes go unnoticed; edge cases not covered
- Priority: High

**Component Unit Tests:**
- What's not tested: All UI components lack unit tests
- Files: `src/components/**/*.tsx`
- Risk: UI regressions; prop handling bugs
- Priority: Medium

**Integration Tests Limited:**
- What's not tested: Payment flows; GHL sync; timer edge cases
- Files: Only 5 E2E specs exist covering basic flows
- Risk: Complex business logic untested end-to-end
- Priority: High

**Current Test Files:**
- `tests/unit/timer-utils.test.ts` (191 lines - timer utility functions)
- `tests/unit/pricing.test.ts` (343 lines - pricing calculations)
- `tests/e2e/1-order-flow-intake.spec.ts` (E2E order creation)
- `tests/e2e/2-ui-branding.spec.ts` (E2E UI verification)
- `tests/e2e/3-crm-notifications.spec.ts` (E2E CRM flows)
- `tests/e2e/4-production-hourly.spec.ts` (E2E production features)
- `tests/e2e/homepage.spec.ts` (E2E homepage)

---

*Concerns audit: 2025-01-20*

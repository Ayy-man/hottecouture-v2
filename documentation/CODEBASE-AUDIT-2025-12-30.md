# HOTTE COUTURE - CODEBASE AUDIT REPORT

**Date:** December 30, 2025
**Auditor:** Claude Code (Automated Analysis)
**Scope:** Full codebase review including API routes, React components, database schema, and recent commits

---

## EXECUTIVE SUMMARY

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| API Security | 10 | 8 | 12 | 5 | 35 |
| Database Schema | 4 | 3 | 5 | 4 | 16 |
| React Components | 0 | 4 | 15 | 24 | 43 |
| Code Quality | 0 | 2 | 8 | 10 | 20 |
| Recent Commits | 0 | 2 | 5 | 3 | 10 |
| **TOTAL** | **14** | **19** | **45** | **46** | **124** |

**Verdict:** The application has critical security vulnerabilities that must be addressed before production use. Core functionality works but lacks proper authentication on admin endpoints and has several database schema mismatches that will cause runtime errors.

---

## CRITICAL ISSUES (P0 - Must Fix Immediately)

### SEC-001: Admin Endpoints Have No Authentication

**Severity:** CRITICAL
**Type:** Security - Missing Authorization
**Impact:** Any unauthenticated user can delete all orders, modify services, and access admin functionality

| File | Line | Endpoint | Risk |
|------|------|----------|------|
| `src/app/api/admin/delete-all-orders/route.ts` | 15 | DELETE /api/admin/delete-all-orders | Can delete ALL orders in database |
| `src/app/api/admin/delete-services/route.ts` | 4 | DELETE /api/admin/delete-services | Can delete all services |
| `src/app/api/admin/garment-types/route.ts` | 10 | ALL /api/admin/garment-types | Can modify garment types |
| `src/app/api/admin/move-services-category/route.ts` | 4 | POST /api/admin/move-services-category | Can reorganize services |
| `src/app/api/admin/categories/route.ts` | 80 | ALL /api/admin/categories | Can manage categories |
| `src/app/api/admin/services/route.ts` | 23 | ALL /api/admin/services | Can manage all services |
| `src/app/api/admin/worklist-export/route.ts` | 4 | GET /api/admin/worklist-export | Can export work lists |

**Recommendation:** Add authentication middleware to all `/api/admin/*` routes. Require staff PIN or admin role verification.

---

### SEC-002: Staff PINs Stored as Plain Text

**Severity:** CRITICAL
**Type:** Security - Weak Credential Storage
**Impact:** Database breach exposes all staff PINs; enables credential theft

**Location:**
- `src/app/api/staff/set-pin/route.ts:31`
- `src/app/api/staff/verify-pin/route.ts:35`
- `supabase/migrations/` (PINs in plain text in SQL)

**Current Implementation:**
```typescript
// set-pin/route.ts - PIN stored without hashing
.update({ pin_hash: pin }) // Misleading column name - not actually hashed

// verify-pin/route.ts - Direct comparison
.eq('pin_hash', pin) // Plain text comparison
```

**Database Migration:**
```sql
-- Plain text PINs in migration
UPDATE staff SET pin_hash = '1235' WHERE name = 'Audrey';
UPDATE staff SET pin_hash = '1236' WHERE name = 'Solange';
UPDATE staff SET pin_hash = '1237' WHERE name = 'Audrey-Anne';
```

**Recommendation:**
1. Use bcrypt to hash PINs before storage
2. Compare using bcrypt.compare()
3. Rename column to `pin_hash` only after implementing actual hashing

---

### SEC-003: Missing Webhook Signature Verification

**Severity:** CRITICAL
**Type:** Security - Missing Input Validation
**Impact:** Attackers can forge webhook payloads to manipulate payment status

| File | Issue |
|------|-------|
| `src/app/api/webhooks/stripe/route.ts` | No Stripe signature verification using `stripe.webhooks.constructEvent()` |
| `src/app/api/webhooks/ghl-invoice/route.ts` | Uses shared secret header only, no HMAC signature |

**Current GHL Implementation:**
```typescript
// ghl-invoice/route.ts:102-106
const webhookSecret = request.headers.get('x-webhook-secret');
if (webhookSecret !== WEBHOOK_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
// Simple string comparison - vulnerable to timing attacks
```

**Recommendation:**
1. Implement Stripe webhook signature verification
2. Use `crypto.timingSafeEqual()` for secret comparison
3. Add HMAC signature verification for GHL webhooks

---

### DB-001: Code References Non-Existent Database Columns

**Severity:** CRITICAL
**Type:** Database - Schema Mismatch
**Impact:** Runtime errors when accessing services, migrations will fail

| Code Location | Missing Column | Table | Error Type |
|---------------|----------------|-------|------------|
| `src/app/api/admin/services/route.ts:56` | `is_active` | service | `.eq('is_active', true)` will fail |
| `src/app/api/admin/services/route.ts:58` | `display_order` | service | `.order('display_order')` will fail |
| `supabase/migrations/20240101_performance_indexes.sql:35` | `assigned_user_id` | task | Index creation fails |
| `supabase/migrations/20240101_performance_indexes.sql:47` | `is_active` | client | Index creation fails |
| `supabase/migrations/20240101_performance_indexes.sql:51` | N/A | time_tracking | Table doesn't exist |
| `supabase/migrations/20240101_performance_indexes.sql:68` | N/A | log | Table doesn't exist |
| `supabase/migrations/20240101_performance_indexes.sql:78` | N/A | photo | Table doesn't exist |
| `supabase/migrations/20240101_performance_indexes.sql:85` | N/A | status_change_history | Table doesn't exist |

**Recommendation:**
1. Add missing columns to service table: `is_active BOOLEAN DEFAULT true`, `display_order INTEGER`
2. Remove or fix performance indexes migration referencing non-existent tables
3. Verify all code paths against actual database schema

---

## HIGH SEVERITY ISSUES (P1 - Fix This Week)

### SEC-004: Race Conditions in Task Assignment

**Severity:** HIGH
**Type:** Concurrency - Race Condition
**Impact:** Two staff members could claim the same task simultaneously

**Location:** `src/app/api/staff/active-task/route.ts:64-67`

```typescript
// Check then update pattern - not atomic
const { data: unassignedTasks } = await supabase
  .from('garment')
  .select('*')
  .is('assignee', null);

// Another request could claim the same task between these calls
await supabase
  .from('garment')
  .update({ assignee: staffName })
  .eq('id', taskId);
```

**Also affects:**
- `src/app/api/timer/start/route.ts:20-30`
- `src/app/api/intake/route.ts:71-95` (client creation)
- `src/app/api/admin/categories/route.ts:171-186`
- `src/app/api/admin/services/route.ts:117-129`

**Recommendation:** Use database transactions with row-level locking or optimistic concurrency control.

---

### SEC-005: Timing Attack Vulnerabilities

**Severity:** HIGH
**Type:** Security - Cryptographic Weakness
**Impact:** Attackers can determine secret length/content through response timing

| File | Line | Issue |
|------|------|-------|
| `src/app/api/webhooks/payment/route.ts` | 24 | `webhookSecret !== WEBHOOK_SECRET` |
| `src/app/api/webhooks/order-ready/route.ts` | 24 | `webhookSecret !== WEBHOOK_SECRET` |
| `src/app/api/cron/reminders/route.ts` | 9 | `authHeader !== Bearer ${process.env.CRON_SECRET}` |
| `src/app/api/webhooks/ghl-invoice/route.ts` | 103 | `webhookSecret !== WEBHOOK_SECRET` |

**Recommendation:** Replace with `crypto.timingSafeEqual()`:
```typescript
import { timingSafeEqual } from 'crypto';

const isValid = timingSafeEqual(
  Buffer.from(providedSecret),
  Buffer.from(expectedSecret)
);
```

---

### SEC-006: Chat API Has No Authentication

**Severity:** HIGH
**Type:** Security - Missing Authentication
**Impact:** Unauthenticated access to internal chat with database query tools

**Location:** `src/app/api/chat/internal/route.ts:692`

The chat API provides 10 database tools without requiring authentication:
- `get_order` - Query any order
- `search_clients` - Search all clients
- `get_stats` - Business statistics
- `update_order_status` - Modify orders
- `update_order_details` - Modify order details
- `add_order_note` - Add notes to orders
- `get_productivity_stats` - Staff productivity data

**Recommendation:** Add staff PIN verification or session-based authentication.

---

### SEC-007: Development Auth Bypass in Production Code

**Severity:** HIGH
**Type:** Security - Debug Code in Production
**Impact:** Authentication can be bypassed if NODE_ENV is misconfigured

**Location:** `src/app/api/labels/[orderId]/route.ts:154-167`

```typescript
if (process.env.NODE_ENV === 'development') {
  // Completely bypasses all authentication checks
  return await generateLabels(orderId);
}
```

**Recommendation:** Remove development bypasses or use feature flags with explicit opt-in.

---

### BUG-001: Unarchive Loses Original Order Status

**Severity:** HIGH
**Type:** Bug - Data Loss
**Impact:** Orders archived from pending/working/done status will be restored to 'delivered' incorrectly

**Location:** `src/app/api/orders/unarchive/route.ts:20-24`

```typescript
.update({
  status: 'delivered',  // Always hardcoded to 'delivered'
  is_archived: false,
  archived_at: null,
})
```

**Scenario:**
1. Order is in "pending" status
2. User archives the order
3. User later unarchives
4. Order is now "delivered" instead of "pending"

**Recommendation:** Store original status before archiving, or add a `previous_status` column.

---

### DB-002: Row Level Security Globally Disabled

**Severity:** HIGH
**Type:** Security - Missing Access Control
**Impact:** Direct database access bypasses all security

**Location:** `supabase/migrations/0023_disable_staff_rls.sql`

```sql
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE task DISABLE ROW LEVEL SECURITY;
ALTER TABLE garment DISABLE ROW LEVEL SECURITY;
ALTER TABLE "order" DISABLE ROW LEVEL SECURITY;
ALTER TABLE client DISABLE ROW LEVEL SECURITY;
ALTER TABLE service DISABLE ROW LEVEL SECURITY;
```

**Recommendation:** Re-enable RLS with proper policies for service role access patterns.

---

## MEDIUM SEVERITY ISSUES (P2 - Fix Before Launch)

### PERF-001: 307+ Console.log Statements in Production Code

**Severity:** MEDIUM
**Type:** Performance / Logging
**Impact:** Increased latency, log pollution, potential data exposure

**Highest Offenders:**

| File | Count | Examples |
|------|-------|----------|
| `src/app/api/intake/route.ts` | 40+ | Order creation logging |
| `src/app/api/webhooks/stripe/route.ts` | 20+ | Payment processing |
| `src/app/api/labels/[orderId]/route.ts` | 20+ | Label generation |
| `src/app/api/order/[id]/stage/route.ts` | 16+ | Status changes |
| `src/components/board/interactive-board.tsx` | 13 | UI debugging |
| `src/components/intake/services-step-new.tsx` | 13 | Service selection |

**Sample problematic logs:**
```typescript
console.log('🔍 Labels page: Received data:', data);  // May contain PII
console.log('📇 Creating new GHL contact for:', client.first_name, client.last_name);
console.log(`💳 Payment completed for order #${orderNumber}`);
```

**Recommendation:**
1. Remove all console.log statements
2. Implement structured logging (e.g., Pino, Winston)
3. Use log levels (debug, info, warn, error)

---

### TYPE-001: 60+ Uses of `any` Type

**Severity:** MEDIUM
**Type:** Code Quality - Type Safety
**Impact:** Runtime errors, reduced IDE support, maintenance difficulty

**Highest Offenders:**

| File | Count |
|------|-------|
| `src/lib/api/analytics.ts` | 13 |
| `src/lib/clients/client-service.ts` | 10 |
| `src/app/api/labels/[orderId]/route.ts` | 10+ |
| `src/lib/pricing/database.ts` | 7 |
| `src/app/api/tasks/order/[orderId]/route.ts` | 7+ |

**Recommendation:** Create proper TypeScript interfaces for all data structures.

---

### API-001: Inconsistent Response Formats

**Severity:** MEDIUM
**Type:** API Design
**Impact:** Frontend must handle multiple response formats

**Examples:**
```typescript
// Pattern 1: { success: true, data }
return NextResponse.json({ success: true, clients, count });

// Pattern 2: { data } without success
return NextResponse.json({ services });

// Pattern 3: { found: true/false }
return NextResponse.json({ found: true, orders });

// Pattern 4: Different field names
return NextResponse.json({ success: true, workList, csvContent, filename });
```

**Recommendation:** Standardize on a single response format:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { count: number; page: number; }
}
```

---

### API-002: Missing Input Validation

**Severity:** MEDIUM
**Type:** Security - Input Validation
**Impact:** Invalid data could corrupt database or cause unexpected behavior

| File | Issue |
|------|-------|
| `src/app/api/orders/route.ts:13-15` | page/limit can be 0 or negative |
| `src/app/api/calendar/book/route.ts:16-20` | start_time/end_time format not validated |
| `src/app/api/garment/[id]/route.ts:34` | estimated_minutes allows extremely large numbers |
| `src/app/api/measurements/clients/[id]/measurements/route.ts:149` | parseFloat() without NaN check |

**Recommendation:** Use Zod schemas for all API inputs with proper constraints.

---

### REACT-001: Missing Error Boundaries

**Severity:** MEDIUM
**Type:** React - Error Handling
**Impact:** Component errors crash entire page instead of graceful degradation

**Affected Components:**
- `src/components/board/interactive-board.tsx` - Kanban board with drag-drop
- `src/components/intake/services-step-new.tsx` - 1,900+ line service selection
- `src/components/board/order-detail-modal.tsx` - Order details with async calls
- `src/components/tasks/task-management-modal.tsx` - Task management

**Recommendation:** Wrap critical components in error boundaries with fallback UI.

---

### REACT-002: Memory Leak Potential

**Severity:** MEDIUM
**Type:** React - Memory Management
**Impact:** Memory growth over time, performance degradation

| File | Line | Issue |
|------|------|-------|
| `src/components/timer/timer-button.tsx` | 107-111 | No AbortController for fetch requests |
| `src/components/auth/auth-provider.tsx` | 19-40 | Async function not tracked for cleanup |
| `src/components/ui/modal.tsx` | 40 | onClose in dependency array may cause leaks |
| `src/components/intake/services-step-new.tsx` | 178-196 | Event listener cleanup in conditional |

**Recommendation:** Add AbortController to all fetch calls, track async operations.

---

### DB-003: Dual Archive State Representation

**Severity:** MEDIUM
**Type:** Database - Schema Design
**Impact:** Potential inconsistency between status and is_archived fields

**Current State:**
- `order.status` can be 'archived' (enum value)
- `order.is_archived` boolean field
- Both must be kept in sync manually

**Locations where both are set:**
- `src/app/api/orders/archive/route.ts`
- `src/app/api/orders/unarchive/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/webhooks/ghl-invoice/route.ts`
- `src/app/api/payments/record-manual/route.ts`
- `src/app/api/order/[id]/stage/route.ts`

**Recommendation:** Choose one source of truth:
- Option A: Use only `status = 'archived'`, remove `is_archived` column
- Option B: Use only `is_archived` boolean, keep status for workflow stages

---

### DB-004: Inconsistent Column Naming

**Severity:** MEDIUM
**Type:** Database - Naming Convention
**Impact:** Code confusion, maintenance difficulty

| Pattern | Tables Using |
|---------|--------------|
| `assignee VARCHAR(100)` | task, garment, garment_service |
| `assigned_to VARCHAR(100)` | order |
| `assigned_user_id UUID` | Referenced in indexes but doesn't exist |

**Also:**
- `task.stage` vs `order.status` (different column names for similar concept)
- `task_stage` enum vs `order_status` enum

**Recommendation:** Standardize on consistent naming:
- Use `assigned_to` everywhere
- Use `status` for all workflow state columns

---

## LOW SEVERITY ISSUES (P3 - Fix When Possible)

### I18N-001: Mixed Language Strings

**Severity:** LOW
**Type:** Internationalization
**Impact:** Inconsistent user experience

**French strings:**
- Timer: "Démarrer", "Pause", "Reprendre", "Terminer"
- Chat: "Bonjour! Je suis l'assistant IA..."
- Staff: "Connexion du personnel", "NIP incorrect"

**English strings:**
- Services: "Add New Service", "Previous", "Next"
- Payments: "Payment Summary", "Pay in Full"
- Orders: "Order Information", "Garments"

**Recommendation:** Implement i18n library (next-intl or react-i18next).

---

### A11Y-001: Accessibility Issues

**Severity:** LOW
**Type:** Accessibility
**Impact:** Screen reader users cannot fully navigate application

| Component | Issue |
|-----------|-------|
| `src/components/ui/photo-gallery.tsx:68-84` | Navigation buttons missing aria-labels |
| `src/components/chat/internal-chat.tsx:117-124` | Chat button missing accessible name |
| `src/components/intake/services-step-new.tsx:965-982` | Context menu missing ARIA attributes |
| `src/components/timer/timer-button.tsx:440` | Uses title instead of aria-label |
| `src/components/board/order-detail-modal.tsx:306-312` | Close button shows ✕ without aria-label |

**Recommendation:** Add aria-labels, keyboard navigation, and focus management.

---

### CODE-001: Unresolved TODO Comments

**Severity:** LOW
**Type:** Code Quality - Technical Debt
**Impact:** Incomplete implementations

| File | Line | TODO |
|------|------|------|
| `src/app/api/webhooks/payment/route.ts` | 106 | "TODO: Implement actual payment processor integration" |
| `src/app/api/webhooks/order-ready/route.ts` | 65 | "TODO: Implement actual n8n integration" |

---

### CODE-002: @ts-ignore Comments

**Severity:** LOW
**Type:** Code Quality - Type Safety
**Impact:** Hidden type errors

| File | Line |
|------|------|
| `src/components/ui/publish-button.tsx` | 68 |

---

### CODE-003: Commented Debug Code

**Severity:** LOW
**Type:** Code Quality
**Impact:** Code clutter

**Location:** `src/lib/ghl/client.ts:61`
```typescript
// Debug logging for query params
// console.log('🔍 GHL Query Params:', JSON.stringify(queryParams));
```

---

### PERF-002: Missing Memoization in React Components

**Severity:** LOW
**Type:** Performance
**Impact:** Unnecessary re-renders

| File | Issue |
|------|-------|
| `src/components/board/interactive-board.tsx:57-104` | ordersByStatus calculated every render |
| `src/components/board/order-detail-modal.tsx:262-273` | Utility functions redefined every render |
| `src/components/tasks/task-management-modal.tsx:144-155` | tasksByGarment created every render |

**Recommendation:** Use `useMemo` for expensive calculations, extract utilities to module level.

---

## RECENT COMMIT ISSUES

### COMMIT-001: Incomplete Measurements Fix Pattern

**Commits:** 7061f7f → 9816c6d → 82159e2

Three consecutive commits attempted to fix the same measurements persistence issue:
1. `7061f7f`: "Fix: Timer pause 500 error and Client measurements persistence"
2. `9816c6d`: "Fix: Client measurements persistence (frontend)"
3. `82159e2`: "fix: allow undefined for measurements with exactOptionalPropertyTypes"

**Concern:** Multiple fix attempts suggest the root cause may not be fully resolved.

**Recommendation:** Review measurements persistence end-to-end to ensure stability.

---

### COMMIT-002: Timer Data Corruption Protection Added

**Commit:** 7061f7f

**Location:** `src/app/api/timer/pause/route.ts:74-96`

Added extensive validation to prevent NaN/invalid values:
```typescript
if (isNaN(startTime.getTime())) {
  console.warn('⚠️ Invalid started_at date found:', garment.started_at);
}
if (isNaN(newActualMinutes) || !isFinite(newActualMinutes)) {
  console.error('❌ Invalid final actual_minutes:', newActualMinutes);
  newActualMinutes = garment.actual_minutes || 0;
}
```

**Implication:** Previous code was corrupting timer data. Existing records may contain invalid values.

**Recommendation:** Run data cleanup query to fix any corrupted `actual_minutes` values.

---

## RECOMMENDED FIX PRIORITY

### Phase 1: Critical Security (Today)
1. Add authentication to all `/api/admin/*` endpoints
2. Implement bcrypt hashing for staff PINs
3. Add missing `is_active` and `display_order` columns to service table
4. Fix timing attack vulnerabilities with `timingSafeEqual`

### Phase 2: High Priority (This Week)
5. Add Stripe webhook signature verification
6. Fix race conditions with database transactions
7. Fix unarchive to preserve original status
8. Add authentication to chat API
9. Re-enable RLS with proper policies

### Phase 3: Before Launch
10. Remove all console.log statements (307+)
11. Standardize API response formats
12. Add error boundaries to critical React components
13. Fix memory leak potential in components
14. Consolidate archive state representation

### Phase 4: Post-Launch
15. Replace `any` types with proper interfaces (60+)
16. Implement i18n for mixed language strings
17. Add accessibility improvements
18. Resolve TODO comments
19. Add missing database indexes

---

## APPENDIX: Files Requiring Most Attention

| File | Issues | Priority |
|------|--------|----------|
| `src/app/api/admin/services/route.ts` | No auth, missing columns, race condition | CRITICAL |
| `src/app/api/staff/set-pin/route.ts` | Plain text PINs | CRITICAL |
| `src/app/api/staff/verify-pin/route.ts` | Plain text comparison | CRITICAL |
| `src/app/api/webhooks/stripe/route.ts` | No signature verification, 20+ console.logs | HIGH |
| `src/app/api/orders/unarchive/route.ts` | Status loss bug | HIGH |
| `src/app/api/chat/internal/route.ts` | No auth, extensive any types | HIGH |
| `src/components/intake/services-step-new.tsx` | 1900+ lines, no error boundary, 13 console.errors | MEDIUM |
| `src/app/api/intake/route.ts` | Race condition, 40+ console.logs | MEDIUM |
| `supabase/migrations/20240101_performance_indexes.sql` | References non-existent tables | CRITICAL |

---

*Document generated: December 30, 2025*
*Next review recommended: Before production deployment*

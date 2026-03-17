# Phase 27: Role-Based Access Control - Seamstress View Filtering - Research

**Researched:** 2026-02-22
**Domain:** Role-based UI filtering using existing PIN-based staff auth system
**Confidence:** HIGH — all findings from direct codebase inspection

---

## Summary

Phase 27 adds seamstress-role filtering across the app's UI. The foundation is already in place: staff are authenticated via PIN, their session (including `staffRole`) is stored in localStorage via `useCurrentStaff()`, and the `StaffSessionProvider` makes it available app-wide via `useStaffSession()`. The board's API (`get_orders_with_details`) already accepts a `p_assigned_seamstress_id` parameter that filters at the database level. The `RoleGate` component and `NavigationProvider` exist but are not currently wired into the PIN-based staff auth system — they use Supabase Auth `app_role` metadata, which is a separate concern from the staff PIN system.

The three roles in the system are `seamstress`, `manager`, and `admin`. The design decisions specify that seamstresses see a filtered view. Managers and admins see the full view. The key pattern is: read `currentStaff.staffRole` from `useStaffSession()`, then conditionally render or filter based on whether `staffRole === 'seamstress'`.

**Primary recommendation:** Use `currentStaff.staffRole === 'seamstress'` from `useStaffSession()` as the single source of truth for all RBAC logic in this phase. Do NOT use or extend `NavigationProvider`/`RoleGate` — they are Supabase Auth-based and unused in the current staff auth flow.

---

## User Constraints (from design decisions, Feb 22)

### Locked Decisions

- **Board:** Seamstresses see only orders with items assigned to them (use `p_assigned_seamstress_id` RPC param)
- **Order detail modal:** Seamstresses see ALL garments/tasks (full job context) but NO pricing section, NO payment section, NO client contact info (phone/email), NO "Edit Price" buttons on services
- **Calendar:** Only their tasks + unassigned pool (filter `allTasks` where `seamstressId === currentStaff.staffId || seamstressId === null`)
- **Workload:** Only their own utilization gauge (hide other staff gauges; still show unassigned pool)
- **Navigation (mobile bottom nav):** Hide Intake, Clients from seamstresses — keep Board and Calendar
- **Navigation (header/other):** Hide Dashboard (analytics), Archived, Exports from seamstresses
- **API-level filtering:** Use existing `p_assigned_seamstress_id` RPC parameter for board orders fetch
- **Roles:** `seamstress`, `manager`, `admin` — only `seamstress` gets restricted view; `manager` and `admin` see everything

### Claude's Discretion

- Exact placement of `isSeamstress` check (in page components vs a shared hook)
- Whether to redirect or just hide nav items for seamstresses who navigate directly to restricted URLs

### Deferred Ideas (OUT OF SCOPE)

- Supabase Auth integration with `NavigationProvider`/`RoleGate`
- Server-side route protection (middleware)
- Manager-specific views (managers see full board, no restrictions)

---

## Architecture Patterns

### Core Auth Pattern (HIGH confidence — from direct code inspection)

The app uses PIN-based staff auth entirely separate from Supabase Auth:

```
// src/lib/hooks/useCurrentStaff.ts — the root hook
export interface StaffSession {
  staffId: string;
  staffName: string;
  staffRole: string;   // 'seamstress' | 'manager' | 'admin'
  staffColor: string;
  clockedInAt: string;
}
```

Session is stored in `localStorage` under `hc_staff_session` key. The `StaffSessionProvider` wraps the whole app and exposes `useStaffSession()`:

```typescript
// usage in any component:
const { currentStaff, isAuthenticated } = useStaffSession();
const isSeamstress = currentStaff?.staffRole === 'seamstress';
```

### Role Values in the System (HIGH confidence — from migrations + admin UI)

**Source:** `supabase/migrations/0039_set_audrey_admin_role.sql` and `ROLE_OPTIONS` in admin pages.

The actual role strings stored in `staff.role` column:
- `'seamstress'` — restricted view (default for new staff)
- `'manager'` — full view (same as admin for UI purposes)
- `'admin'` — full view + team management link in StaffIndicator dropdown

The `verify-pin` API returns `staff.role || 'seamstress'` — so NULL roles default to `seamstress`.

### What Does NOT Need to Change (HIGH confidence)

- `NavigationProvider` — uses Supabase Auth `app_role`, not staff PIN. Not used for access control in practice.
- `RoleGate` component — designed for Supabase Auth roles. Not the mechanism for this phase.
- `AuthGuard` — just checks `isAuthenticated` (any staff is authenticated), not role.
- `StaffPinModal` — no changes needed.
- `useCurrentStaff` hook — already provides `staffRole`, no changes needed.

---

## Implementation Map: All Touch Points

### 1. Board Page (`src/app/board/page.tsx`) — HIGH confidence

**Current behavior:** Fetches `/api/orders` which calls `get_orders_with_details` with no `p_assigned_seamstress_id`.

**Change needed:** When `isSeamstress`, pass `seamstressId` as a query param to `/api/orders`. The API route must forward it to the RPC.

```typescript
// board/page.tsx — fetch change
const seamstressFilter = isSeamstress ? `&seamstressId=${currentStaff.staffId}` : '';
const url = `/api/orders?ts=${Date.now()}${seamstressFilter}`;
```

```typescript
// src/app/api/orders/route.ts — add param forwarding
const seamstressId = searchParams.get('seamstressId');
const { data: orders } = await supabase.rpc('get_orders_with_details', {
  p_limit: limit,
  p_offset: offset,
  p_client_id: clientId,
  p_assigned_seamstress_id: seamstressId || null  // ADD THIS
});
```

**RPC already supports this:** `p_assigned_seamstress_id UUID DEFAULT NULL` exists in migration 0040. The filter is: orders where at least one `garment_service.assigned_seamstress_id = p_assigned_seamstress_id`.

**Also hide from seamstresses on the board page:**
- The `MoreHorizontal` dropdown menu (contains Workload link, Archived link, Export Orders, Export Capacity)
- The "Nouvelle Commande" button (link to /intake)
- The "Export Work List" fixed button (bottom-left)
- The `AssigneeFilter` dropdown (no need for seamstresses to filter by assignee — they're already filtered)

### 2. Orders API (`src/app/api/orders/route.ts`) — HIGH confidence

Currently does NOT read `seamstressId` from query params. The RPC function already accepts it.

```typescript
const seamstressId = searchParams.get('seamstressId');
// Pass to RPC:
p_assigned_seamstress_id: seamstressId ? seamstressId : null
```

### 3. Order Detail Modal (`src/components/board/order-detail-modal.tsx`) — HIGH confidence

The modal must accept a `isSeamstress` prop (boolean). When true, hide:

**Pricing section** (lines ~1074-1184 in current file):
```tsx
{/* Pricing */}
<div className='mb-4'>
  <h3>Pricing</h3>
  ...subtotal, rush fee, tax, total, deposit, balance...
  ...editingPrice inline edit...
```
→ Wrap entire `Pricing` div with `{!isSeamstress && (...)}`

**Payment section** (lines ~1186-1204):
```tsx
{/* Payment Section */}
<div className='mb-4'>
  <PaymentStatusSection ... />
```
→ Wrap with `{!isSeamstress && (...)}`

**Client contact info** (lines ~624-677):
The "Client Information" card shows `client_phone`, `client_email`, the reveal button, and the "Voir l'historique" link.
→ For seamstresses: hide phone, email, reveal button, and history link. Can still show client name and language.

**Service-level "Edit Price" buttons** (lines ~1015-1026):
The `<Button ... onClick={() => handleStartEditServicePrice(...)}>Edit Price</Button>` on each service row.
→ Wrap with `{!isSeamstress && (...)}`

**Service estimated/final price display:**
The price info block (Est: $X, final price, FINAL badge) on each service.
→ Wrap the entire price column div with `{!isSeamstress && (...)}`

**Actions bar** (bottom):
The `HoldToArchiveButton` (archive/unarchive) — hide from seamstresses.
The "Print Labels" button — keep (seamstresses need this).
The "Manage Tasks" button — keep.

**How to pass `isSeamstress` into the modal:**
The modal is opened from `InteractiveBoard`, `OrderListView`, and `workload/page.tsx`. The cleanest approach is adding `isSeamstress?: boolean` prop to `OrderDetailModal`.

### 4. Mobile Bottom Nav (`src/components/navigation/mobile-bottom-nav.tsx`) — HIGH confidence

Current fixed nav items:
```typescript
const navItems = [
  { href: '/board', icon: Home, label: 'Board' },
  { href: '/intake', icon: ClipboardList, label: 'Intake' },
  { href: '/clients', icon: Users, label: 'Clients' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
];
```

**Change needed:** `MobileBottomNav` currently doesn't access staff session. Need to add `useStaffSession()` and filter nav items.

For seamstresses, show only: Board, Calendar (and Chat if it exists/is accessible).
Hide: Intake, Clients.

```typescript
// In MobileBottomNav:
const { currentStaff } = useStaffSession();
const isSeamstress = currentStaff?.staffRole === 'seamstress';
const visibleItems = isSeamstress
  ? navItems.filter(item => ['/board', '/calendar'].includes(item.href))
  : navItems;
```

Note: `MobileBottomNav` is a server-side rendered component in the layout — but it's `'use client'` because it uses `usePathname`. Adding `useStaffSession()` is fine since `StaffSessionProvider` wraps it in the layout.

### 5. Calendar Page (`src/app/calendar/page.tsx`) — HIGH confidence

Currently fetches ALL orders and shows ALL tasks. `currentStaff` is already accessed:
```typescript
const { currentStaff } = useStaffSession();
```

**Change needed:** Filter tasks for seamstresses:
```typescript
// Instead of showing allTasks → weekTasks (all seamstresses)
// For seamstresses: only show tasks assigned to them OR unassigned
const myTasks = isSeamstress
  ? allTasks.filter(t => t.seamstressId === currentStaff?.staffId || !t.seamstressId)
  : allTasks;
```

The `unassignedTasks` already filters `!t.seamstressId` — keep that for seamstresses (they can pick up unassigned tasks).

**Also:** Remove "Assign to Me" button for tasks already assigned to the current seamstress (they're already theirs). Keep "Assign to Me" for unassigned tasks.

### 6. Workload Page (`src/app/board/workload/page.tsx`) — HIGH confidence

`currentStaff` already accessed. Full workload page shows all staff gauges.

**Change needed for seamstresses:** Show only:
- Their own gauge card
- Unassigned pool (they can self-assign)
- Hide: all other staff gauges, overloaded days panel (not their concern), Gantt chart (too much info)

```typescript
const isSeamstress = currentStaff?.staffRole === 'seamstress';
// In render:
{isSeamstress ? (
  // Show only own gauge + unassigned
  <SeamstressPersonalView ... />
) : (
  // Show full workload for managers/admins
  <FullWorkloadView ... />
)}
```

Or simpler — filter the staff gauges loop:
```typescript
{staffMembers
  .filter(s => !isSeamstress || s.id === currentStaff?.staffId)
  .map(staff => ...)}
```

**Also hide for seamstresses:**
- Export buttons per seamstress card
- The Gantt chart section
- Overloaded days alert

### 7. Dashboard / Analytics (`src/app/dashboard/page.tsx` and `src/app/dashboard/analytics/`) — LOW-MEDIUM confidence

These pages are linked from the top-level navigation. Seamstresses should not see them.

**Approach options:**
1. Add a redirect at the top of the dashboard page: if `isSeamstress`, redirect to `/board`
2. Hide the dashboard link from navigation entirely

Since the main header nav in `layout.tsx` only shows "Home" and `StaffIndicator` — there's no dashboard link in the main nav currently. The dashboard may only be accessible by direct URL. A simple guard at the top of `dashboard/page.tsx` is sufficient.

### 8. Archived Page (`src/app/archived/page.tsx`) — MEDIUM confidence

Accessed via the board's dropdown menu. For seamstresses, this dropdown is hidden (step 1 above). Additionally, add a redirect guard at the top of `archived/page.tsx` in case seamstresses navigate directly.

### 9. Clients Page (`src/app/clients/page.tsx`) — MEDIUM confidence

Currently accessible and listed in mobile nav. Mobile nav will hide it (step 4). For direct URL access, add a redirect guard.

### 10. Intake Page (`src/app/intake/page.tsx`) — MEDIUM confidence

Mobile nav hides it. "Nouvelle Commande" button on board is hidden. For direct URL access, add redirect guard.

---

## The Role System (Actual vs. Design Decision)

**Key discrepancy to flag for planning:**

The design decisions say roles are `seamstress`, `manager`, `admin`. The actual codebase has:
- `seamstress` — stored in DB, default
- `manager` — stored in DB (Gestionnaire in UI)
- `admin` — stored in DB, used in `StaffIndicator` for team management link

But the `UserRole` enum in `src/lib/auth/roles.ts` has: `OWNER`, `SEAMSTRESS`, `CUSTOM`, `CLERK` — completely different from the staff table roles.

**Conclusion:** The `UserRole` enum is for the unused Supabase Auth system. For this phase, use only `staff.role` values: `'seamstress'`, `'manager'`, `'admin'`. The check is simple string comparison:

```typescript
const isSeamstress = currentStaff?.staffRole === 'seamstress';
const isFullAccess = currentStaff?.staffRole === 'manager' || currentStaff?.staffRole === 'admin';
```

---

## Standard Stack

### Core (no new packages needed)
| Component | Purpose | Location |
|-----------|---------|----------|
| `useStaffSession()` | Access current staff role | `src/components/staff/staff-session-provider.tsx` |
| `currentStaff.staffRole` | Role string (`'seamstress'` \| `'manager'` \| `'admin'`) | via `useStaffSession()` |
| `get_orders_with_details` RPC | Board order filtering by seamstress | Supabase, already deployed |
| `p_assigned_seamstress_id` | UUID param to filter orders | RPC param, already exists |

**Installation:** None required. All building blocks exist.

---

## Common Pitfalls

### Pitfall 1: Using NavigationProvider/RoleGate Instead of StaffSession
**What goes wrong:** `NavigationProvider` reads Supabase Auth `app_role` from JWT. Staff log in via PIN, not Supabase Auth. `userRole` from `NavigationProvider` will always be `null` or `UserRole.OWNER` (the default) for staff.
**How to avoid:** Always use `useStaffSession()` and `currentStaff.staffRole` for role checks in this phase.

### Pitfall 2: Forgetting the Loading State
**What goes wrong:** `currentStaff` is null during the initial localStorage read (async useEffect). Gating on `isSeamstress` without checking `isLoading` could cause a flash of full-access content.
**How to avoid:** Check `isLoading` from `useStaffSession()`:
```typescript
const { currentStaff, isLoading } = useStaffSession();
if (isLoading) return <LoadingState />;
const isSeamstress = currentStaff?.staffRole === 'seamstress';
```

### Pitfall 3: Board Uses Client-Side Filtering Only
**What goes wrong:** The board already has a client-side `filterOrders()` function using `selectedAssigneeId`. If you add seamstress filtering only client-side (after fetching all orders), seamstresses will briefly see all orders while the page loads.
**How to avoid:** Use API-level filtering with `p_assigned_seamstress_id` for the initial board fetch. This is the decided approach — pass `seamstressId` as a query param so the RPC filters at the DB level.

### Pitfall 4: OrderDetailModal Prop Threading
**What goes wrong:** `OrderDetailModal` is opened from multiple places (`InteractiveBoard`, `OrderListView`, `workload/page.tsx`). If you add `isSeamstress` prop, you must update all call sites.
**How to avoid:** Thread the prop at all three call sites. Or access `useStaffSession()` directly inside `OrderDetailModal` (simpler — no prop needed, since `StaffSessionProvider` wraps the whole app).

**Recommendation:** Access `useStaffSession()` directly inside `OrderDetailModal` rather than threading a prop. This is simpler and self-contained.

### Pitfall 5: Calendar Gets All Orders from /api/orders
**What goes wrong:** Calendar page calls `/api/orders` without any `seamstressId` parameter — it gets all orders and then client-side filters tasks. This means the data is fetched but filtered in JS. For seamstress view this is acceptable since the filtering is just a `useMemo` filter, not a security boundary.
**How to avoid:** Client-side filter is fine here (no sensitive data exposed — calendar only shows task names and times, no pricing). No API change needed for calendar.

### Pitfall 6: `manager` Role Behavior
**What goes wrong:** The design decisions mention `manager` and `admin` both get full access, but the codebase only gives `admin` the team management link. If you write `if role !== 'seamstress' → full access`, managers get full access. This is correct per the decisions.
**How to avoid:** Logic should be `isSeamstress = staffRole === 'seamstress'`. Do NOT enumerate manager/admin — just invert.

---

## Code Examples

### Seamstress Role Check Pattern
```typescript
// Preferred pattern — used throughout this phase
const { currentStaff, isLoading } = useStaffSession();
const isSeamstress = currentStaff?.staffRole === 'seamstress';
```

### Board Page API Fetch with Role Filter
```typescript
// src/app/board/page.tsx — in fetchOrders()
const seamstressParam = isSeamstress && currentStaff?.staffId
  ? `&seamstressId=${currentStaff.staffId}`
  : '';
const url = `/api/orders?ts=${Date.now()}${seamstressParam}`;
```

### Orders API Route — Accept seamstressId
```typescript
// src/app/api/orders/route.ts
const seamstressId = searchParams.get('seamstressId');
const { data: orders } = await supabase.rpc('get_orders_with_details', {
  p_limit: limit,
  p_offset: offset,
  p_client_id: clientId,
  p_assigned_seamstress_id: seamstressId || null,
});
```

### OrderDetailModal — Internal Role Check
```typescript
// src/components/board/order-detail-modal.tsx — top of component
const { currentStaff } = useStaffSession();
const isSeamstress = currentStaff?.staffRole === 'seamstress';
// Then in JSX:
{!isSeamstress && (
  <div className='mb-4'>{/* Pricing section */}</div>
)}
{!isSeamstress && (
  <div className='mb-4'><PaymentStatusSection ... /></div>
)}
```

### Mobile Bottom Nav Filtering
```typescript
// src/components/navigation/mobile-bottom-nav.tsx
'use client';
import { useStaffSession } from '@/components/staff';
// ...
const { currentStaff } = useStaffSession();
const isSeamstress = currentStaff?.staffRole === 'seamstress';
const SEAMSTRESS_ALLOWED = ['/board', '/calendar'];
const visibleItems = isSeamstress
  ? navItems.filter(item => SEAMSTRESS_ALLOWED.includes(item.href))
  : navItems;
```

### Calendar Task Filtering
```typescript
// src/app/calendar/page.tsx — inside component
const isSeamstress = currentStaff?.staffRole === 'seamstress';
// Replace allTasks usage with filteredTasks:
const filteredTasks = useMemo(() => {
  if (!isSeamstress) return allTasks;
  return allTasks.filter(t =>
    t.seamstressId === currentStaff?.staffId || !t.seamstressId
  );
}, [allTasks, isSeamstress, currentStaff?.staffId]);
```

### Page-Level Access Guard (for restricted pages)
```typescript
// Pattern for intake/page.tsx, clients/page.tsx, archived/page.tsx, dashboard/page.tsx
const { currentStaff, isLoading } = useStaffSession();
useEffect(() => {
  if (!isLoading && currentStaff?.staffRole === 'seamstress') {
    router.replace('/board');
  }
}, [isLoading, currentStaff, router]);
```

---

## Files to Change — Summary

| File | Change |
|------|--------|
| `src/app/api/orders/route.ts` | Accept `seamstressId` query param, pass to RPC |
| `src/app/board/page.tsx` | Pass `seamstressId` in API call when isSeamstress; hide export buttons, "Nouvelle Commande", AssigneeFilter for seamstresses |
| `src/components/board/order-detail-modal.tsx` | Use `useStaffSession()` internally; hide pricing section, payment section, client contact (phone/email), service price edit buttons |
| `src/components/navigation/mobile-bottom-nav.tsx` | Use `useStaffSession()`, filter nav items for seamstresses |
| `src/app/calendar/page.tsx` | Filter tasks to own + unassigned when isSeamstress |
| `src/app/board/workload/page.tsx` | For seamstresses: show only own gauge + unassigned; hide other gauges, Gantt, export buttons |
| `src/app/intake/page.tsx` | Add redirect guard for seamstresses |
| `src/app/clients/page.tsx` | Add redirect guard for seamstresses |
| `src/app/archived/page.tsx` | Add redirect guard for seamstresses |
| `src/app/dashboard/page.tsx` | Add redirect guard for seamstresses |

---

## Open Questions

1. **Should seamstresses see the workload page at all?**
   - What we know: Design decision says "only their own utilization gauge"
   - What's unclear: Is a reduced workload view worthwhile, or should the page redirect to board?
   - Recommendation: Show a simplified workload view (just their gauge + unassigned pool), since the "Assign to Me" functionality is useful for seamstresses on that page.

2. **Chat tab in mobile nav — keep for seamstresses?**
   - What we know: Chat is in the nav, but `GlobalChatWrapper` is hidden (`hidden` div). The `/chat` route may not be a real page.
   - Recommendation: Keep `/chat` in seamstress nav if the route exists; skip it otherwise. This can be determined at implementation time.

3. **Should seamstresses be able to update order status (kanban drag)?**
   - What we know: Design decisions don't explicitly address this.
   - Recommendation: Yes — seamstresses should still be able to drag orders to update status (e.g., mark as "done"). This is core to their workflow.

4. **Client name on board cards and modal header — show or hide?**
   - What we know: Design says hide "client contact info" (phone, email). Client name is shown prominently everywhere.
   - Recommendation: Keep client name visible (needed for operational context). Only hide phone/email/history link.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `src/lib/hooks/useCurrentStaff.ts` — `StaffSession` interface, `staffRole` field
- `src/components/staff/staff-session-provider.tsx` — `useStaffSession()` hook
- `src/app/api/staff/verify-pin/route.ts` — role returned from DB (`staff.role || 'seamstress'`)
- `supabase/migrations/0039_set_audrey_admin_role.sql` — role column, values
- `supabase/migrations/0040_add_staff_color_to_orders_rpc.sql` — `p_assigned_seamstress_id` parameter, full RPC implementation
- `src/app/api/orders/route.ts` — current RPC call (does NOT pass `p_assigned_seamstress_id`)
- `src/components/board/order-detail-modal.tsx` — all sections that need hiding (pricing lines ~1074-1184, payment ~1186-1204, client contact ~624-677)
- `src/components/navigation/mobile-bottom-nav.tsx` — hardcoded nav items, no role awareness
- `src/app/calendar/page.tsx` — already has `currentStaff`, task structure
- `src/app/board/workload/page.tsx` — already has `currentStaff`, workload structure
- `src/app/board/page.tsx` — board fetch, export buttons, "Nouvelle Commande" button, filter logic
- `src/app/admin/team/page.tsx` and `src/components/team/team-management-modal.tsx` — `ROLE_OPTIONS` confirms: `seamstress`, `manager`, `admin`
- `src/app/layout.tsx` — `StaffSessionProvider` wraps entire app, `MobileBottomNav` is in layout

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all building blocks confirmed in codebase
- Architecture: HIGH — direct inspection of all relevant files
- Pitfalls: HIGH — identified from real code patterns
- Role system: HIGH — confirmed from DB migrations and admin UI

**Research date:** 2026-02-22
**Valid until:** Stable (no fast-moving dependencies)

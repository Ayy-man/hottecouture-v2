# Remaining Issues - Hotte Couture

**Generated:** 2026-02-01
**Status:** Pre-ship verification

---

## 🔴 MUST FIX BEFORE SHIP

### Issue 1: Search Requires Both Fields (P2)
**Location:** `src/app/status/page.tsx:77-82` and `src/app/api/orders/search/route.ts:14-18`

**Problem:** The order search on the client portal requires BOTH phone number AND last name. Users should be able to search with just one field.

**Current Code (status/page.tsx:77-82):**
```typescript
if (!phoneNumber.trim() || !lastName.trim()) {
  setError('Please enter both phone number and last name');
  return;
}
```

**Current Code (search/route.ts:14-18):**
```typescript
if (!phone || !lastName) {
  return NextResponse.json({
    error: 'Phone number and last name are required'
  }, { status: 400 })
}
```

**Fix Required:**
1. Update frontend validation to allow single field
2. Update API validation to allow single field
3. Note: The API query already uses OR logic (line 28), so backend search works - just validation blocks it

---

## 🟡 REQUIRES MANUAL ACTION (Not Code Changes)

### Issue 3: Anne-Marie and Joe-Anne Not in Team (P4)
**Location:** Database / Admin UI

**Problem:** Anne-Marie and Joe-Anne are not in the staff list. They need to be added via the admin interface.

**Action Required:**
1. Navigate to `/admin/team`
2. Add "Anne-Marie" as a new team member
3. Add "Joe-Anne" as a new team member
4. Ensure both are marked as "Active"

**Note:** The code infrastructure is complete (`src/app/admin/team/page.tsx`), just needs data entry.

---

### Issue 4: Responsive Design Needs Device Testing (P8)
**Locations:** Various components

**Problem:** Responsive classes exist in code but actual iPad/iPhone behavior needs verification.

**Action Required:**
1. Test on iPad in portrait mode - verify stepper/form displays correctly
2. Test on iPhone - verify full order creation flow works
3. Check for horizontal scroll issues on mobile

**Files with responsive styling:**
- `src/components/intake/*.tsx`
- `src/components/board/*.tsx`
- `src/app/page.tsx`

---

## 🟢 VERIFIED FIXED

The following items have been verified at code level:

| Item | Status | Location |
|------|--------|----------|
| Work hours validation removed | ✅ | `stage/route.ts:130-131` |
| UUID bug (shows names not IDs) | ✅ | `garment-services-step.tsx:124-129` |
| Export CSV works | ✅ | `api/admin/export/orders/route.ts` |
| Kanban backward movement | ✅ | `stage/route.ts:22-29` |
| Labels page scrolls | ✅ | `labels/[orderId]/page.tsx:251` |
| Timer/Chrono removed | ✅ | No timer UI in modal |
| Manual time input exists | ✅ | `task-management-modal.tsx:283-299` |
| Estimated time preserved | ✅ | `order-detail-modal.tsx:850-894` |
| Can add team members | ✅ | `admin/team/page.tsx` |
| Item-level assignment | ✅ | `garment-services-step.tsx:877-894` |
| Different seamstresses per item | ✅ | Per-service `assignedSeamstressId` |
| Notes section collapsible | ✅ | `CollapsibleNotes` component |
| Order Status card has icon | ✅ | `page.tsx:136-151` |
| Client portal search button brown | ✅ | `status/page.tsx:259` |
| List/Grid view toggle | ✅ | `board/page.tsx:351-370` |
| Timeline shows bars | ✅ | `gantt.tsx:526-567` |
| Timeline scrolls | ✅ | `gantt.tsx:339` |
| Dashboard icons visible | ✅ | `page.tsx` - Order Status (amber/orange), Portail Client (violet/purple with SVG) |
| Intake stepper mobile-optimized | ✅ | `intake/page.tsx` - Horizontal progress bar on mobile |
| Task assignment API | ✅ | `workload/page.tsx`, `calendar/page.tsx` - Fixed field name mismatch |

---

## Summary

| Priority | Count | Action |
|----------|-------|--------|
| 🔴 Must Fix (Code) | 1 | Search validation |
| 🟡 Manual Action | 2 | Add team members, Device testing |
| 🟢 Verified Fixed | 20 | No action needed |

**Ship Readiness:** Fix the 1 remaining code issue before deployment.

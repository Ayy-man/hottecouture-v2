# Phase 8: Timer Removal - Research

**Researched:** 2026-01-21
**Domain:** React component removal, UI refactoring, database field preservation
**Confidence:** HIGH

## Summary

This phase involves removing a significant stopwatch/timer feature from the application and replacing it with a simple manual time input field. The current timer system is deeply integrated across multiple components (7+ files), API routes (6 endpoints), and database fields (on the `garment` table).

The key insight is that while the **UI components** (TimerButton, ActiveTaskIndicator, etc.) must be removed, the **database fields** (`actual_minutes`, `estimated_minutes`) must be preserved because:
1. The existing `actual_minutes` field stores work time that can be manually entered
2. The `estimated_minutes` field is used for workload planning and should remain
3. Hourly pricing services calculate price based on quantity (1 qty = 1 hour)

**Primary recommendation:** Remove timer UI components and API routes completely, then create a simple manual "Actual Time (minutes)" input that directly writes to the existing `garment.actual_minutes` field.

## Standard Stack

The current implementation uses standard React/Next.js patterns:

### Core (No New Libraries Needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI components | Already in project |
| Next.js | 14.x | API routes | Already in project |
| Supabase | 2.x | Database | Already in project |

### Supporting (Reusable From Existing Code)
| Library | Purpose | Reuse From |
|---------|---------|------------|
| @/components/ui/input | Number input field | Existing Input component |
| @/components/ui/button | Save buttons | Already used throughout |
| zod | Validation | Already used in timer/update |

### No New Dependencies Required
This is a removal task. The replacement UI is simpler than what exists.

## Architecture Patterns

### Current Timer Architecture (TO BE REMOVED)

```
src/
├── components/
│   ├── timer/
│   │   └── timer-button.tsx          # Main stopwatch UI - REMOVE
│   ├── staff/
│   │   ├── active-task-indicator.tsx # Header timer indicator - REMOVE
│   │   └── one-task-warning-modal.tsx # Conflict modal - REMOVE
│   └── tasks/
│       ├── garment-task-summary.tsx  # Uses TimerButton - MODIFY
│       └── task-management-modal.tsx # Uses TimerButton - MODIFY
├── app/
│   ├── api/timer/
│   │   ├── start/route.ts            # REMOVE
│   │   ├── stop/route.ts             # REMOVE
│   │   ├── pause/route.ts            # REMOVE
│   │   ├── resume/route.ts           # REMOVE
│   │   ├── status/route.ts           # REMOVE
│   │   └── update/route.ts           # KEEP (manual time update)
│   └── board/
│       └── page.tsx                  # Uses timer imports - MODIFY
├── lib/
│   ├── timer/
│   │   └── timer-utils.ts            # REMOVE (formatTime can move)
│   └── hooks/
│       └── useActiveTask.ts          # REMOVE
└── tests/
    └── unit/
        └── timer-utils.test.ts       # REMOVE
```

### Recommended Replacement Pattern: Inline Time Input

```typescript
// In GarmentTaskSummary or OrderDetailModal
<div className="flex items-center gap-2">
  <label className="text-sm">Actual Time:</label>
  <Input
    type="number"
    min="0"
    placeholder="Minutes"
    value={actualMinutes}
    onChange={(e) => setActualMinutes(parseInt(e.target.value) || 0)}
    className="w-24"
  />
  <span className="text-sm text-muted-foreground">minutes</span>
</div>
```

### Database Fields to PRESERVE

```
garment table:
├── actual_minutes INTEGER    # KEEP - manual time entry target
├── estimated_minutes INTEGER # KEEP - planning estimate
├── is_active BOOLEAN         # Can remove or leave (unused after)
├── started_at TIMESTAMP      # Can remove or leave (unused after)
├── stopped_at TIMESTAMP      # Can remove or leave (unused after)
├── stage ENUM                # KEEP - still used for workflow
└── assignee VARCHAR          # KEEP - still used for assignments
```

## Don't Hand-Roll

Problems that already have solutions in the codebase:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Number input | Custom input | `@/components/ui/input` | Existing styled component |
| Time validation | Custom logic | Zod schema from timer/update | Already validates 0-999 hours, 0-59 minutes |
| Database update | New endpoint | Modify existing PATCH /api/garment/[id] | Already updates actual_minutes |
| Time formatting | New formatter | Keep formatMinutes() locally | Simple h/m formatting, already exists |

**Key insight:** The existing `PATCH /api/garment/:id` endpoint already accepts `actual_minutes` updates. The timer/update route is redundant with it.

## Common Pitfalls

### Pitfall 1: Breaking Hourly Service Pricing
**What goes wrong:** Removing timer tracking breaks pricing calculation for hourly services
**Why it happens:** Hourly services use actual time to calculate final price
**How to avoid:**
- The pricing calculation uses `service.quantity` not `actual_minutes` for billing
- `actual_minutes` is for recording work done, not calculating prices
- Keep the ability to manually enter actual time
**Warning signs:** Price calculations show $0 for hourly services

### Pitfall 2: Forgetting Console Log Cleanup
**What goes wrong:** Console fills with timer debug logs
**Why it happens:** Timer components have extensive debug logging
**How to avoid:**
- Remove all `console.log('🕐 Timer...')` statements with the components
- Search for timer-related console logs across codebase
**Warning signs:** Console errors about missing timer components

### Pitfall 3: Orphaned Database Columns
**What goes wrong:** Leaving timer state columns causes confusion
**Why it happens:** Columns like `is_active`, `started_at`, `stopped_at` become meaningless
**How to avoid:**
- Option A: Create migration to remove unused columns (cleaner)
- Option B: Document columns as deprecated (faster, less risk)
**Warning signs:** Developers confused by unused columns

### Pitfall 4: Breaking Staff Session Context
**What goes wrong:** ActiveTaskIndicator removal breaks staff header
**Why it happens:** ActiveTaskIndicator may be tightly coupled to header layout
**How to avoid:**
- Check where ActiveTaskIndicator is rendered
- Replace with simpler "no timer" indicator or remove space
- Test staff login/session still works
**Warning signs:** Header layout broken, staff name not showing

### Pitfall 5: Missing Feature Parity for Time Recording
**What goes wrong:** Users can't record actual work time after removal
**Why it happens:** Removing timer without adding manual input
**How to avoid:**
- MUST add manual "Actual Time (minutes)" input field
- Field already exists in OrderDetailModal (Work Hours edit)
- Ensure input is visible and works for all order statuses
**Warning signs:** actual_minutes stays 0 for all orders

## Code Examples

### Example 1: Current Timer Button Usage (TO REMOVE)
```typescript
// Source: src/components/board/order-card.tsx line 239
// This import and component will be removed
import { TimerButton } from '@/components/timer/timer-button';

<TimerButton orderId={order.id} orderStatus={order.status} />
```

### Example 2: Existing Manual Time Edit (TO KEEP/ENHANCE)
```typescript
// Source: src/components/board/order-detail-modal.tsx lines 806-899
// This pattern already exists for editing time manually
const handleStartEditTime = (garmentId: string, currentMinutes: number) => {
  setEditingTimeGarmentId(garmentId);
  setEditingTimeHours(Math.floor(currentMinutes / 60));
  setEditingTimeMinutes(currentMinutes % 60);
};

const handleSaveTime = async (garmentId: string) => {
  const totalMinutes = editingTimeHours * 60 + editingTimeMinutes;
  const response = await fetch(`/api/garment/${garmentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actual_minutes: totalMinutes }),
  });
  // ... handle response
};
```

### Example 3: Simple Minutes Input (RECOMMENDED REPLACEMENT)
```typescript
// New simpler pattern for anywhere time needs to be entered
interface ActualTimeInputProps {
  garmentId: string;
  initialMinutes: number;
  onSave?: (minutes: number) => void;
}

function ActualTimeInput({ garmentId, initialMinutes, onSave }: ActualTimeInputProps) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/garment/${garmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual_minutes: minutes }),
    });
    setSaving(false);
    onSave?.(minutes);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min="0"
        value={minutes}
        onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
        className="w-24"
      />
      <span className="text-sm text-muted-foreground">min</span>
      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? '...' : 'Save'}
      </Button>
    </div>
  );
}
```

### Example 4: API Endpoint Already Handles Time (KEEP)
```typescript
// Source: src/app/api/garment/[id]/route.ts (inferred)
// The PATCH endpoint already accepts actual_minutes
// No new API needed for manual time entry
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Stopwatch with Start/Stop/Pause | Manual time entry | Simpler, no real-time state |
| Per-garment timer tracking | Per-garment manual minutes | Same data, simpler input |
| Active task indicator in header | Remove entirely | Less clutter |
| Timer conflict detection | Remove | Not needed for manual entry |

**Deprecated/outdated:**
- `is_active` column - No longer meaningful without timer
- `started_at` column - No longer meaningful without timer
- `stopped_at` column - No longer meaningful without timer
- Timer API routes (start, stop, pause, resume, status) - No longer needed

## Files to Remove

### Components (DELETE)
1. `src/components/timer/timer-button.tsx` (540 lines)
2. `src/components/staff/active-task-indicator.tsx` (225 lines)
3. `src/components/staff/one-task-warning-modal.tsx` (102 lines)

### API Routes (DELETE)
1. `src/app/api/timer/start/route.ts`
2. `src/app/api/timer/stop/route.ts`
3. `src/app/api/timer/pause/route.ts`
4. `src/app/api/timer/resume/route.ts`
5. `src/app/api/timer/status/route.ts`
6. `src/app/api/timer/update/route.ts` (optional - can keep for legacy)

### Utilities (DELETE)
1. `src/lib/timer/timer-utils.ts` (76 lines)
2. `src/lib/hooks/useActiveTask.ts` (73 lines)

### Tests (DELETE)
1. `tests/unit/timer-utils.test.ts` (191 lines)

## Files to Modify

| File | Change Required |
|------|-----------------|
| `src/components/tasks/garment-task-summary.tsx` | Remove TimerButton import/usage, keep time display |
| `src/components/tasks/task-management-modal.tsx` | Remove TimerButton import/usage |
| `src/components/board/order-card.tsx` | Remove TimerButton import/usage |
| `src/app/board/page.tsx` | Remove timer-related imports if any |
| `src/components/board/order-detail-modal.tsx` | Keep "Work Hours" edit, it already exists |

## Database Considerations

### Fields to Preserve
- `garment.actual_minutes` - Essential for recording work time
- `garment.estimated_minutes` - Essential for planning/workload
- `garment.stage` - Essential for workflow
- `garment.assignee` - Essential for assignments

### Fields That Become Unused
- `garment.is_active` - Timer running state
- `garment.started_at` - Timer start time
- `garment.stopped_at` - Timer pause time

**Recommendation:** Leave unused fields in place (no migration). They don't hurt anything, and removing them adds risk. Document as deprecated in code comments.

### Database Constraint Check
```sql
-- From migration 0005_fix_negative_timer_values.sql
-- These constraints are GOOD to keep:
CHECK (actual_work_minutes >= 0)
-- Ensures manual entry can't be negative
```

## Open Questions

1. **Where should "Actual Time" input appear?**
   - Current: TimerButton appears in order-card, garment-task-summary, task-management-modal
   - Recommendation: Keep only in order-detail-modal (already has it as "Work Hours")
   - Simplify to show in garment-task-summary as read-only with edit button

2. **Should we show Estimate Time alongside Actual Time?**
   - Current: GarmentTaskSummary shows "Planifie" (planned) vs "Reel" (actual)
   - Keep this comparison UI, just remove the timer controls

3. **What about the one-task-per-person enforcement?**
   - Current: Timer prevents working on multiple tasks simultaneously
   - Without timer: No enforcement needed (manual entry doesn't conflict)
   - Decision: Remove the constraint entirely

## Sources

### Primary (HIGH confidence)
- Direct code analysis of existing codebase
- `src/components/timer/timer-button.tsx` - Full timer implementation
- `src/app/api/timer/*/route.ts` - All 6 API endpoints
- `src/components/board/order-detail-modal.tsx` - Existing manual time edit

### Secondary (MEDIUM confidence)
- Database migrations in `supabase/migrations/` - Column definitions
- Test file `tests/unit/timer-utils.test.ts` - Expected behaviors

### No External Sources Needed
This is a pure removal/simplification task working with existing code. No external documentation required.

## Metadata

**Confidence breakdown:**
- File identification: HIGH - Directly verified via grep/glob
- Removal scope: HIGH - All timer files identified
- Modification scope: HIGH - Import analysis complete
- Database impact: HIGH - Migration analysis complete
- Replacement pattern: HIGH - Already exists in order-detail-modal

**Research date:** 2026-01-21
**Valid until:** N/A - This is a one-time removal task, code won't change

# Phase 7: Export Features - Research

**Researched:** 2026-01-20
**Domain:** CSV Export, Team Management, Next.js Client-Side Downloads
**Confidence:** HIGH

## Summary

This phase adds CSV export capabilities for seamstress projects, orders, and weekly capacity, plus a team member management form. The codebase already has a robust export pattern via `WorkListExport` component and `/api/admin/worklist-export` API endpoint that can be extended.

The existing infrastructure provides:
- A working CSV export API pattern with category filtering
- Client-side Blob download mechanism
- Staff management via Supabase `staff` table with `useStaff` hook
- Dropdown menus on the board page for additional actions

**Primary recommendation:** Extend the existing `worklist-export` pattern for new export types. Add export buttons to the board page's existing 3-dot menu. Create a simple staff management form in a new admin route.

## Current Architecture

### Key Components and Locations

| Component | Location | Purpose |
|-----------|----------|---------|
| `WorkListExport` | `/src/components/board/worklist-export.tsx` | Existing export UI pattern |
| `BoardPage` | `/src/app/board/page.tsx` | Main production board with 3-dot menu |
| `AssigneeFilter` | `/src/components/board/assignee-filter.tsx` | Staff selection dropdown pattern |
| `useStaff` | `/src/lib/hooks/useStaff.ts` | Fetches active staff from Supabase |
| Worklist Export API | `/src/app/api/admin/worklist-export/route.ts` | CSV generation pattern |

### Existing 3-Dot Menu Location

The board page already has a dropdown menu (lines 344-368) that contains:
- Workload link
- Archived Orders link

**This is the ideal location for new export options.**

### Data Sources

| Export Type | Data Source | Key Tables |
|-------------|-------------|------------|
| Projects per seamstress | Orders filtered by `assigned_seamstress_id` | order, garment, garment_service, client |
| Orders list | All orders with status | order, client, garment, garment_service |
| Weekly capacity | Staff + orders by due_date | staff, order, garment_service |

## Existing Patterns

### CSV Export Pattern (from worklist-export)

```typescript
// Source: /src/app/api/admin/worklist-export/route.ts

// 1. Query data with nested selects
const { data: orders } = await supabase
  .from('order')
  .select(`
    id, order_number, status, due_date, created_at,
    client:client_id (first_name, last_name, phone, email),
    garments:garment (
      id, type, garment_type_id, color, brand, notes,
      services:garment_service (
        id, quantity, custom_price_cents, notes,
        service:service_id (id, name, category, base_price_cents)
      )
    )
  `);

// 2. Generate CSV headers and rows
const csvHeaders = ['Order Number', 'Client Name', ...];
const csvRows = [];
for (const order of workList.orders) {
  csvRows.push([order.orderNumber, order.client?.name, ...]);
}

// 3. Format CSV content
const csvContent = [
  csvHeaders.join(','),
  ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
].join('\n');

// 4. Return JSON with CSV content
return NextResponse.json({
  success: true,
  csvContent,
  filename: `export-name.csv`
});
```

### Client-Side Download Pattern

```typescript
// Source: /src/components/board/worklist-export.tsx

const handleExport = async () => {
  const response = await fetch(`/api/admin/worklist-export?${params}`);
  const data = await response.json();

  if (data.success) {
    // Create blob and trigger download
    const blob = new Blob([data.csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
};
```

### Staff Data Access Pattern

```typescript
// Source: /src/lib/hooks/useStaff.ts

const { data } = await supabase
  .from('staff')
  .select('id, name, is_active, pin_hash, last_clock_in')
  .eq('is_active', true)
  .order('name');
```

## Data Sources for Each Export

### EXP-01/02: Projects per Seamstress CSV

**Query needed:**
```typescript
// Get garment_services assigned to a specific seamstress
const { data } = await supabase
  .from('garment_service')
  .select(`
    id,
    quantity,
    notes,
    estimated_minutes,
    garment:garment_id (
      id, type, color, brand,
      order:order_id (
        id, order_number, status, due_date,
        client:client_id (first_name, last_name)
      )
    ),
    service:service_id (name)
  `)
  .eq('assigned_seamstress_id', seamstressId);
```

**Required CSV Columns (EXP-02):**
- Client (client.first_name + client.last_name)
- Order# (order.order_number)
- Item (garment.type)
- Service (service.name or custom_service_name)
- Status (order.status)
- Due (order.due_date)
- Est Time (garment_service.estimated_minutes or service.estimated_minutes)
- Actual Time (from order.total_work_seconds or task.actual_minutes)

### EXP-03: Orders List CSV

**Query needed:** Use existing `/api/admin/worklist-export` pattern but remove `status: 'working'` filter.

### EXP-04: Weekly Capacity CSV

**Query needed:**
```typescript
// Get staff with their assigned work for the week
const { data: staff } = await supabase.from('staff').select('*');

// Get orders due this week with assignments
const { data: orders } = await supabase
  .from('order')
  .select(`
    id, order_number, due_date, status,
    garments:garment (
      services:garment_service (
        assigned_seamstress_id,
        estimated_minutes,
        service:service_id (estimated_minutes)
      )
    )
  `)
  .gte('due_date', weekStart)
  .lte('due_date', weekEnd);
```

## UI Locations

### Where to Add Export Buttons

1. **Seamstress Export (EXP-01):** Add to AssigneeFilter dropdown, or as a button that appears when an assignee is selected on the board page.

2. **Orders/Capacity Export (EXP-03, EXP-04):** Add to existing 3-dot DropdownMenu on board page header.

**Current 3-dot menu structure:**
```tsx
// /src/app/board/page.tsx lines 344-368
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant='outline' size='sm'>
      <MoreHorizontal className='w-4 h-4' />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align='end'>
    <DropdownMenuItem asChild>
      <Link href='/board/workload'>Workload</Link>
    </DropdownMenuItem>
    <DropdownMenuItem asChild>
      <Link href='/archived'>Archived Orders</Link>
    </DropdownMenuItem>
    {/* ADD NEW EXPORT OPTIONS HERE */}
  </DropdownMenuContent>
</DropdownMenu>
```

### Team Management Form (EXP-05, EXP-06)

**Location options:**
1. New route: `/admin/team` - Consistent with existing `/admin/pricing` and `/admin/measurements`
2. Modal accessible from board settings

**Recommended:** Create `/src/app/admin/team/page.tsx`

## Implementation Approach

### Standard Stack

| Library | Version | Purpose | Already Installed |
|---------|---------|---------|-------------------|
| Supabase | latest | Data queries | Yes |
| date-fns | 2.x | Date formatting for filenames | Yes |
| lucide-react | latest | Icons (Download, Users) | Yes |

No new libraries needed - all functionality can be built with existing dependencies.

### Recommended File Structure

```
src/
  app/
    api/
      admin/
        export/
          seamstress/route.ts    # EXP-01/02
          orders/route.ts        # EXP-03
          capacity/route.ts      # EXP-04
        team/route.ts            # Staff CRUD API
    admin/
      team/page.tsx              # EXP-05/06
  components/
    exports/
      export-menu.tsx            # Dropdown with all export options
      seamstress-export.tsx      # Seamstress-specific export UI
  lib/
    exports/
      csv-utils.ts               # Shared CSV generation helpers
```

### Export Utility Pattern

```typescript
// /src/lib/exports/csv-utils.ts

export function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsv(headers: string[], rows: any[][]): string {
  return [
    headers.join(','),
    ...rows.map(row => row.map(escapeCsvCell).join(','))
  ].join('\n');
}

export function triggerDownload(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV escaping | Custom string handling | `escapeCsvCell` utility with proper quote handling | Edge cases with commas, quotes, newlines |
| File download | Form submission | Blob + createObjectURL | Works client-side, no server storage needed |
| Staff CRUD | Raw Supabase calls | Standard API route pattern | Consistent with existing codebase |

## Common Pitfalls

### Pitfall 1: CSV Special Characters

**What goes wrong:** Unescaped commas, quotes, or newlines break CSV parsing
**Why it happens:** Directly joining values without escaping
**How to avoid:** Always wrap values that contain special characters in double quotes, and escape internal quotes
**Warning signs:** Excel shows garbled data or wrong column alignment

### Pitfall 2: Missing Time Data

**What goes wrong:** Export shows "0" or empty for actual time
**Why it happens:** Time tracked at order level (`total_work_seconds`) vs task level (`actual_minutes`) inconsistently
**How to avoid:** Check both `order.total_work_seconds` and `garment.actual_minutes` when calculating actual time
**Warning signs:** All actual times show as zero despite timer usage

### Pitfall 3: Filename Encoding

**What goes wrong:** Seamstress names with accents (French names) break filenames
**Why it happens:** Unicode characters in filenames
**How to avoid:** Sanitize filenames: remove/replace accented characters, spaces with underscores
**Warning signs:** Download fails or file appears with garbled name

### Pitfall 4: Empty Export

**What goes wrong:** User exports when no data matches filter
**Why it happens:** No validation before export
**How to avoid:** Check data length before generating CSV, show user-friendly message if empty
**Warning signs:** Downloaded file is empty or contains only headers

## Code Examples

### Seamstress Export API

```typescript
// /src/app/api/admin/export/seamstress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const seamstressId = searchParams.get('seamstressId');

  if (!seamstressId) {
    return NextResponse.json({ error: 'seamstressId required' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  // Get seamstress name for filename
  const { data: staff } = await supabase
    .from('staff')
    .select('name')
    .eq('id', seamstressId)
    .single();

  // Get assigned work
  const { data: assignments } = await supabase
    .from('garment_service')
    .select(`
      id, quantity, notes, estimated_minutes,
      garment:garment_id (
        id, type, color, actual_minutes,
        order:order_id (
          id, order_number, status, due_date, total_work_seconds,
          client:client_id (first_name, last_name)
        )
      ),
      service:service_id (name, estimated_minutes)
    `)
    .eq('assigned_seamstress_id', seamstressId);

  // Build CSV
  const headers = ['Client', 'Order#', 'Item', 'Service', 'Status', 'Due', 'Est Time', 'Actual Time'];
  const rows = assignments?.map(a => {
    const order = a.garment?.order;
    const client = order?.client;
    const estMinutes = a.estimated_minutes || a.service?.estimated_minutes || 0;
    const actualMinutes = a.garment?.actual_minutes || Math.floor((order?.total_work_seconds || 0) / 60);

    return [
      client ? `${client.first_name} ${client.last_name}` : '',
      order?.order_number || '',
      a.garment?.type || '',
      a.service?.name || 'Custom',
      order?.status || '',
      order?.due_date ? format(new Date(order.due_date), 'yyyy-MM-dd') : '',
      estMinutes ? `${Math.floor(estMinutes / 60)}h ${estMinutes % 60}m` : '',
      actualMinutes ? `${Math.floor(actualMinutes / 60)}h ${actualMinutes % 60}m` : ''
    ];
  }) || [];

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const safeName = (staff?.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `projects_${safeName}_${format(new Date(), 'yyyy-MM-dd')}.csv`;

  return NextResponse.json({ success: true, csvContent, filename });
}
```

### Staff Management Form

```typescript
// /src/app/admin/team/page.tsx (partial)
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TeamPage() {
  const [staff, setStaff] = useState([]);
  const [newName, setNewName] = useState('');

  const handleAddStaff = async () => {
    const res = await fetch('/api/admin/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });
    if (res.ok) {
      // Refresh list
      fetchStaff();
      setNewName('');
    }
  };

  return (
    <div>
      <h1>Team Management</h1>
      <div className="flex gap-2 mb-4">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Team member name"
        />
        <Button onClick={handleAddStaff}>Add</Button>
      </div>
      {/* List existing staff with edit/deactivate options */}
    </div>
  );
}
```

## Key Files to Modify

| File | Modification |
|------|--------------|
| `/src/app/board/page.tsx` | Add export options to 3-dot menu |
| `/src/components/board/assignee-filter.tsx` | Add "Export" option when seamstress selected |

## Key Files to Create

| File | Purpose |
|------|---------|
| `/src/app/api/admin/export/seamstress/route.ts` | Seamstress projects export API |
| `/src/app/api/admin/export/orders/route.ts` | Orders list export API |
| `/src/app/api/admin/export/capacity/route.ts` | Weekly capacity export API |
| `/src/app/api/admin/team/route.ts` | Staff CRUD operations |
| `/src/app/admin/team/page.tsx` | Team management UI |
| `/src/lib/exports/csv-utils.ts` | Shared CSV utilities |

## Database Schema Reference

### staff table
```
id: string (uuid)
name: string
is_active: boolean
pin_hash: string | null
last_clock_in: string | null
created_at: string
```

### garment_service table (for assignments)
```
id: string (uuid)
garment_id: string (fk -> garment)
service_id: string | null (fk -> service)
custom_service_name: string | null
quantity: number
estimated_minutes: number | null  -- Item-level override
assigned_seamstress_id: string | null (fk -> staff)
```

### order table (for time tracking)
```
total_work_seconds: number | null
actual_work_minutes: number | null
is_timer_running: boolean
```

## Open Questions

None - all requirements are clear and can be implemented with existing patterns.

## Sources

### Primary (HIGH confidence)
- `/src/components/board/worklist-export.tsx` - Existing export component pattern
- `/src/app/api/admin/worklist-export/route.ts` - Existing export API pattern
- `/src/lib/types/database.ts` - Complete database schema
- `/src/lib/hooks/useStaff.ts` - Staff data access pattern
- `/src/app/board/page.tsx` - Board UI with 3-dot menu

### Secondary (MEDIUM confidence)
- `/src/app/api/order/[id]/details/route.ts` - Detailed order query with time tracking

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use
- Architecture: HIGH - Following existing patterns exactly
- Data access: HIGH - Schema fully documented in codebase
- Pitfalls: MEDIUM - Based on common CSV export issues

**Research date:** 2026-01-20
**Valid until:** 60 days (stable patterns, no external dependencies)

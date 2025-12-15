# Staff Management & Global Chatbot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dynamic staff management (add/remove employees) and make the internal chatbot accessible from all pages.

**Architecture:**
- New `staff` table in Supabase with simple name + active status
- Settings page at `/admin/staff` for CRUD operations
- Replace all hardcoded staff arrays with API calls
- Move `InternalChat` component to root layout for global access

**Tech Stack:** Next.js 14, Supabase, React, Tailwind CSS

---

## Task 1: Create Staff Database Table

**Files:**
- Create: `supabase/migrations/0021_add_staff_table.sql`

**Step 1: Write migration file**

```sql
-- Create staff table for dynamic employee management
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for active staff queries
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);

-- Seed with existing staff
INSERT INTO staff (name, is_active) VALUES
  ('Audrey', true),
  ('Solange', true),
  ('Audrey-Anne', true);

-- Add RLS policies
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read staff
CREATE POLICY "Staff readable by authenticated users"
  ON staff FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to manage staff (owner check would go in app layer)
CREATE POLICY "Staff manageable by authenticated users"
  ON staff FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

**Step 2: Apply migration**

Run: `npx supabase db push`

Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/0021_add_staff_table.sql
git commit -m "feat: add staff table for dynamic employee management"
```

---

## Task 2: Create Staff API Endpoints

**Files:**
- Create: `src/app/api/staff/route.ts`

**Step 1: Create GET and POST endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/staff - List all staff (optionally filter by active)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') !== 'false';

  let query = supabase
    .from('staff')
    .select('id, name, is_active, created_at')
    .order('name');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staff: data });
}

// POST /api/staff - Create new staff member
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('staff')
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staff: data }, { status: 201 });
}
```

**Step 2: Verify endpoint compiles**

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/staff/route.ts
git commit -m "feat: add GET/POST staff API endpoints"
```

---

## Task 3: Create Staff Individual API Endpoint

**Files:**
- Create: `src/app/api/staff/[id]/route.ts`

**Step 1: Create PATCH and DELETE endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH /api/staff/[id] - Update staff member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const updates: { name?: string; is_active?: boolean } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('staff')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staff: data });
}

// DELETE /api/staff/[id] - Delete staff member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 2: Verify endpoint compiles**

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/staff/[id]/route.ts
git commit -m "feat: add PATCH/DELETE staff API endpoints"
```

---

## Task 4: Create useStaff Hook

**Files:**
- Create: `src/lib/hooks/useStaff.ts`

**Step 1: Create reusable hook for fetching staff**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';

export interface StaffMember {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export function useStaff(activeOnly: boolean = true) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/staff?active=${activeOnly}`);
      if (!response.ok) {
        throw new Error('Failed to fetch staff');
      }
      const data = await response.json();
      setStaff(data.staff || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const addStaff = async (name: string): Promise<StaffMember | null> => {
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error('Failed to add staff');
      }

      const data = await response.json();
      await fetchStaff();
      return data.staff;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  const updateStaff = async (
    id: string,
    updates: { name?: string; is_active?: boolean }
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update staff');
      }

      await fetchStaff();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const deleteStaff = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete staff');
      }

      await fetchStaff();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  return {
    staff,
    loading,
    error,
    refetch: fetchStaff,
    addStaff,
    updateStaff,
    deleteStaff,
  };
}
```

**Step 2: Verify hook compiles**

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/hooks/useStaff.ts
git commit -m "feat: add useStaff hook for staff management"
```

---

## Task 5: Create Staff Management Page

**Files:**
- Create: `src/app/admin/staff/page.tsx`

**Step 1: Create staff management UI**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useStaff } from '@/lib/hooks/useStaff';
import { AuthGuard } from '@/components/auth/auth-guard';
import { LoadingLogo } from '@/components/ui/loading-logo';
import { ArrowLeft, Plus, Trash2, UserCheck, UserX } from 'lucide-react';
import Link from 'next/link';

export default function StaffManagementPage() {
  const { staff, loading, error, addStaff, updateStaff, deleteStaff } = useStaff(false);
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    await addStaff(newName.trim());
    setNewName('');
    setIsAdding(false);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await updateStaff(id, { is_active: !currentActive });
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      await deleteStaff(id);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingLogo size="lg" text="Loading staff..." />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="mb-6">
            <Link href="/board">
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Board
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Staff Management</h1>
            <p className="text-gray-600">Add or remove team members</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Add New Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                  disabled={isAdding}
                />
                <Button onClick={handleAdd} disabled={isAdding || !newName.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Staff ({staff.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No staff members yet</p>
              ) : (
                <div className="space-y-2">
                  {staff.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        member.is_active ? 'bg-white' : 'bg-gray-100 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            member.is_active ? 'bg-primary' : 'bg-gray-400'
                          }`}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-gray-500">
                            {member.is_active ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(member.id, member.is_active)}
                          title={member.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {member.is_active ? (
                            <UserX className="h-4 w-4 text-amber-500" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(member.id, member.name)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
```

**Step 2: Verify page compiles**

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/admin/staff/page.tsx
git commit -m "feat: add staff management page at /admin/staff"
```

---

## Task 6: Update Assignment Step Component

**Files:**
- Modify: `src/components/intake/assignment-step.tsx`

**Step 1: Replace hardcoded SEAMSTRESSES with useStaff hook**

Replace the entire file content with:

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStaff } from '@/lib/hooks/useStaff';
import { Loader2 } from 'lucide-react';

interface AssignmentStepProps {
  selectedAssignee: string | null;
  onAssigneeChange: (assignee: string) => void;
  onNext: () => void;
  onPrev: () => void;
  isSubmitting?: boolean;
}

export function AssignmentStep({
  selectedAssignee,
  onAssigneeChange,
  onNext,
  onPrev,
  isSubmitting = false,
}: AssignmentStepProps) {
  const { staff, loading } = useStaff(true);

  return (
    <div className='h-full flex flex-col overflow-hidden min-h-0'>
      {/* iOS-style Header */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0'>
        <div className='w-1/3'>
          <Button
            onClick={onPrev}
            variant='ghost'
            className='text-primary-600 hover:text-primary-800 p-0'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-5 w-5 mr-1'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
            Retour
          </Button>
        </div>
        <h2 className='text-lg font-semibold text-gray-900'>
          Assigner la commande
        </h2>
        <div className='w-1/3 flex justify-end'>
          <Button
            onClick={onNext}
            disabled={!selectedAssignee || isSubmitting}
            className='bg-gradient-to-r from-primary-500 to-accent-clay hover:from-primary-600 hover:to-accent-clay text-white px-4 py-2 rounded-lg font-medium'
          >
            {isSubmitting ? 'Création...' : 'Créer la commande'}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className='flex-1 overflow-y-auto p-4 bg-gray-50 min-h-0'>
        <div className='max-w-md mx-auto space-y-4'>
          <div className='text-center mb-6'>
            <p className='text-sm text-gray-600'>
              Qui travaillera sur cette commande?
            </p>
          </div>

          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-primary' />
            </div>
          ) : (
            <div className='space-y-3'>
              {staff.map((member) => {
                const isSelected = selectedAssignee === member.name;

                return (
                  <Card
                    key={member.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'ring-2 ring-primary shadow-lg scale-102'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => onAssigneeChange(member.name)}
                  >
                    <CardContent className='p-4'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-3'>
                          <div className='w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-2xl font-semibold text-primary'>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className='font-semibold text-gray-900'>{member.name}</h3>
                            <p className='text-sm text-gray-500'>Staff</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className='w-6 h-6 rounded-full bg-primary flex items-center justify-center'>
                            <svg
                              className='w-4 h-4 text-white'
                              fill='currentColor'
                              viewBox='0 0 20 20'
                            >
                              <path
                                fillRule='evenodd'
                                d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                                clipRule='evenodd'
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!loading && staff.length === 0 && (
            <p className='text-center text-sm text-amber-600 mt-4'>
              No staff members available. Add staff in Settings.
            </p>
          )}

          {!selectedAssignee && staff.length > 0 && (
            <p className='text-center text-sm text-amber-600 mt-4'>
              Veuillez sélectionner une couturière pour continuer
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify compiles**

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit**

```bash
git add src/components/intake/assignment-step.tsx
git commit -m "refactor: use dynamic staff list in assignment step"
```

---

## Task 7: Update Workload Page

**Files:**
- Modify: `src/app/board/workload/page.tsx:20`

**Step 1: Replace hardcoded SEAMSTRESSES with useStaff**

Add import at top of file:
```typescript
import { useStaff } from '@/lib/hooks/useStaff';
```

Remove line 20:
```typescript
const SEAMSTRESSES = ['Audrey', 'Solange', 'Audrey-Anne', 'Unassigned'];
```

Inside the component function, after the existing useState hooks (around line 76), add:
```typescript
const { staff: staffMembers } = useStaff(true);
const SEAMSTRESSES = [...staffMembers.map(s => s.name), 'Unassigned'];
```

**Step 2: Verify compiles**

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/board/workload/page.tsx
git commit -m "refactor: use dynamic staff list in workload page"
```

---

## Task 8: Add Global Chatbot to Layout

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/chat/global-chat-wrapper.tsx`

**Step 1: Create wrapper component that only shows for authenticated users**

Create `src/components/chat/global-chat-wrapper.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { InternalChat } from './internal-chat';

// Pages where chat should NOT appear
const EXCLUDED_PATHS = ['/portal', '/embed', '/login', '/auth'];

export function GlobalChatWrapper() {
  const [showChat, setShowChat] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const path = window.location.pathname;
    const isExcluded = EXCLUDED_PATHS.some(p => path.startsWith(p));
    setShowChat(!isExcluded);
  }, [mounted]);

  if (!mounted || !showChat) return null;

  return <InternalChat />;
}
```

**Step 2: Add GlobalChatWrapper to layout.tsx**

Add import:
```typescript
import { GlobalChatWrapper } from '@/components/chat/global-chat-wrapper';
```

Add component inside AuthProvider, after the closing `</div>` of the grid and before `</NavigationProvider>`:

```typescript
<GlobalChatWrapper />
```

**Step 3: Remove InternalChat from board/page.tsx**

In `src/app/board/page.tsx`:
- Remove import: `import { InternalChat } from '@/components/chat/internal-chat';`
- Remove the component: `<InternalChat />` (around line 343)

**Step 4: Verify compiles**

Run: `npm run type-check`

Expected: No errors

**Step 5: Commit**

```bash
git add src/components/chat/global-chat-wrapper.tsx src/app/layout.tsx src/app/board/page.tsx
git commit -m "feat: make chatbot available globally across all pages"
```

---

## Task 9: Add Settings Link to Navigation

**Files:**
- Modify: `src/app/board/page.tsx` (add link to staff settings)

**Step 1: Add Settings link in header**

In `src/app/board/page.tsx`, add import:
```typescript
import { Settings } from 'lucide-react';
```

Add a Settings button in the header section (around line 304, after ArchiveButton):
```typescript
<Button
  variant='outline'
  asChild
  className='hidden sm:flex border-stone-300 hover:bg-stone-50 hover:text-stone-900'
>
  <Link href='/admin/staff' className='flex items-center gap-2'>
    <Settings className='w-4 h-4' />
    <span>Staff</span>
  </Link>
</Button>
```

**Step 2: Verify compiles**

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/board/page.tsx
git commit -m "feat: add staff settings link to board header"
```

---

## Task 10: Final Verification

**Step 1: Run full type check**

Run: `npm run type-check`

Expected: No errors

**Step 2: Run build**

Run: `npm run build`

Expected: Build succeeds

**Step 3: Test locally**

Run: `npm run dev`

Manual tests:
1. Navigate to `/admin/staff` - should see staff management page
2. Add a new staff member - should appear in list
3. Navigate to `/intake` and go to assignment step - should see new staff member
4. Navigate to `/board/workload` - should see new staff in workload cards
5. Chatbot button should appear on all pages except `/portal` and `/embed`

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete staff management and global chatbot implementation"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/migrations/0021_add_staff_table.sql` | New: staff table |
| `src/app/api/staff/route.ts` | New: GET/POST endpoints |
| `src/app/api/staff/[id]/route.ts` | New: PATCH/DELETE endpoints |
| `src/lib/hooks/useStaff.ts` | New: reusable hook |
| `src/app/admin/staff/page.tsx` | New: management UI |
| `src/components/intake/assignment-step.tsx` | Modified: use dynamic staff |
| `src/app/board/workload/page.tsx` | Modified: use dynamic staff |
| `src/components/chat/global-chat-wrapper.tsx` | New: wrapper for global chat |
| `src/app/layout.tsx` | Modified: add global chat |
| `src/app/board/page.tsx` | Modified: remove local chat, add settings link |

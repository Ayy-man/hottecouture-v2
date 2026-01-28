# Phase 3: Merge Garment/Service Steps - Research

**Researched:** 2026-01-20
**Domain:** Intake flow UI/UX - React component architecture
**Confidence:** HIGH

## Summary

This research documents the current order intake flow architecture and provides a clear path to merge the GarmentsStep and ServicesStepNew components into a single unified step. The goal is to reduce page navigation by allowing users to select a garment type, add services, and optionally assign a seamstress all on one page before adding to the order.

The current flow has 6 distinct steps (Client -> Pipeline -> Garments -> Services -> Pricing -> Assignment). The merge will eliminate the separate "Garments" step by integrating garment type selection into the Services step. The existing assignment logic from Phase 1 (item-level assignment via `assignedSeamstressId` on each service) will be surfaced directly in the merged page via a dropdown.

**Primary recommendation:** Create a new `GarmentServicesStep` component that combines garment type selection with service selection, adding an assignment dropdown per service item. Keep the "Add to Order" pattern where a garment is fully configured before being added to the order list.

## Current Intake Flow Architecture

### Step Sequence

```
IntakePage (main wizard controller)
  |
  |-- Step 1: ClientStep       -- Select/create customer
  |-- Step 2: PipelineSelector -- Choose alteration vs custom
  |-- Step 3: GarmentsStep     -- Add garment (type, photo, notes)
  |-- Step 4: ServicesStepNew  -- Select services for each garment
  |-- Step 5: PricingStep      -- Due date, rush, deposit, totals
  |-- Step 6: AssignmentStep   -- Assign seamstress per item
  |
  |-- Summary: OrderSummary    -- Confirmation after submit
```

### Step Types Defined

```typescript
// From intake/page.tsx line 16-23
type IntakeStep =
  | 'pipeline'
  | 'client'
  | 'garments'
  | 'services'
  | 'pricing'
  | 'assignment'
  | 'summary';
```

### State Management

All intake data is managed in the parent `IntakePage` via React useState:

```typescript
// From intake/page.tsx line 25-61
interface IntakeFormData {
  client: { ... } | null;
  measurements?: MeasurementsData | undefined;
  garments: Array<{
    type: string;
    garment_type_id?: string | null;
    color?: string;
    brand?: string;
    notes?: string;
    labelCode: string;
    services: Array<{
      serviceId: string;
      serviceName?: string;
      qty: number;
      customPriceCents?: number;
      assignedSeamstressId?: string | null;  // Per-item assignment from Phase 1
    }>;
  }>;
  order: {
    type: 'alteration' | 'custom';
    due_date?: string;
    rush: boolean;
    ...
  };
}
```

**Key Insight:** Assignment is already per-item via `assignedSeamstressId` on each service within a garment. Phase 1 already established this pattern. The current AssignmentStep just provides a UI to set these values after services are selected.

## Component Analysis

### GarmentsStep

**File:** `/src/components/intake/garments-step.tsx` (~1027 lines)

**Purpose:** Add garment entries with type selection, optional photo, and notes.

**Key State:**
```typescript
const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
const [groupedTypes, setGroupedTypes] = useState<Record<string, GarmentType[]>>({});
const [currentGarment, setCurrentGarment] = useState<Partial<Garment>>({
  type: '',
  garment_type_id: null,
  notes: '',
  labelCode: nanoid(8).toUpperCase(),
  photo_path: null,
  services: [],
});
const [showAddForm, setShowAddForm] = useState(false);
```

**Data Flow:**
- Fetches garment types from `/api/garment-types`
- Groups them by category
- User selects type from dropdown, adds notes/photo
- "Add Garment" creates entry with empty `services: []`
- Props: `data`, `onUpdate(garments)`, `onNext`, `onPrev`

**UI Pattern:**
- Custom dropdown with category groupings
- Inline CRUD for custom garment types
- Photo capture capability
- List of added garments with remove option

### ServicesStepNew

**File:** `/src/components/intake/services-step-new.tsx` (~2000+ lines)

**Purpose:** Select services for each garment that was added.

**Key State:**
```typescript
const [services, setServices] = useState<Service[]>([]);
const [categories, setCategories] = useState<Category[]>([]);
const [activeTab, setActiveTab] = useState<string>('');
const [activeGarmentIndex, setActiveGarmentIndex] = useState(0);
const [searchTerm, setSearchTerm] = useState('');
```

**Data Flow:**
- Fetches services from Supabase `service` table
- Filters by category based on `orderType`
- User selects garment from tabs (if multiple)
- User clicks services to add to selected garment
- Each service gets `serviceName` stored for display in AssignmentStep
- Props: `data`, `onUpdate(garments)`, `onNext`, `onPrev`, `orderType`, `client`, `onChangeCustomer`

**UI Pattern:**
- Horizontal garment tabs (if multiple garments)
- Category tabs as grid
- Service list per category
- Quantity controls per service
- Inline price editing
- Search/filter
- Custom service addition via CRUD inline

**Critical Functions to Preserve:**
- `addServiceToGarment(garmentIndex, serviceId)` - handles zip selection modal
- `updateServiceQuantity(garmentIndex, serviceId, qty)`
- `removeServiceFromGarment(garmentIndex, serviceId)`
- `updateServicePrice(garmentIndex, serviceId, newPriceCents)`
- Service filtering by category
- Custom service CRUD

### AssignmentStep

**File:** `/src/components/intake/assignment-step.tsx` (~195 lines)

**Purpose:** Assign seamstress to each service item before final submission.

**Key Pattern:**
```typescript
interface AssignmentItem {
  garmentIndex: number;
  garmentType: string;
  serviceIndex: number;
  serviceName: string;
  assignedSeamstressId: string | null;
}

// Uses useStaff() hook to get staff list
const { staff, loading } = useStaff();
```

**UI Pattern:**
- List of all garment/service pairs
- Select dropdown per item with staff options
- "Assign All" quick action
- Passes back to parent via `onItemAssignmentChange(garmentIndex, serviceIndex, seamstressId)`

### useStaff Hook

**File:** `/src/lib/hooks/useStaff.ts`

**Purpose:** Fetches active staff from Supabase `staff` table.

```typescript
export interface StaffMember {
  id: string;
  name: string;
  is_active: boolean;
  pin_hash?: string;
  last_clock_in?: string;
}

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  ...
  return { staff, loading, error };
}
```

**Usage:** Direct import and call. No configuration needed.

## Standard Stack

The existing components already use the established patterns:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Already used |
| Supabase JS | 2.x | Database client | Already used |
| nanoid | 3.x | Unique ID generation | Already used for labelCode |
| lucide-react | 0.x | Icons | Already used |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @/components/ui/button | local | Button component | Standard buttons |
| @/components/ui/card | local | Card layout | Card containers |
| @/components/ui/select | local | Dropdown select | Staff assignment dropdown |

## Architecture Patterns

### Recommended Approach: Combined Component

Create a new `GarmentServicesStep` that follows this pattern:

```
GarmentServicesStep
  |
  |-- [Left Panel] Current Garment Configuration
  |     |-- Garment Type Dropdown (from GarmentsStep)
  |     |-- Photo Capture (from GarmentsStep)
  |     |-- Notes Field (from GarmentsStep)
  |
  |-- [Right/Main Panel] Service Selection
  |     |-- Category Tabs (from ServicesStepNew)
  |     |-- Service Grid/List (from ServicesStepNew)
  |     |-- Search Bar (from ServicesStepNew)
  |
  |-- [Bottom] Current Item Summary
  |     |-- Selected Services List
  |     |-- Per-service: Qty, Price, Assignment Dropdown
  |     |-- "Add to Order" Button
  |
  |-- [Top/Side] Order Items List
        |-- Previously added garments
        |-- Can remove items
```

### Pattern 1: Inline Assignment During Service Add

When a service is added to the current garment, show assignment dropdown immediately:

```typescript
// Example structure for selected service display
interface SelectedServiceDisplay {
  serviceId: string;
  serviceName: string;
  qty: number;
  customPriceCents: number;
  assignedSeamstressId: string | null;
}

// In the selected services list, each row shows:
// [Service Name] [Qty Controls] [Price] [Assignment Dropdown]
```

### Pattern 2: State Management

Keep parent as single source of truth. New component receives same props:

```typescript
interface GarmentServicesStepProps {
  data: Garment[];                    // All garments in order
  onUpdate: (garments: Garment[]) => void;
  onNext: () => void;
  onPrev: () => void;
  orderType: 'alteration' | 'custom';
  client?: ClientCreate | null;
  onChangeCustomer?: () => void;
}
```

### Pattern 3: Two-Phase Garment Creation

1. **Configuration Phase:** User selects garment type, adds notes, selects services
2. **Commit Phase:** User clicks "Add to Order" which moves configured garment to `data` array

```typescript
// Current garment being configured (not yet in data array)
const [currentGarment, setCurrentGarment] = useState<Partial<Garment>>({
  type: '',
  garment_type_id: null,
  notes: '',
  labelCode: nanoid(8).toUpperCase(),
  photo_path: null,
  services: [],
});

// When "Add to Order" clicked:
const handleAddToOrder = () => {
  if (!currentGarment.garment_type_id || currentGarment.services.length === 0) {
    return; // Validation
  }
  onUpdate([...data, currentGarment as Garment]);
  // Reset for next garment
  setCurrentGarment({
    type: '',
    garment_type_id: null,
    notes: '',
    labelCode: nanoid(8).toUpperCase(),
    photo_path: null,
    services: [],
  });
};
```

### Anti-Patterns to Avoid

- **Separate state for services and garments:** Keep unified in `currentGarment.services`
- **Complex multi-step within single component:** Use clear sections, not nested wizards
- **Removing AssignmentStep entirely:** Keep AssignmentStep as optional review step for bulk assignment; inline assignment is additive

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Staff dropdown | Custom fetch logic | `useStaff()` hook | Already handles Supabase query, loading state |
| Garment type dropdown | New dropdown | Port existing from GarmentsStep | Complex with category grouping, CRUD, custom types |
| Service selection | New grid | Port existing from ServicesStepNew | Has search, filtering, zip modal, inline CRUD |
| Price formatting | Manual formatting | `formatCurrency()` from pricing lib | Consistent currency display |
| Unique IDs | Custom function | `nanoid(8).toUpperCase()` | Already pattern for labelCode |

## Common Pitfalls

### Pitfall 1: Breaking the Services Array Structure

**What goes wrong:** Services in garment have specific shape expected by intake API and AssignmentStep.

**Why it happens:** Forgetting to include `serviceName` when adding service.

**How to avoid:** Always include serviceName when adding to `services` array:

```typescript
garment.services.push({
  serviceId,
  qty: 1,
  customPriceCents: service.base_price_cents,
  serviceName: service.name,  // Required for AssignmentStep display
  assignedSeamstressId: null, // Optional, can be set inline
});
```

**Warning signs:** AssignmentStep shows "Service" instead of actual names.

### Pitfall 2: Losing Zip Selection Modal Logic

**What goes wrong:** Certain services (zip changes) trigger a modal to select accompanying zip type.

**Why it happens:** Copy-pasting service add without the modal check.

**How to avoid:** Port `serviceRequiresZipSelection()` and `handleZipSelection()` functions from ServicesStepNew.

**Warning signs:** Zip-related services don't prompt for zip type selection.

### Pitfall 3: Not Resetting Current Garment After Add

**What goes wrong:** After adding garment to order, form shows old data.

**Why it happens:** Not clearing `currentGarment` state after commit.

**How to avoid:** Generate new labelCode and reset all fields after "Add to Order":

```typescript
setCurrentGarment({
  type: '',
  garment_type_id: null,
  notes: '',
  labelCode: nanoid(8).toUpperCase(),  // NEW code
  photo_path: null,
  services: [],
});
```

### Pitfall 4: Assignment Dropdown Value Handling

**What goes wrong:** Select component expects string value but assignment can be null.

**Why it happens:** Empty/null handling in Select component.

**How to avoid:** Use empty string for "Unassigned" and handle conversion:

```typescript
<Select
  value={service.assignedSeamstressId || ''}
  onValueChange={(val) => handleAssignmentChange(serviceIndex, val || null)}
>
  <SelectItem value="">Non assigne</SelectItem>
  {staff.map(s => (
    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
  ))}
</Select>
```

## Code Examples

### Adding Staff Assignment Dropdown to Service Item

```typescript
// Source: Adapted from assignment-step.tsx pattern
import { useStaff } from '@/lib/hooks/useStaff';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Inside component:
const { staff, loading: staffLoading } = useStaff();

// For each selected service in currentGarment:
<Select
  value={service.assignedSeamstressId || ''}
  onValueChange={(val) => {
    const updated = { ...currentGarment };
    const svc = updated.services.find(s => s.serviceId === service.serviceId);
    if (svc) {
      svc.assignedSeamstressId = val || null;
    }
    setCurrentGarment(updated);
  }}
>
  <SelectTrigger className="w-32">
    <SelectValue placeholder="Assign" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">Non assigne</SelectItem>
    {staff.map(s => (
      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Merged Step Navigation Update

```typescript
// In intake/page.tsx, update step sequence:
const steps: Array<{ key: IntakeStep; title: string; description: string }> = useMemo(
  () => [
    { key: 'client', title: 'Client', description: 'Client information' },
    { key: 'pipeline', title: 'Service Type', description: 'Alteration or custom' },
    // MERGED: 'garments' and 'services' become single step
    { key: 'garment-services', title: 'Items', description: 'Add garments and services' },
    { key: 'pricing', title: 'Pricing & Due Date', description: 'Final pricing' },
    { key: 'assignment', title: 'Assignment', description: 'Review assignments' },
  ],
  []
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Order-level assignment | Item-level assignment | Phase 1 (completed) | Each service can have different assignee |
| Separate garment/service steps | (This phase) Merged step | Phase 3 | One fewer navigation step |

**Already Implemented:**
- `assignedSeamstressId` field on garment service (Phase 1)
- `useStaff` hook for fetching staff (Phase 1)
- Assignment UI pattern in AssignmentStep (Phase 1)

## Open Questions

All questions resolved through codebase analysis:

1. **Q: Keep AssignmentStep or remove entirely?**
   - **A:** Keep it. Inline assignment is additive. AssignmentStep provides bulk "Assign All" functionality and final review before submit. Make it optional to skip if all items assigned.

2. **Q: How to handle garments with no services selected?**
   - **A:** Prevent "Add to Order" until at least one service is selected. This is a validation constraint.

3. **Q: What about editing previously added garments?**
   - **A:** Current pattern is to remove and re-add. Consider adding "Edit" button that populates currentGarment with existing data and removes from list for re-configuration.

## Sources

### Primary (HIGH confidence)
- `/src/app/intake/page.tsx` - Main wizard controller, state management
- `/src/components/intake/garments-step.tsx` - Garment type selection UI
- `/src/components/intake/services-step-new.tsx` - Service selection UI
- `/src/components/intake/assignment-step.tsx` - Assignment UI pattern
- `/src/lib/hooks/useStaff.ts` - Staff data hook
- `/src/lib/types/database.ts` - TypeScript types including garment_service.assigned_seamstress_id

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` - Phase requirements and success criteria
- `.planning/phases/01-item-level-assignment/01-01-PLAN.md` - Assignment architecture from Phase 1

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use
- Architecture: HIGH - Clear patterns from existing components
- Pitfalls: HIGH - Documented from actual code analysis

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (30 days - stable codebase patterns)

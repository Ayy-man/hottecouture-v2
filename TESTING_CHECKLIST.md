# Phase 2 Testing Checklist

## Pre-Testing Setup
- [ ] Ensure local dev server is running: `npm run dev`
- [ ] Have Supabase dashboard open for database verification
- [ ] Have at least 2-3 test orders with different statuses
- [ ] Have orders assigned to "Marie" and "Sophie" for workload testing

---

## A. Critical Fixes (P0)

### A1: Customer Step First
- [ ] Go to `/intake`
- [ ] Verify Step 1 is "Customer Information" (not garment selection)
- [ ] Complete customer info and proceed
- [ ] Verify garment selection is now Step 2

### A2: Change Customer Bug
- [ ] Start new order at `/intake`
- [ ] Enter customer info and proceed to Step 2
- [ ] Click "Change Customer" button
- [ ] Verify form resets to Step 1
- [ ] Verify customer fields are cleared
- [ ] Enter different customer and complete order

### A3: SMS Confirmation on Kanban Drag
- [ ] Go to `/board`
- [ ] Drag an order card to "Ready" column
- [ ] Verify SMS confirmation modal appears
- [ ] Click "Send SMS" - verify notification sent
- [ ] Drag another order to "Ready"
- [ ] Click "Skip SMS" - verify order moves without notification
- [ ] Drag order to other columns (Working, Done) - verify NO modal appears

### A4: "Starting at" Text Removed
- [ ] Go to `/intake`
- [ ] Add a garment and select services
- [ ] Verify prices show as "$XX.XX" not "Starting at $XX.XX"

---

## B. Important Features (P1)

### B1: Auto-Advance on Card Click
- [ ] Go to `/board`
- [ ] Click on an order card (not drag)
- [ ] Verify detail modal opens
- [ ] Close modal and verify order did NOT change status

### B2: Seamstress Assignment at Step 5
- [ ] Go to `/intake`
- [ ] Complete Steps 1-4
- [ ] At Step 5 (Review), verify seamstress dropdown exists
- [ ] Select "Marie" or "Sophie"
- [ ] Complete order
- [ ] Verify order shows correct assignment in board

### B3: Editable Hours When In Progress
- [ ] Go to `/board`
- [ ] Click on an order in "Working" status
- [ ] Verify timer button shows edit icon (pencil)
- [ ] Click edit, change hours/minutes
- [ ] Save and verify time updated
- [ ] Refresh page and verify time persisted

### B4: Done Requires Final Hours
- [ ] Find an order in "Working" with 0 hours logged
- [ ] Try to drag it to "Done" column
- [ ] Verify error message appears requiring time entry
- [ ] Add work time via timer
- [ ] Try again - should now succeed

### B5: Per-Item Time Tracking
- [ ] Open order detail modal
- [ ] Verify each garment shows estimated time
- [ ] Verify timer button appears per garment (if implemented)
- [ ] Start/stop timer on a garment
- [ ] Verify time tracked per item

### B6: Nurture Sequence Enrollment
- [ ] Create new order with NEW customer (not existing)
- [ ] Check n8n/GHL webhook logs
- [ ] Verify contact has tags: `new-client`, `hotte-couture`
- [ ] Verify source field is set

---

## C. Nice-to-Have Features (P2)

### C1: List View Toggle
- [ ] Go to `/board`
- [ ] Find view toggle buttons (grid/list icons)
- [ ] Click List view
- [ ] Verify table layout displays
- [ ] Verify status dropdown works in list view
- [ ] Toggle back to Kanban view

### C2: Gantt Components (Available)
- [ ] Components exist at `/src/components/ui/gantt.tsx`
- [ ] Components exist at `/src/components/ui/gauge-1.tsx`
- [ ] Used in Workload Scheduler (C5)

### C3: Auto-Print Toggle
- [ ] Go to `/intake`
- [ ] At pricing step, find "Auto-print labels" toggle
- [ ] Enable toggle
- [ ] Complete order
- [ ] Verify label print dialog opens automatically

### C4: Consultation = Free
- [ ] Go to `/intake`
- [ ] Select "Custom" order type
- [ ] Add "Custom Design Consultation" service
- [ ] Verify price shows $0.00 (not $100)

### C5: Workload Scheduler
- [ ] Go to `/board`
- [ ] Click "Workload" button in header
- [ ] Verify `/board/workload` page loads
- [ ] Verify weekly capacity gauge shows percentage
- [ ] Verify Marie/Sophie cards show order counts
- [ ] Verify Gantt timeline displays orders
- [ ] Verify "Unassigned" alert shows if orders exist
- [ ] Verify capacity warnings show for overbooked days
- [ ] Click "Back to Board" - verify navigation works

### C6: Push to Calendar After Assignment
- [ ] Create order with seamstress assigned
- [ ] Check n8n webhook logs for calendar event
- [ ] Verify event data includes: title, due_date, assignee, order_number

### C7: H-Only PNG Logo
- [ ] Component exists at `/src/components/ui/h-logo.tsx`
- [ ] Verify `<HLogo />` renders correctly
- [ ] Test variants: `default`, `minimal`, `gradient`
- [ ] Test sizes: `xs`, `sm`, `md`, `lg`, `xl`

---

## Integration Tests

### Webhook Integrations
- [ ] SMS webhook fires on "Ready" status (with confirmation)
- [ ] GHL webhook fires on new client creation
- [ ] Calendar webhook fires on order assignment
- [ ] All webhooks gracefully handle missing env vars

### Environment Variables Required
```
N8N_SMS_WEBHOOK_URL=
N8N_GHL_WEBHOOK_URL=
N8N_CALENDAR_WEBHOOK_URL=
```

---

## Browser/Device Testing
- [ ] Chrome desktop
- [ ] Safari desktop
- [ ] iPad landscape (primary target)
- [ ] iPad portrait
- [ ] Mobile (responsive)

---

## Performance Checks
- [ ] Board loads in < 3 seconds
- [ ] Drag-drop is smooth (no lag)
- [ ] Workload page Gantt renders without freezing
- [ ] No console errors in production build

---

## Sign-off

| Tester | Date | Status |
|--------|------|--------|
|        |      |        |

### Notes:
_Add any issues found during testing here_

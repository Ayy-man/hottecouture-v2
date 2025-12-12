# AGENT A — Order System Workstream

> **Your Mission:** Own the complete order lifecycle from intake to completion.
> 
> **Start Time:** Hour 0 (you go first)

---

## First Actions

1. **Verify current state:**
   ```bash
   cd hottecouture-v2
   npm install
   npm run dev
   # Open http://localhost:3000
   # Test: Create order → Add garment → Add service → Save
   ```

2. **Check for obvious bugs:**
   - Does order creation work?
   - Does Kanban drag-drop update status?
   - Does time tracking start/stop?
   - Do labels print correctly?

3. **Log findings to progress.md**

---

## Your Files

### You OWN (full control):
```
/src/app/orders/
/src/app/clients/
/src/app/labels/
/src/components/orders/
/src/components/clients/
/src/components/kanban/
/src/app/api/orders/
/src/app/api/clients/
/src/app/api/garments/
/src/app/api/services/
```

### You READ (don't modify):
```
/src/lib/supabase.ts
/src/types/
```

### You NEVER touch:
```
/src/app/api/webhooks/
/src/app/api/chat/
/src/app/api/integrations/
/src/components/chat/
/src/app/booking/
```

---

## Deliverables Checklist

### P0 - Critical (Must Work)
- [ ] Order creation flow works end-to-end on iPad
- [ ] Client search finds existing customers by name/phone
- [ ] New client creation works
- [ ] Garment + service selection saves correctly
- [ ] Kanban board shows orders in correct columns
- [ ] Drag-drop changes order status
- [ ] Status change to "Ready for Pickup" triggers webhook

### P1 - Important
- [ ] Time tracking start/pause/stop works
- [ ] Labels print (2 per page)
- [ ] Client phone/email hidden until tapped
- [ ] Order history visible on client profile
- [ ] French translations complete

### P2 - Nice to Have
- [ ] Auto-advance steps on card click
- [ ] Remove top stepper, use left sidebar
- [ ] Compact card layout
- [ ] Rush order indicator (red ribbon equivalent)

---

## Webhook You Must Trigger

When order status changes to `ready_for_pickup` or `delivered`, call:

```typescript
// POST to internal endpoint that Agent B creates
await fetch('/api/webhooks/order-status', {
  method: 'POST',
  body: JSON.stringify({
    event: 'order.status_changed',
    order_id: order.id,
    new_status: newStatus,
    // ... full payload per api-contracts.md
  })
});
```

**Coordinate with Agent B** on exact payload format.

---

## Known Issues to Fix

From the checklist review:

1. **"Change Customer" behavior** - unclear what's broken, investigate
2. **Duplicate service entries** - check service creation/listing
3. **"Starting at" text** - remove from pricing display
4. **Lead times not auto-calculating** - due_date should be created_at + 10 days (alterations) or + 28 days (custom)

---

## Database Queries You'll Use

### Get orders for Kanban
```sql
SELECT o.*, c.first_name, c.last_name, c.phone,
       COUNT(g.id) as garment_count
FROM "order" o
JOIN client c ON o.client_id = c.id
LEFT JOIN garment g ON g.order_id = o.id
WHERE o.is_archived = false
GROUP BY o.id, c.id
ORDER BY o.priority DESC, o.created_at ASC;
```

### Search clients
```sql
SELECT * FROM client
WHERE first_name ILIKE $1 
   OR last_name ILIKE $1 
   OR phone ILIKE $1
ORDER BY last_name, first_name
LIMIT 20;
```

### Get order with all details
```sql
SELECT o.*, 
       c.first_name, c.last_name, c.phone, c.email, c.language,
       json_agg(DISTINCT g.*) as garments,
       json_agg(DISTINCT gs.*) as garment_services
FROM "order" o
JOIN client c ON o.client_id = c.id
LEFT JOIN garment g ON g.order_id = o.id
LEFT JOIN garment_service gs ON gs.garment_id = g.id
WHERE o.id = $1
GROUP BY o.id, c.id;
```

---

## Coordination Points

### With Agent B (Integrations):
- You trigger webhooks, they handle them
- Agree on payload format in api-contracts.md
- They'll add `invoice_url` to order after QB creates invoice

### With Agent C (Comms):
- They need to query orders for chatbot
- Ensure your API returns proper data
- Status changes trigger their SMS logic

---

## Questions? Blockers?

Post to `progress.md` with `BLOCKED: @Agent-B` or `@Agent-C` tag.

---

## Definition of Done

You're done when:
1. Audrey can create a complete order on iPad in < 2 minutes
2. Solange sees her work queue prioritized correctly
3. Time tracking works with one tap
4. Labels print correctly
5. Status change to "Ready" triggers webhook successfully
6. All P0 items checked off

---

*Good luck. Log everything to progress.md.*

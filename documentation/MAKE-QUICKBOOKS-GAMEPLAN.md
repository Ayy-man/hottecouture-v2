# Make.com QuickBooks Invoice Scenario - Build Guide

> **For:** Claude Web Agent building Make.com scenario
> **Purpose:** Auto-create QuickBooks invoices when orders are marked "ready"
> **Why Make.com:** QuickBooks OAuth requires compliance verification on n8n which is complex

---

## OVERVIEW

When the Hotte Couture app marks an order as "ready", it sends a webhook to Make.com. Make.com then:
1. Finds or creates the customer in QuickBooks
2. Creates an invoice with line items and Quebec taxes
3. Returns the invoice URL back to the app

---

## STEP 1: CREATE NEW SCENARIO

1. Go to Make.com dashboard
2. Click "Create a new scenario"
3. Name it: `Hotte Couture - QuickBooks Invoice`

---

## STEP 2: ADD WEBHOOK TRIGGER

1. Click the "+" to add first module
2. Search for "Webhooks"
3. Select "Webhooks > Custom webhook"
4. Click "Add" to create a new webhook
5. Name it: `Hotte Couture Order Status`
6. Click "Save"
7. **COPY THE WEBHOOK URL** - you'll need this for `MAKE_WEBHOOK_URL` env var

### Test the Webhook
Send this test payload to register the data structure:

```json
{
  "event": "order.status_changed",
  "order_id": "test-uuid-123",
  "order_number": 999,
  "new_status": "ready",
  "client": {
    "id": "client-uuid-123",
    "name": "Jean-Pierre Tremblay",
    "phone": "+18197171424",
    "email": "jp@example.com",
    "language": "fr"
  },
  "items": [
    {
      "garment_type": "Pants",
      "services": ["Hemming", "Waist adjustment"],
      "total_cents": 4500
    },
    {
      "garment_type": "Jacket",
      "services": ["Sleeve shortening"],
      "total_cents": 3500
    }
  ],
  "totals": {
    "subtotal_cents": 8000,
    "tps_cents": 400,
    "tvq_cents": 798,
    "total_cents": 9198
  },
  "timestamp": "2025-01-15T14:30:00Z"
}
```

---

## STEP 3: ADD FILTER (Only Process "ready" Status)

1. Click the dotted line after the webhook
2. Add a filter
3. Set condition:
   - **Label:** `Only Ready Orders`
   - **Condition:** `new_status` Text operators: Equal to `ready`

---

## STEP 4: CONNECT QUICKBOOKS

1. Click "+" after the filter
2. Search for "QuickBooks Online"
3. You'll need to authenticate with QuickBooks credentials
4. Grant Make.com access to your QuickBooks account

---

## STEP 5: SEARCH FOR EXISTING CUSTOMER

1. Add module: "QuickBooks Online > Search Customers"
2. Configure:
   - **Connection:** Select your QuickBooks connection
   - **Query:** `DisplayName = '{{1.client.name}}'`
   - **Limit:** 1

---

## STEP 6: ADD ROUTER (Customer Exists or Not)

1. Add a Router after the search
2. Create two routes:
   - **Route 1:** Customer exists (filter: `{{length(5.data)}} > 0`)
   - **Route 2:** Customer doesn't exist (fallback)

---

## STEP 7: CREATE CUSTOMER (Route 2 - New Customer)

1. On Route 2, add: "QuickBooks Online > Create a Customer"
2. Configure:
   - **Display Name:** `{{1.client.name}}`
   - **Primary Email Address:** `{{1.client.email}}`
   - **Primary Phone:** `{{1.client.phone}}`
   - **Notes:** `Created from Hotte Couture App`

---

## STEP 8: SET CUSTOMER ID VARIABLE

After the router, you need to converge and set the customer ID.

Add a "Tools > Set Variable" module:
- **Variable name:** `customerId`
- **Value:** Use an IF to select either:
  - From search: `{{5.data[1].Id}}`
  - From create: `{{7.Id}}` (adjust module number as needed)

---

## STEP 9: CREATE INVOICE

1. Add: "QuickBooks Online > Create an Invoice"
2. Configure:

### Basic Info
- **Customer:** `{{customerId}}` (from Set Variable)
- **Invoice Date:** `{{formatDate(now; "YYYY-MM-DD")}}`
- **Due Date:** `{{formatDate(addDays(now; 30); "YYYY-MM-DD")}}`

### Line Items (Iterator needed)
Before the invoice, add an Iterator to loop through `{{1.items}}`:

For each item, create a line:
- **Description:** `{{iterator.garment_type}} - {{join(iterator.services; ", ")}}`
- **Amount:** `{{iterator.total_cents / 100}}`
- **Quantity:** 1

### Tax Configuration (Quebec)
QuickBooks needs tax codes set up. You may need to:
1. Find existing tax codes in QuickBooks for:
   - TPS (GST) - 5%
   - TVQ (QST) - 9.975%
2. Apply them to line items

**Alternative:** If tax codes are complex, pass pre-calculated totals:
- **Subtotal:** `{{1.totals.subtotal_cents / 100}}`
- Add memo noting taxes: `TPS: ${{1.totals.tps_cents / 100}}, TVQ: ${{1.totals.tvq_cents / 100}}`

### Customer Memo
```
Order #{{1.order_number}}
Thank you for choosing Hotte Design & Couture!
```

---

## STEP 10: FORMAT RESPONSE

1. Add: "Webhooks > Webhook response"
2. Configure:
   - **Status:** 200
   - **Body:**
   ```json
   {
     "success": true,
     "invoice_url": "{{createInvoiceModule.InvoiceLink}}",
     "invoice_number": "{{createInvoiceModule.DocNumber}}"
   }
   ```

Replace `createInvoiceModule` with the actual module reference.

---

## STEP 11: ADD ERROR HANDLING

1. Click on the Create Invoice module
2. Add error handler route
3. Add "Webhooks > Webhook response":
   - **Status:** 500
   - **Body:**
   ```json
   {
     "success": false,
     "error": "{{errorMessage}}"
   }
   ```

---

## STEP 12: SAVE AND ACTIVATE

1. Click "Save" (disk icon)
2. Toggle the scenario ON (bottom left switch)
3. Set scheduling to "Immediately" (for webhook triggers, this is automatic)

---

## STEP 13: SET ENVIRONMENT VARIABLE

Once your webhook URL is created, set it in Vercel:

1. Go to Vercel dashboard > Project > Settings > Environment Variables
2. Add:
   - **Name:** `MAKE_WEBHOOK_URL`
   - **Value:** `https://hook.us1.make.com/xxxxx...` (your webhook URL)
3. Redeploy the app

---

## TESTING

### From the App
1. Create a test order in Hotte Couture
2. Change its status to "ready"
3. Check:
   - Make.com scenario execution history
   - QuickBooks for new invoice
   - Order in app should have `invoice_url` populated

### Direct Webhook Test
Use curl or Postman to send the test payload from Step 2 to your webhook URL.

---

## TROUBLESHOOTING

### Webhook Not Triggering
- Verify `MAKE_WEBHOOK_URL` is set correctly in Vercel
- Check Make.com scenario is ON
- Check scenario execution history for errors

### QuickBooks Auth Errors
- Reconnect QuickBooks in Make.com
- Verify API permissions include invoicing

### Tax Issues
- Ensure tax codes exist in QuickBooks
- Consider manually setting up TPS/TVQ tax items

### Customer Not Found
- Check the DisplayName query syntax
- May need to search by email instead

---

## COMPLETE SCENARIO FLOW

```
[Webhook Trigger]
       |
   [Filter: status = ready]
       |
[Search Customer by Name]
       |
   [Router]
      /     \
[Exists]   [Create Customer]
      \     /
[Set Customer ID Variable]
       |
  [Iterator: items]
       |
 [Create Invoice]
       |
[Webhook Response: success]
```

---

## EXPECTED BEHAVIOR

1. Order marked "ready" in app
2. App calls `triggerQuickBooksInvoice()` in `src/lib/integrations/make.ts`
3. Make.com receives webhook
4. Customer found/created in QuickBooks
5. Invoice created with line items
6. Response sent back to app
7. App updates order with `invoice_url` and `invoice_number`

---

*Document created: 2025-12-15*
*For use with Claude Web Agent*

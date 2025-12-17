# GHL Direct Integration - Remove n8n Dependency

**Date:** 2025-12-17
**Status:** Approved

## Overview

Replace n8n webhook middleware with direct GHL API calls from the Next.js app. This eliminates external dependencies and debugging complexity.

## GHL Credentials

- **Location ID:** `L0Ade4d7G92D31vhySgi`
- **API Key (PIT):** `pit-10275a8b-8dd7-4199-bd16-a885e0558e28`
- **Base URL:** `https://services.leadconnectorhq.com`
- **API Version:** `2021-07-28`

## File Structure

```
src/lib/ghl/
├── client.ts          # Core API client with auth, error handling
├── contacts.ts        # Contact lookup, create, update
├── messaging.ts       # Send SMS, send Email, message templates
├── tags.ts            # Add/remove tags
└── types.ts           # TypeScript interfaces
```

## API Endpoints

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Lookup contact | GET | `/contacts/lookup?locationId={loc}&email={email}` |
| Create contact | POST | `/contacts/` |
| Update contact | PUT | `/contacts/{contactId}` |
| Send SMS | POST | `/conversations/messages` |
| Add tags | POST | `/contacts/{contactId}/tags` |
| Remove tag | DELETE | `/contacts/{contactId}/tags/{tagId}` |

## Message Types

| Action | SMS? | Tags Added | Tags Removed |
|--------|------|------------|--------------|
| DEPOSIT_REQUEST | Yes | `depot_en_attente` | - |
| READY_PICKUP | Yes | `pret_a_ramasser` | `depot_recu` |
| READY_PICKUP_PAID | Yes | `pret_a_ramasser` | - |
| PAYMENT_RECEIVED | No | `depot_recu` or `paye` | `depot_en_attente`, `pret_a_ramasser` |

## Message Templates

### DEPOSIT_REQUEST
**FR:** Bonjour {firstName}, Votre commande #{order_number} nécessite un dépôt de {deposit}$. Payez ici: {payment_url} Merci, Hotte Couture

**EN:** Hello {firstName}, Your order #{order_number} requires a deposit of ${deposit}. Pay here: {payment_url} Thank you, Hotte Couture

### READY_PICKUP (balance due)
**FR:** Bonjour {firstName}, Votre commande #{order_number} est prête! Solde à payer: {balance}$ Payez ici: {payment_url} Merci, Hotte Couture

**EN:** Hello {firstName}, Your order #{order_number} is ready! Balance due: ${balance} Pay here: {payment_url} Thank you, Hotte Couture

### READY_PICKUP_PAID
**FR:** Bonjour {firstName}, Bonne nouvelle! Votre commande #{order_number} est prête à ramasser. Merci, Hotte Couture

**EN:** Hello {firstName}, Great news! Your order #{order_number} is ready for pickup. Thank you, Hotte Couture

### PAYMENT_RECEIVED
No message sent - tags only

## Integration Points

| Trigger | File | GHL Action |
|---------|------|------------|
| New order | `api/intake/route.ts` | Create/update contact, add tags |
| Order → ready (balance due) | `api/order/[id]/stage/route.ts` | READY_PICKUP SMS |
| Order → ready (paid) | `api/order/[id]/stage/route.ts` | READY_PICKUP_PAID SMS |
| Custom order deposit | `api/payments/create-checkout/route.ts` | DEPOSIT_REQUEST SMS |
| Stripe payment | `api/webhooks/stripe/route.ts` | PAYMENT_RECEIVED tags |
| Cash payment | `api/payments/record-manual/route.ts` | PAYMENT_RECEIVED tags |

## Files to Delete

- `src/lib/webhooks/n8n-webhooks.ts`
- `src/lib/webhooks/ghl-webhook.ts`

## Environment Variables

Remove:
- `N8N_CRM_WEBHOOK_URL`
- `N8N_MESSAGING_WEBHOOK_URL`

Add:
- `GHL_API_KEY=pit-10275a8b-8dd7-4199-bd16-a885e0558e28`
- `GHL_LOCATION_ID=L0Ade4d7G92D31vhySgi`

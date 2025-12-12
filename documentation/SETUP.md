# QUICK SETUP GUIDE — Hotte Couture Phase 2

## Prerequisites

- Node.js 18+
- npm or pnpm
- Git access to `https://github.com/Ayy-man/hottecouture-v2`
- Access to:
  - Supabase dashboard (OTOMATO456321's Org)
  - Vercel project
  - Make.com account
  - n8n at `otomato456321.app.n8n.cloud`
  - Stripe account (test mode)
  - Google Cloud Console (for Calendar API)

---

## Step 1: Clone & Install

```bash
git clone https://github.com/Ayy-man/hottecouture-v2.git
cd hottecouture-v2
npm install
```

---

## Step 2: Environment Variables

Create `.env.local` with:

```env
# Supabase (get from Supabase dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (get from Stripe dashboard → Developers → API keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Make.com (create webhook scenario, copy URL)
MAKE_WEBHOOK_URL=https://hook.make.com/xxxxx

# n8n Webhooks
N8N_WEBHOOK_BASE_URL=https://otomato456321.app.n8n.cloud/webhook

# Google Calendar (get from Google Cloud Console)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback

# OpenAI (for chatbots)
OPENAI_API_KEY=sk-...
```

---

## Step 3: Database Migrations

Check if any pending migrations need to be applied:

```bash
# Option A: Via Supabase CLI
supabase db push

# Option B: Manually via Supabase dashboard
# Go to SQL Editor → paste migration SQL → Run
```

Phase 2 adds these migrations (see `/docs/schema-changes.md`):
- Payment fields on order table
- notification_log table
- chat_log table

---

## Step 4: Run Development Server

```bash
npm run dev
# App runs at http://localhost:3000
```

---

## Step 5: Verify Current State

Before building new features, verify what works:

### Order Flow
1. Go to `/orders/new`
2. Create a test order
3. Add garment → Add service → Save
4. Check it appears on Kanban board
5. Drag to different column
6. Start/stop time tracking

### Client Management
1. Go to `/clients`
2. Search for existing client
3. Create new client
4. Verify it saves

### Labels
1. Open an order
2. Click print label
3. Verify it generates

---

## Step 6: Create Documentation Folder

```bash
mkdir -p docs
cp /path/to/GAMEPLAN.md docs/
cp /path/to/progress.md docs/
cp /path/to/api-contracts.md docs/
cp /path/to/schema-changes.md docs/
cp /path/to/agent-*.md docs/
```

---

## External Service Setup

### Make.com Scenario

1. Log into Make.com
2. Create new scenario: "Hotte → QuickBooks"
3. Add trigger: **Webhooks → Custom Webhook**
4. Copy the webhook URL → put in `MAKE_WEBHOOK_URL`
5. Add QuickBooks module: **Create Invoice**
6. Map fields from webhook to invoice
7. Turn on scenario

### n8n Workflow

1. Log into `otomato456321.app.n8n.cloud`
2. Create workflow: "Send SMS"
3. Add trigger: **Webhook**
4. Copy URL → this is what the app calls
5. Add HTTP Request to GHL API
6. Configure SMS sending
7. Activate workflow

### Stripe Webhooks

1. Log into Stripe Dashboard
2. Go to Developers → Webhooks
3. Add endpoint: `https://hotte-couture-six.vercel.app/api/webhooks/stripe`
4. Select events: `checkout.session.completed`
5. Copy signing secret → put in `STRIPE_WEBHOOK_SECRET`

### Google Calendar

1. Go to Google Cloud Console
2. Create project or select existing
3. Enable Calendar API
4. Create OAuth credentials (Web application)
5. Add redirect URI: your callback URL
6. Copy client ID and secret → put in env vars

---

## Folder Structure

```
hottecouture-v2/
├── docs/                    # Project documentation
│   ├── GAMEPLAN.md
│   ├── progress.md
│   ├── api-contracts.md
│   ├── schema-changes.md
│   ├── agent-a-orders.md
│   ├── agent-b-integrations.md
│   └── agent-c-comms.md
├── src/
│   ├── app/
│   │   ├── orders/          # Agent A
│   │   ├── clients/         # Agent A
│   │   ├── labels/          # Agent A
│   │   ├── booking/         # Agent B
│   │   ├── status/          # Agent C
│   │   ├── embed/           # Agent C
│   │   └── api/
│   │       ├── orders/      # Agent A
│   │       ├── clients/     # Agent A
│   │       ├── webhooks/    # Agent B
│   │       ├── integrations/# Agent B
│   │       ├── calendar/    # Agent B
│   │       ├── chat/        # Agent C
│   │       └── notifications/ # Agent C
│   ├── components/
│   │   ├── orders/          # Agent A
│   │   ├── clients/         # Agent A
│   │   ├── kanban/          # Agent A
│   │   └── chat/            # Agent C
│   ├── lib/
│   │   ├── supabase.ts      # Shared
│   │   ├── utils.ts         # Shared
│   │   └── integrations/    # Agent B
│   └── types/               # Shared
├── supabase/
│   └── migrations/          # Shared (coordinate changes)
└── public/
```

---

## Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules
npm install
```

### Supabase connection fails
- Check env vars are correct
- Check project is not paused
- Check RLS policies allow access

### Stripe webhook not receiving
- Check webhook URL is correct
- Check events are selected
- Use Stripe CLI for local testing:
  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```

### n8n workflow not triggering
- Check workflow is activated (not just saved)
- Check webhook URL matches exactly
- Check n8n execution logs

---

## Ready to Start

Once setup is complete:
1. Read `GAMEPLAN.md` thoroughly
2. Find your agent doc (`agent-a-orders.md`, etc.)
3. Log your first action to `progress.md`
4. Start building!

---

*Questions? Post to progress.md with `BLOCKED:` prefix.*

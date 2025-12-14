# HOTTE COUTURE — PHASE 2 GAMEPLAN

**Project:** Custom Fashion Management System  
**Client:** Hotte Couture (Audrey - Owner, Solange - Seamstress)  
**Status:** Phase 4 - Production Readiness  
**Last Updated:** 2025-12-14

---

## SITUATION SUMMARY

### What Happened
- Original 3-week, $2,450 project is now 3+ months late
- Previous developer departed mid-build
- Core app is ~55% complete with working foundation
- 17 tasks remain from Team Checklist

### What Works
- Order intake (multi-step wizard, tablet-optimized)
- Kanban board (drag-drop, real-time, filtering)
- Client management (search, CRUD, lookup)
- Time tracking (start/pause/stop/resume) - per order
- Service catalog with pricing + CRUD UI
- Label generation (2 per page)
- Authentication (Supabase magic links)
- Bilingual FR/EN
- Tax calculations (TPS/TVQ Quebec)
- Auto due dates (10 days / 28 days)
- GHL contact creation

### What's Missing (17 items)
See TASK LIST below.

---

## ARCHITECTURE

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (magic links) |
| Hosting | Vercel |
| Integrations | n8n (SMS, Calendar, CRM), Make.com (QuickBooks) |
| Payments | Stripe |

### Key Files Reference
| Feature | Primary File(s) |
|---------|-----------------|
| Order Intake | `src/app/intake/page.tsx` |
| Kanban Board | `src/app/board/page.tsx` |
| Stage Changes | `src/app/api/order/[id]/stage/route.ts` |
| Workflow Config | `src/lib/workflow/enhanced-workflow.ts` |
| Pipeline Config | `src/lib/workflow/pipeline-system.ts` |
| Pricing Display | `src/components/intake/pipeline-selector.tsx` |
| Client List | `src/app/clients/page.tsx` |
| Labels | `src/app/labels/[orderId]/page.tsx` |
| Task Tracking | `src/app/api/tasks/auto-create/route.ts` |
| Time Tracking UI | `src/components/tasks/garment-task-summary.tsx` |
| Task Management | `src/components/tasks/task-management-modal.tsx` |
| SMS Endpoint | `src/app/api/notifications/sms/route.ts` |
| GHL Webhook | `src/lib/webhooks/ghl-webhook.ts` |

---

## DEFINITION OF DONE

The system is "done" when Audrey can:

1. **Take an order** on iPad → saved to database
2. **See Solange's queue** on Kanban board  
3. **Assign orders** to specific seamstress
4. **Track time** per item (✅ IMPLEMENTED - per-garment & per-service tracking)
5. **Mark complete** → triggers SMS (needs debounce fix)
6. **Generate invoice** in QuickBooks (needs Make.com)
7. **Accept payment** via Stripe (waiting on keys)
8. **Book appointments** via calendar (use n8n)
9. **Check order status** via internal chatbot
10. **Let customers check** status via widget

---

## EXECUTION RULES

1. **ONE TASK AT A TIME** - Complete task fully before next
2. **TEST AFTER EACH** - Manual verification required
3. **LOG IN progress.md** - Update after each task
4. **ASK IF UNCLEAR** - Don't assume
5. **COMMIT FREQUENTLY** - Small, clear commits

---

## TASK LIST

### Phase A: Critical for Launch (P0)
- [ ] A1: Customer Step First
- [ ] A2: Fix "Change Customer" Bug
- [ ] A3: Prevent Accidental SMS on Kanban Drag
- [ ] A4: Remove "Starting at" Text

### Phase B: Important for Operations (P1)
- [ ] B1: Auto-Advance on Card Click
- [ ] B2: Seamstress Assignment at Step 5
- [ ] B3: Editable Hours When In Progress
- [ ] B4: Validation - Done Requires Final Hours
- [x] B5: Per-Item Time Tracking ✅
- [ ] B6: Nurture Sequence Enrollment

### Phase C: Nice to Have (P2)
- [ ] C1: List View Toggle
- [ ] C2: Gantt View
- [ ] C3: Auto-Print Toggle
- [ ] C4: Consultation = Free
- [ ] C5: Workload Scheduler (blocked - needs client data)
- [ ] C6: Push to Calendar After Assignment
- [ ] C7: H-Only PNG Logo

### Phase D: External Integrations (Blocked on credentials)
- [ ] D1: Make.com QuickBooks
- [ ] D2: n8n SMS Workflow
- [ ] D3: n8n Calendar
- [ ] D4: n8n Nurture
- [ ] D5: Stripe Configuration

---

## ENVIRONMENT VARIABLES

| Variable | Source | Status |
|----------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Verified | Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Verified | Set |
| `SUPABASE_SERVICE_ROLE_KEY` | Verified | Set |
| `STRIPE_SECRET_KEY` | Audrey's Stripe | Waiting |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard | Waiting |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Audrey's Stripe | Waiting |
| `MAKE_WEBHOOK_URL` | Make.com scenario | To create |
| `N8N_SMS_WEBHOOK_URL` | n8n workflow 1 | To create |
| `N8N_CALENDAR_WEBHOOK_URL` | n8n workflow 2 | To create |
| `N8N_CRM_WEBHOOK_URL` | n8n workflow 3 | To create |

---

## REMAINING WORK (Phase 4)

### Sprint A: Quick Wins (Today)
| Task | Priority | Notes |
|------|----------|-------|
| Duplicate client detection | P0 | Check phone before create, show modal if exists |
| Vercel cron for reminders | P0 | 3-week + 1-month pickup reminders |
| Client measurements UI | P1 | For custom design orders |

### Sprint B: Medium Effort (This Week)
| Task | Priority | Notes |
|------|----------|-------|
| Auto-archive cron | P1 | Archive delivered orders after 10 days |
| Rack position UI | P2 | Assign/search by rack location |

### Sprint C: Deferred
| Task | Blocker | Notes |
|------|---------|-------|
| Customer status chatbot | Custom build | Simple order lookup form (NOT AI), embeddable on website |
| QuickBooks integration | QB credentials | Make.com webhook |

**Customer Chatbot Clarification:**
- NOT a full AI chatbot
- Simple status lookup widget: enter phone/order # → see status
- No mutations, no AI responses
- Embeddable as iframe on hottecouture.ca
- Already partially implemented at `/status` route

---

## OUT OF SCOPE

- Mobile app (native iOS/Android)

Everything else from Team Checklist IS in scope.

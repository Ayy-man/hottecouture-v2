# Hotte Couture - Project Status

**Last Updated**: February 1, 2026
**Overall Completion**: ~92%

---

## Completed Features

### Core Business Logic
- [x] **Order Intake Workflow** - Multi-step wizard with client search/create, garment entry, service selection
- [x] **Kanban Board** - Drag-and-drop order management with status columns (New, In Progress, Ready, Picked Up)
- [x] **Time Tracking** - Per-garment timer with start/pause/stop, minutes logged to database
- [x] **Task Management** - Garment IS the task, auto-created when order enters "working" status
- [x] **Workload Scheduler** - Gantt-style view showing order distribution by seamstress
- [x] **Service Management** - CRUD for services with categories, pricing, units, and estimated time
- [x] **Client Management** - Full CRUD, phone search, GHL sync
- [x] **Label Printing** - QR code generation with dual copies (garment + pickup)
- [x] **Order Archive** - Soft delete with restore capability
- [x] **Order Detail Modal** - View/edit orders with garment details, measurements, notes

### Authentication & Staff
- [x] **PIN-Based Auth** - 4-digit PIN login for staff (owner, seamstress, clerk roles)
- [x] **Staff List** - Hardcoded (Audrey, Solange, Audrey-Anne)
- [x] **Role-Based Access** - Different permissions per role

### Payments & Invoicing
- [x] **Payment Recording** - Mark orders as paid with method (cash/card/online)
- [x] **Deposit System** - 50% deposit calculation for custom orders
- [x] **Payment Links** - Integration ready for Stripe checkout
- [x] **Total Override** - Manual total editing in order detail modal

### Integrations
- [x] **GoHighLevel (GHL) CRM** - Client sync, contacts, webhook integration
- [x] **n8n Automation** - SMS notifications via webhook
- [x] **Google Calendar** - Fitting appointments scheduling
- [x] **OpenRouter AI** - Internal chat assistant using GPT-4o-mini

### UI/UX
- [x] **Tablet-First Design** - Optimized for iPad landscape
- [x] **iOS-Style Interface** - Modern, touch-friendly components
- [x] **French/English Bilingual** - UI labels in both languages
- [x] **Responsive Layout** - Works on desktop and mobile
- [x] **Dark Mode Ready** - Tailwind configuration supports it

---

## Remaining Work

### High Priority
- [ ] **Stripe API Keys** - Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to production `.env`
- [ ] **Customer-Facing Chatbot** - Public order status chatbot not implemented
- [ ] **PIN Security** - Currently stored as plaintext; should hash with bcrypt

### Medium Priority
- [ ] **Email Notifications** - Order confirmations not sending
- [ ] **Measurement Templates** - Admin UI exists but incomplete
- [ ] **Analytics Dashboard** - Basic charts exist, more metrics needed

### Low Priority
- [ ] **Left Sidebar Navigation** - Original design used sidebar; current uses top header
- [ ] **Order History Export** - CSV/PDF export functionality
- [ ] **Bulk Operations** - Select multiple orders for batch actions

---

## Intentionally Excluded

The following features were considered but intentionally NOT implemented:

- **Full E-Commerce** - This is an internal SaaS, not a public storefront
- **Multi-Location** - Single-location business, no branch support needed
- **Inventory Management** - Materials/supplies tracking out of scope
- **Email Authentication** - Replaced with simpler PIN-based system
- **Complex Role Permissions** - Simple owner/seamstress/clerk hierarchy sufficient
- **Automated Scheduling** - Manual assignment preferred over AI scheduling
- **Customer Self-Service Portal** - Phone-based service model, no customer login

---

## Database Schema (17 Tables)

| Table | Description |
|-------|-------------|
| `client` | Customer information, GHL contact IDs |
| `order` | Order header with status, dates, totals |
| `garment` | Individual items in an order |
| `garment_service` | Services applied to garments |
| `service` | Service catalog with pricing |
| `category` | Service categories |
| `measurement` | Garment measurements |
| `measurement_template` | Reusable measurement presets |
| `task` | Time tracking entries |
| `task_log` | Timer start/stop events |
| `staff` | Staff members with PINs |
| `payment` | Payment records |
| `note` | Order notes |
| `audit_log` | Change tracking |
| `garment_type` | Garment type definitions |
| `fitting_slot` | Calendar appointment slots |
| `fitting_appointment` | Booked fittings |

---

## API Routes (69 Endpoints)

### Core CRUD
- `/api/clients` - Client management
- `/api/orders` - Order management
- `/api/services` - Service catalog
- `/api/garment/[id]` - Garment updates

### Business Logic
- `/api/intake` - Order creation wizard
- `/api/timer` - Time tracking controls
- `/api/tasks` - Task management
- `/api/payments` - Payment processing

### Integrations
- `/api/ghl/*` - GoHighLevel webhooks
- `/api/n8n/*` - n8n automation triggers
- `/api/calendar/*` - Google Calendar sync
- `/api/chatbot/*` - AI assistant endpoints

### Admin
- `/api/admin/services` - Service CRUD
- `/api/admin/categories` - Category CRUD
- `/api/admin/delete-all-orders` - Wipe all data

---

## Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (MISSING IN PRODUCTION)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Integrations
GHL_API_KEY=
GHL_LOCATION_ID=
N8N_SMS_WEBHOOK_URL=
OPENROUTER_API_KEY=
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_CALENDAR_ID=
```

---

## Recent Changes

### February 1, 2026
- **Dashboard Icons** - Fixed Order Status (amber/orange gradient) and Portail Client (violet/purple with proper SVG user icon)
- **Mobile Intake Stepper** - Redesigned to horizontal progress bar on mobile, vertical sidebar on desktop
- **Task Assignment Bug** - Fixed API field name mismatch (`seamstress_id` not `assigned_seamstress_id`) in workload and calendar pages
- **Export Button** - Added CSV export button to seamstress cards in Workload Scheduler

### January 14, 2026
- **Order Type Badges** - Blue "Alt" for alterations, purple "Sur m." for custom design on board cards
- **Duration Display Fix** - Fixed `estimated_minutes` read priority (garment_service > service table)
- **Privacy Masking** - Standardized phone (`***-***-1234`) and email (`j***@domain.com`) across all pages
- **API Fixes** - Fixed `completed_at` column error in orders/history, nullable assignee in tasks API
- **Git Recovery** - Recovered corrupted repository from remote

### December 31, 2024
- Added `estimated_minutes` to service admin UI
- Hour/minute input for estimated time editing
- Fixed workload scheduler to use garment-level assignee
- Fixed hours calculation to use garment override

### December 30, 2024
- Added timer auto-termination for stale entries
- Editable total override in order modal
- Fixed archive link 404 error
- Security improvements for race conditions

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Drag-and-Drop**: @dnd-kit
- **Charts**: Recharts
- **Testing**: Vitest, Playwright
- **Deployment**: Vercel

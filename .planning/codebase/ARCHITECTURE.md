# Architecture

**Analysis Date:** 2026-01-20

## Pattern Overview

**Overall:** Next.js App Router with Client-Server Hybrid Architecture

**Key Characteristics:**
- Server-side API routes with Next.js Route Handlers
- Client-side React components with 'use client' directive
- Supabase as Backend-as-a-Service (BaaS) for database and auth
- Feature-based organization within `src/lib/` for business logic
- Component-based UI with shadcn/ui patterns

## Layers

**Presentation Layer:**
- Purpose: React components for UI rendering and user interaction
- Location: `src/components/`
- Contains: UI components, feature components, layout components
- Depends on: lib/hooks, lib/utils, UI primitives
- Used by: App routes (pages)

**Page/Route Layer:**
- Purpose: Next.js App Router pages and layouts
- Location: `src/app/`
- Contains: Page components, layouts, loading states, error boundaries
- Depends on: Components, lib utilities
- Used by: Next.js router

**API Layer:**
- Purpose: Server-side API endpoints for data operations
- Location: `src/app/api/`
- Contains: Route handlers (route.ts files)
- Depends on: lib/supabase, lib/dto, lib/pricing, lib/ghl
- Used by: Client-side fetch calls

**Business Logic Layer:**
- Purpose: Domain logic, calculations, integrations
- Location: `src/lib/`
- Contains: Pricing calculations, GHL integration, webhooks, board logic
- Depends on: Supabase client, external APIs
- Used by: API routes, some client components

**Data Access Layer:**
- Purpose: Database operations via Supabase
- Location: `src/lib/supabase/`
- Contains: Client and server Supabase client factories
- Depends on: Supabase SDK, environment variables
- Used by: API routes, some client components

**Type/Schema Layer:**
- Purpose: TypeScript types and Zod validation schemas
- Location: `src/lib/dto.ts`, `src/lib/types/`
- Contains: DTOs, request/response schemas, database types
- Depends on: Zod
- Used by: All layers for type safety

## Data Flow

**Order Creation Flow:**

1. User fills intake form (`/intake` page with multi-step wizard)
2. Client-side form state managed with React useState
3. Form submission POSTs to `/api/intake`
4. API validates with Zod schemas from `lib/dto.ts`
5. Pricing calculated via `lib/pricing/calcTotal.ts`
6. Data persisted to Supabase via service role client
7. GHL contact sync triggered (if configured)
8. Calendar webhook called (if assigned)
9. QR code generated and returned
10. Client redirected to summary/labels

**Board Update Flow:**

1. User drags order card on Kanban board
2. `InteractiveBoard` component handles DnD
3. Optimistic update applied to local state
4. POST to `/api/order/[id]/stage` with new status
5. Stage transitions validated via `lib/board/stage-transitions.ts`
6. Supabase updated with new status
7. SMS notification sent (if moving to 'ready')
8. Real-time subscription triggers refresh across clients

**State Management:**
- Local component state with React useState/useReducer
- Jotai atoms for cross-component state (limited usage)
- Server state fetched via API calls with manual cache invalidation
- Real-time updates via Supabase subscriptions (`useRealtimeOrders` hook)

## Key Abstractions

**Order:**
- Purpose: Central business entity representing customer work
- Examples: `src/lib/dto.ts` (orderCreateSchema), `supabase/migrations/0001_init.sql`
- Pattern: Order has many Garments, Garment has many Services

**Client:**
- Purpose: Customer information and contact details
- Examples: `src/lib/dto.ts` (clientCreateSchema), `src/lib/ghl/contacts.ts`
- Pattern: One Client to many Orders

**Garment:**
- Purpose: Individual item being worked on
- Examples: `src/lib/dto.ts` (garmentCreateSchema)
- Pattern: Belongs to Order, has many GarmentServices

**Task:**
- Purpose: Work unit with time tracking (deprecated/simplified)
- Examples: `src/lib/board/stage-transitions.ts`
- Pattern: Belongs to Garment, tracks stage progression

**Pricing Calculation:**
- Purpose: Calculate order totals with tax (Quebec TPS/TVQ)
- Examples: `src/lib/pricing/calcTotal.ts`
- Pattern: Pure functions taking items and config, returning breakdown

## Entry Points

**Main Application:**
- Location: `src/app/layout.tsx`
- Triggers: Every page render
- Responsibilities: Global layout, auth provider, staff session, navigation

**Home Page:**
- Location: `src/app/page.tsx`
- Triggers: Root URL access
- Responsibilities: Dashboard with action cards (intake, board, status, portal)

**Intake Form:**
- Location: `src/app/intake/page.tsx`
- Triggers: New order creation
- Responsibilities: Multi-step wizard for order entry

**Production Board:**
- Location: `src/app/board/page.tsx`
- Triggers: Staff viewing/managing orders
- Responsibilities: Kanban view, order status management, filtering

**API Intake:**
- Location: `src/app/api/intake/route.ts`
- Triggers: Order form submission
- Responsibilities: Validate, calculate pricing, persist, sync integrations

**API Orders:**
- Location: `src/app/api/orders/route.ts`
- Triggers: Board data fetch
- Responsibilities: Return orders with client/garment details

## Error Handling

**Strategy:** Try-catch at API boundaries, error states in UI

**Patterns:**
- API routes return structured JSON errors with status codes
- Client components display error states with retry options
- Zod validation throws descriptive errors parsed by catch blocks
- Non-critical failures (GHL sync, calendar) logged but don't fail main operation
- `src/app/error.tsx` provides global error boundary

## Cross-Cutting Concerns

**Logging:**
- Console logging with emoji prefixes for visibility
- Pattern: `console.log('emoji Prefix: message', { context })`
- No structured logging service

**Validation:**
- Zod schemas in `src/lib/dto.ts`
- Client-side validation in form components
- Server-side validation in API routes

**Authentication:**
- Supabase Auth with `AuthProvider` context
- `AuthGuard` component for protected routes
- `ProtectedPage` wrapper component
- Staff session via PIN-based local authentication (`StaffSessionProvider`)

**Authorization:**
- Role-based with `UserRole` enum (owner, seamstress, custom, clerk)
- Currently basic RLS policies (all operations for authenticated users)
- Role definitions in `src/lib/auth/roles.ts`

---

*Architecture analysis: 2026-01-20*

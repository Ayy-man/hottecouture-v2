# Codebase Structure

**Analysis Date:** 2026-01-20

## Directory Layout

```
hottecouture-main/
├── src/                    # Main source code
│   ├── app/                # Next.js App Router pages and API routes
│   ├── components/         # React components
│   ├── lib/                # Business logic, utilities, integrations
│   ├── styles/             # Global styles
│   ├── types/              # TypeScript type declarations
│   ├── messages/           # i18n message files
│   ├── i18n/               # Internationalization config
│   └── middleware.ts       # Next.js middleware (currently disabled)
├── supabase/               # Supabase configuration
│   ├── migrations/         # SQL migration files
│   └── scripts/            # Database scripts
├── tests/                  # Test files
│   ├── unit/               # Unit tests
│   └── e2e/                # End-to-end Playwright tests
├── public/                 # Static assets
├── locales/                # Locale files
├── context/                # Context documentation
├── documentation/          # Project documentation
├── scripts/                # Build/utility scripts
└── .planning/              # Planning documents (GSD)
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router pages, layouts, and API routes
- Contains: Page components (page.tsx), layouts (layout.tsx), API handlers (route.ts)
- Key files: `layout.tsx` (root), `page.tsx` (home), `globals.css`
- Subdirectories follow route structure: `/intake` -> `src/app/intake/page.tsx`

**`src/app/api/`:**
- Purpose: Server-side API endpoints
- Contains: Route handlers organized by resource
- Key directories: `intake/`, `orders/`, `order/[id]/`, `clients/`, `payments/`, `webhooks/`
- Pattern: Each endpoint has `route.ts` with HTTP method exports

**`src/components/`:**
- Purpose: Reusable React components
- Contains: Feature components and UI primitives
- Key directories:
  - `ui/` - Base UI components (button, card, input, modal)
  - `board/` - Kanban board components
  - `intake/` - Order intake form steps
  - `auth/` - Authentication components
  - `staff/` - Staff management components
  - `navigation/` - Navigation components

**`src/lib/`:**
- Purpose: Business logic, utilities, and integrations
- Contains: Domain logic, API clients, hooks, type definitions
- Key directories:
  - `supabase/` - Database client factories
  - `pricing/` - Price calculation logic
  - `ghl/` - GoHighLevel CRM integration
  - `webhooks/` - Outbound webhook handlers
  - `board/` - Kanban board logic and state
  - `auth/` - Authentication helpers and roles
  - `hooks/` - Custom React hooks
  - `utils/` - General utilities
- Key files: `dto.ts` (schemas), `storage.ts` (file handling), `utils.ts` (helpers)

**`src/components/ui/`:**
- Purpose: Base UI primitives (shadcn/ui style)
- Contains: Button, Card, Input, Label, Modal, Select, etc.
- Pattern: CVA (class-variance-authority) for variants

**`supabase/migrations/`:**
- Purpose: Database schema migrations
- Contains: Numbered SQL files (0001_init.sql, etc.)
- Pattern: Sequential numbering, each migration is idempotent

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout with providers
- `src/app/page.tsx`: Home page with action cards
- `src/middleware.ts`: Request middleware (currently pass-through)

**Configuration:**
- `next.config.js`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS configuration
- `tsconfig.json`: TypeScript configuration
- `vitest.config.ts`: Test configuration
- `playwright.config.ts`: E2E test configuration
- `.env`: Environment variables (not committed)

**Core Logic:**
- `src/lib/dto.ts`: Zod schemas and TypeScript types for all DTOs
- `src/lib/pricing/calcTotal.ts`: Order pricing calculations
- `src/lib/board/stage-transitions.ts`: Order status state machine
- `src/lib/supabase/client.ts`: Browser Supabase client
- `src/lib/supabase/server.ts`: Server Supabase client (with service role)

**Main Pages:**
- `src/app/intake/page.tsx`: Order intake wizard
- `src/app/board/page.tsx`: Production Kanban board
- `src/app/status/page.tsx`: Order status lookup
- `src/app/portal/page.tsx`: Customer portal

**API Routes:**
- `src/app/api/intake/route.ts`: Order creation endpoint
- `src/app/api/orders/route.ts`: Orders list endpoint
- `src/app/api/order/[id]/stage/route.ts`: Order status update
- `src/app/api/clients/route.ts`: Client CRUD

**Testing:**
- `tests/setup.ts`: Test environment setup
- `tests/unit/`: Unit test files
- `tests/e2e/`: Playwright E2E tests

## Naming Conventions

**Files:**
- React components: `kebab-case.tsx` (e.g., `order-card.tsx`, `client-step.tsx`)
- API routes: `route.ts` in directory matching endpoint
- Hooks: `use[Name].ts` (e.g., `useRealtimeOrders.ts`)
- Types/schemas: `kebab-case.ts` or descriptive name (e.g., `dto.ts`, `types.ts`)
- Utilities: `kebab-case.ts` (e.g., `calc-total.ts`)

**Directories:**
- Feature directories: `kebab-case` (e.g., `order-detail-modal`)
- API directories: `kebab-case` matching resource (e.g., `orders`, `clients`)
- Dynamic routes: `[param]` (e.g., `[id]`)

**Components:**
- PascalCase exports (e.g., `export function OrderCard()`)
- Named exports preferred over default exports

**Variables/Functions:**
- camelCase for functions and variables
- UPPER_SNAKE_CASE for constants

## Where to Add New Code

**New Feature (full-stack):**
- Page: `src/app/[feature]/page.tsx`
- API: `src/app/api/[feature]/route.ts`
- Components: `src/components/[feature]/`
- Business logic: `src/lib/[feature]/`
- Types: Add to `src/lib/dto.ts` or create `src/lib/[feature]/types.ts`

**New Component:**
- UI primitive: `src/components/ui/[component-name].tsx`
- Feature component: `src/components/[feature]/[component-name].tsx`

**New API Endpoint:**
- Resource endpoint: `src/app/api/[resource]/route.ts`
- Sub-resource: `src/app/api/[resource]/[id]/[action]/route.ts`
- Shared logic: `src/lib/api/[resource].ts`

**New Hook:**
- Location: `src/lib/hooks/use[HookName].ts`
- Export from: Direct import or add to index file

**New Utility:**
- General utility: `src/lib/utils/[name].ts` or add to `src/lib/utils.ts`
- Domain-specific: `src/lib/[domain]/[name].ts`

**Database Changes:**
- Create migration: `supabase/migrations/00XX_[description].sql`
- Update types: Regenerate from Supabase or manually update `src/lib/types/database.ts`

**New Integration:**
- Create directory: `src/lib/[integration-name]/`
- Files: `client.ts`, `types.ts`, `index.ts` (barrel export)

## Special Directories

**`node_modules/`:**
- Purpose: NPM dependencies
- Generated: Yes (npm install)
- Committed: No

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (next build/dev)
- Committed: No

**`public/`:**
- Purpose: Static assets served at root
- Generated: No
- Committed: Yes
- Contents: favicon, logo, static images

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: By GSD commands
- Committed: Recommended (Yes)

**`supabase/.temp/`:**
- Purpose: Temporary Supabase CLI files
- Generated: Yes
- Committed: No

**`context/`:**
- Purpose: Context documentation for development
- Generated: No
- Committed: Yes

**`documentation/`:**
- Purpose: Project documentation
- Generated: No
- Committed: Yes

## Path Aliases

Configured in `tsconfig.json`:
- `@/*` -> `./src/*`
- `@/components/*` -> `./src/components/*`
- `@/lib/*` -> `./src/lib/*`
- `@/styles/*` -> `./src/styles/*`
- `@/app/*` -> `./src/app/*`

Use path aliases for all imports from `src/`:
```typescript
// Good
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

// Avoid
import { Button } from '../../../components/ui/button'
```

---

*Structure analysis: 2026-01-20*

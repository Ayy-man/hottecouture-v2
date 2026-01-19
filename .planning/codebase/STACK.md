# Technology Stack

**Analysis Date:** 2026-01-20

## Languages

**Primary:**
- TypeScript ^5.4.0 - All application code (components, API routes, lib)
- Strict mode enabled with comprehensive null checks

**Secondary:**
- JavaScript - Config files (`next.config.js`, `postcss.config.js`)
- SQL - Database migrations in `supabase/migrations/`

## Runtime

**Environment:**
- Node.js (version managed via system, no `.nvmrc` present)
- Next.js 14.2.33 App Router (React Server Components)

**Package Manager:**
- npm (package-lock.json present)
- Lockfile: present (462KB)

## Frameworks

**Core:**
- Next.js ^14.2.33 - Full-stack React framework (App Router)
- React ^18.3.0 - UI library
- Tailwind CSS ^3.4.0 - Utility-first CSS

**State Management:**
- Jotai ^2.16.0 - Atomic state management
- React Context - Auth and navigation state

**Testing:**
- Vitest ^1.4.0 - Unit testing
- Playwright ^1.45.0 - E2E testing
- Testing Library (React ^14.2.0, Jest-DOM ^6.4.0)

**Build/Dev:**
- SWC - Minification (swcMinify: true)
- PostCSS ^8.4.38 - CSS processing
- Autoprefixer ^10.4.19 - CSS vendor prefixes
- ESLint ^8.57.0 - Linting (next/core-web-vitals)
- Prettier ^3.2.0 - Code formatting
- Husky ^9.0.11 - Git hooks
- lint-staged ^15.2.0 - Pre-commit linting

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.39.0 - Database client
- `@supabase/ssr` ^0.1.0 - Server-side Supabase
- `@supabase/auth-helpers-nextjs` ^0.10.0 - Auth integration
- `stripe` ^20.0.0 - Payment processing
- `next-intl` ^3.0.0 - Internationalization (fr/en)

**UI Components:**
- `@radix-ui/*` - Headless UI primitives (dropdown, context menu, label, progress, slot)
- `lucide-react` ^0.544.0 - Icon library
- `framer-motion` ^12.23.26 - Animations
- `class-variance-authority` ^0.7.0 - Variant styling
- `clsx` ^2.1.0 + `tailwind-merge` ^2.2.0 - Classname utilities

**Drag & Drop:**
- `@dnd-kit/core` ^6.3.1
- `@dnd-kit/sortable` ^8.0.0
- `@dnd-kit/modifiers` ^9.0.0
- `@dnd-kit/utilities` ^3.2.2

**Utilities:**
- `date-fns` ^3.0.0 - Date manipulation
- `zod` ^3.22.0 - Schema validation
- `nanoid` ^5.0.0 - ID generation
- `uuid` ^9.0.0 - UUID generation
- `qrcode` ^1.5.0 / `qrcode.react` ^4.2.0 - QR code generation
- `lodash.throttle` ^4.1.1 - Function throttling
- `recharts` ^3.5.1 - Charts/analytics

**External APIs:**
- `googleapis` ^168.0.0 - Google Calendar integration
- `react-webcam` ^7.2.0 - Camera capture for photos

## Configuration

**Environment:**
- `.env` file (present, gitignored)
- `env.example` - Template with all required vars
- Key vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `GHL_API_KEY`, `GHL_LOCATION_ID`

**Build:**
- `next.config.js` - Next.js configuration with next-intl plugin
- `tsconfig.json` - Strict TypeScript with path aliases (`@/*` -> `./src/*`)
- `tailwind.config.ts` - Custom theme, colors, animations
- `vitest.config.ts` - Test configuration (jsdom environment)
- `playwright.config.ts` - E2E test configuration (multi-browser)

## TypeScript Configuration

**Strictness (from `tsconfig.json`):**
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `strictFunctionTypes: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitReturns: true`
- `noUncheckedIndexedAccess: true`

**Path Aliases:**
- `@/*` -> `./src/*`
- `@/components/*` -> `./src/components/*`
- `@/lib/*` -> `./src/lib/*`
- `@/styles/*` -> `./src/styles/*`
- `@/app/*` -> `./src/app/*`

## Platform Requirements

**Development:**
- Node.js (LTS recommended)
- npm
- Supabase project (local or cloud)
- Stripe account (test mode for dev)

**Production:**
- Vercel (configured in `vercel.json`)
- Standalone output mode
- Serverless functions with 30s max duration
- Cron jobs configured:
  - `/api/cron/reminders` - Daily at 9am
  - `/api/cron/auto-archive` - Daily at 9am
  - `/api/cron/stale-timers` - Hourly

---

*Stack analysis: 2026-01-20*

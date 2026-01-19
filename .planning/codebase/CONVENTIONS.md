# Coding Conventions

**Analysis Date:** 2026-01-20

## Naming Patterns

**Files:**
- React components: `kebab-case.tsx` (e.g., `client-step.tsx`, `order-summary.tsx`)
- Utility files: `kebab-case.ts` (e.g., `timer-utils.ts`, `error-handler.ts`)
- API routes: `route.ts` inside `[param]` directory structure
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useCurrentStaff.ts`, `useRealtimeOrders.ts`)
- Types/DTOs: `kebab-case.ts` (e.g., `dto.ts`)
- Test files: `*.test.ts` for unit tests, `*.spec.ts` for E2E tests

**Functions:**
- camelCase for all functions and methods
- Handler functions: `handle` + Action (e.g., `handleSubmit`, `handleApiError`)
- Async handlers: `handleOrderStage`, `handleOrderStatus`
- Utility functions: descriptive verbs (e.g., `formatTime`, `calculateElapsedTime`, `validateRequest`)

**Variables:**
- camelCase for all variables
- Constants: UPPER_SNAKE_CASE for true constants (e.g., `RUSH_FEE_SMALL_CENTS`, `TPS_RATE`)
- State: descriptive names (e.g., `isSubmitting`, `orderResult`, `currentStep`)
- Refs: suffixed with `Ref` (e.g., `channelsRef`)

**Types:**
- PascalCase for interfaces and types
- Schema types: `entityActionSchema` pattern (e.g., `clientCreateSchema`, `orderStageSchema`)
- Inferred types match schema names (e.g., `type ClientCreate = z.infer<typeof clientCreateSchema>`)
- React props: `ComponentNameProps` pattern

**Components:**
- PascalCase for component names
- Named exports preferred
- ForwardRef components set `displayName`

## Code Style

**Formatting:**
- Tool: Prettier v3.2.0
- Config: `.prettierrc`
- Key settings:
  ```json
  {
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "printWidth": 80,
    "tabWidth": 2,
    "useTabs": false,
    "bracketSpacing": true,
    "arrowParens": "avoid",
    "jsxSingleQuote": true
  }
  ```

**Linting:**
- Tool: ESLint v8.57.0 with `next/core-web-vitals`
- Config: `.eslintrc.json`
- Key rules:
  - `react-hooks/exhaustive-deps`: off (intentionally disabled)
  - `react/no-unescaped-entities`: off
  - `no-debugger`: error
  - `prefer-const`: error
  - `no-var`: error
  - `no-console`: off (console logging allowed)

**TypeScript:**
- Strict mode enabled with extensive strictness options
- Config: `tsconfig.json`
- Key settings:
  - `strict`: true
  - `noImplicitAny`: true
  - `strictNullChecks`: true
  - `noUnusedLocals`: true
  - `noUnusedParameters`: true
  - `noUncheckedIndexedAccess`: true
  - `noImplicitReturns`: true

## Import Organization

**Order:**
1. React/Next.js core imports
2. External library imports (e.g., `@radix-ui`, `zod`, `framer-motion`)
3. Internal absolute imports using path aliases
4. Relative imports (types, local utilities)

**Path Aliases:**
- `@/*` -> `./src/*`
- `@/components/*` -> `./src/components/*`
- `@/lib/*` -> `./src/lib/*`
- `@/styles/*` -> `./src/styles/*`
- `@/app/*` -> `./src/app/*`

**Example:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ClientCreate, orderStageSchema } from '@/lib/dto';
```

## Error Handling

**API Routes:**
- Use custom error classes from `@/lib/api/error-handler.ts`:
  - `ValidationError` (400)
  - `NotFoundError` (404)
  - `UnauthorizedError` (401)
  - `ForbiddenError` (403)
  - `ConflictError` (409)
  - `InternalServerError` (500)

- Pattern: `withErrorHandling` wrapper for consistent responses
- Always include `correlationId` for tracing
- Zod validation errors are automatically caught and formatted

**Example:**
```typescript
import { withErrorHandling, validateRequest, NotFoundError } from '@/lib/api/error-handler';

async function handleGet(request: NextRequest): Promise<ResponseType> {
  const correlationId = getCorrelationId(request);
  const validated = validateRequest(schema, data, correlationId);

  if (!result) {
    throw new NotFoundError('Resource', correlationId);
  }

  return result;
}

export const GET = (req: NextRequest) => withErrorHandling(() => handleGet(req), req);
```

**Client Components:**
- Try-catch with user-friendly error messages
- Store errors in state for display
- Use `error instanceof Error ? error.message : 'Default message'` pattern

## Logging

**Framework:** console (native)

**Patterns:**
- Emoji prefixes for visual scanning:
  - `console.log('🔍 ...')` - Search/lookup operations
  - `console.log('✅ ...')` - Success
  - `console.log('❌ ...')` - Errors
  - `console.log('📡 ...')` - Network/realtime
  - `console.log('🔄 ...')` - Updates/changes
- Include context: `console.log('API_NAME: action', { data })`
- Log errors with full error object: `console.error('Operation failed:', error)`

## Comments

**When to Comment:**
- JSDoc for exported utility functions
- Section headers in large files using `/** SECTION NAME */`
- Complex business logic explanations
- TODO/FIXME for known issues

**JSDoc Pattern:**
```typescript
/**
 * Format seconds into human-readable time format (e.g., "2h 30m", "45m", "15s")
 * Ensures non-negative display.
 * @param seconds - Number of seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
```

**Test Documentation:**
- Test files include header comments explaining coverage
- Reference checklist items being tested

## Function Design

**Size:**
- Keep functions focused on single responsibility
- Extract reusable logic into utility functions in `@/lib/utils/`

**Parameters:**
- Use object destructuring for multiple params
- Required params first, optional last
- Default values in destructuring when sensible

**Return Values:**
- Explicit return types for exported functions
- Prefer returning typed objects over primitives for complex operations
- Use `Promise<T>` for async functions

## Module Design

**Exports:**
- Named exports preferred over default exports
- Exception: Next.js page components use default export
- Group related exports in schemas object:
  ```typescript
  export const schemas = {
    clientCreate: clientCreateSchema,
    orderStage: orderStageSchema,
    // ...
  } as const;
  ```

**Barrel Files:**
- Use `index.ts` sparingly
- Components with multiple related exports use barrel: `@/components/staff`

## React Patterns

**Component Structure:**
```typescript
'use client'; // If client component

import { useState, useCallback } from 'react';
// ... other imports

interface ComponentProps {
  // Props definition
}

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // State
  const [state, setState] = useState<Type>(initial);

  // Callbacks (memoized with useCallback)
  const handleAction = useCallback(() => {
    // ...
  }, [dependencies]);

  // Effects
  useEffect(() => {
    // ...
  }, []);

  // Render
  return (
    // JSX
  );
}
```

**Hooks:**
- Custom hooks in `@/lib/hooks/`
- Prefix with `use`
- Return object with named properties for flexibility

**State Management:**
- Local state with `useState` for component-scoped state
- Jotai for global/shared state
- URL state for navigation-related state
- localStorage for persistence (via custom hooks)

## Styling

**Approach:** Tailwind CSS with utility classes

**Patterns:**
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Component variants with `class-variance-authority` (cva)
- CSS custom properties for theming in `globals.css`

**Example:**
```typescript
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva('base-classes', {
  variants: {
    variant: { default: '...', destructive: '...' },
    size: { default: '...', sm: '...', lg: '...' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});
```

## Validation

**Tool:** Zod v3.22.0

**Patterns:**
- Define schemas in `@/lib/dto.ts`
- Use `.parse()` for validation (throws on failure)
- Compose schemas with `.extend()`, `.partial()`, `.pick()`
- Export inferred types alongside schemas

**Example:**
```typescript
export const clientCreateSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  phone: phoneSchema,
  email: emailSchema,
});

export type ClientCreate = z.infer<typeof clientCreateSchema>;
```

---

*Convention analysis: 2026-01-20*

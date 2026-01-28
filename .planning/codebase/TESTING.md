# Testing Patterns

**Analysis Date:** 2026-01-20

## Test Framework

**Unit Tests:**
- Runner: Vitest v1.4.0
- Config: `vitest.config.ts`
- Environment: jsdom
- Globals enabled (no explicit imports needed for `describe`, `it`, `expect`)

**E2E Tests:**
- Runner: Playwright v1.45.0
- Config: `playwright.config.ts`
- Base URL: `http://localhost:3000` (local) or `https://hottecouture-v2.vercel.app` (prod)
- Browsers: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari

**Assertion Libraries:**
- Vitest built-in assertions
- `@testing-library/jest-dom` matchers for DOM assertions
- Playwright built-in `expect` for E2E

**Run Commands:**
```bash
npm run test              # Run unit tests
npm run test:ui           # Vitest UI mode
npm run test:coverage     # Run with coverage report
npm run test:e2e          # Run Playwright E2E tests
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:headed   # Run E2E in visible browser
```

## Test File Organization

**Location:**
- Unit tests: `tests/unit/*.test.ts`
- E2E tests: `tests/e2e/*.spec.ts`
- Test setup: `tests/setup.ts`

**Naming:**
- Unit: `{feature}.test.ts` (e.g., `pricing.test.ts`, `timer-utils.test.ts`)
- E2E: `{number}-{feature}.spec.ts` (e.g., `1-order-flow-intake.spec.ts`)

**Structure:**
```
tests/
├── setup.ts              # Global test setup and mocks
├── unit/
│   ├── pricing.test.ts   # Unit tests for pricing logic
│   └── timer-utils.test.ts
└── e2e/
    ├── homepage.spec.ts  # Smoke tests
    ├── 1-order-flow-intake.spec.ts
    ├── 2-ui-branding.spec.ts
    ├── 3-crm-notifications.spec.ts
    └── 4-production-hourly.spec.ts
```

## Test Structure

**Unit Test Pattern:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { functionUnderTest } from '@/lib/path/to/module'

// Constants for test data
const CONSTANT_VALUE = 1000

// Helper functions at module level
function calculateExpected(input: number): number {
  return input * 2
}

describe('Feature Name', () => {
  describe('Sub-feature', () => {
    it('describes expected behavior', () => {
      // Arrange
      const input = { /* ... */ }

      // Act
      const result = functionUnderTest(input)

      // Assert
      expect(result).toBe(expectedValue)
    })

    it('handles edge case', () => {
      expect(functionUnderTest(-1)).toBe(0)
    })
  })
})
```

**E2E Test Pattern:**
```typescript
import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.TEST_URL || 'https://hottecouture-v2.vercel.app'

// Helper functions
async function goToPage(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`)
  await page.waitForLoadState('networkidle')
}

function getTestData() {
  return {
    firstName: 'Test',
    lastName: `User${Date.now()}`,
  }
}

test.describe('Feature Area', () => {
  test.beforeEach(async ({ page }) => {
    await goToPage(page, '/intake')
  })

  test('user can perform action', async ({ page }) => {
    // CHECKLIST: Reference to requirement being tested
    // Navigate: Path description
    // Expected: Outcome description

    await page.locator('selector').click()
    await expect(page.getByText(/Expected Text/i)).toBeVisible()
  })
})
```

**Setup Pattern:**
```typescript
// tests/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock external dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      // ... chainable methods
    })),
  }),
}))

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
```

## Mocking

**Framework:** Vitest `vi` utilities

**Patterns:**

**Module Mocking:**
```typescript
// In setup.ts for global mocks
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// In test file for specific mocks
vi.mock('@/lib/specific/module', () => ({
  specificFunction: vi.fn().mockReturnValue(expected),
}))
```

**Supabase Client Mock:**
```typescript
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}))
```

**Fetch Mock:**
```typescript
global.fetch = vi.fn()

// In specific test
vi.mocked(fetch).mockResolvedValueOnce({
  ok: true,
  json: async () => ({ data: 'test' }),
} as Response)
```

**What to Mock:**
- External API calls (Supabase, Stripe, GHL)
- Next.js navigation hooks
- Browser APIs (fetch, localStorage)
- Time-dependent functions when testing time logic

**What NOT to Mock:**
- Pure utility functions being tested
- Business logic calculations
- Data transformation functions

## Fixtures and Factories

**Test Data Patterns:**

```typescript
// Helper function for unique test data
function getTestClient() {
  const timestamp = Date.now()
  return {
    firstName: 'Test',
    lastName: `User${timestamp}`,
    phone: `+1555${String(timestamp).slice(-7)}`,
    email: `test${timestamp}@example.com`,
  }
}

// Constants for pricing tests
const RUSH_FEE_SMALL_CENTS = 3000
const RUSH_FEE_LARGE_CENTS = 6000
const TPS_RATE = 0.05
const TVQ_RATE = 0.09975
const HOURLY_RATE_CENTS = 3500
```

**Date Fixtures:**
```typescript
// Use specific dates for reproducibility
const monday = new Date(2025, 0, 6)  // Jan 6, 2025
const friday = new Date(2025, 0, 10)

// Time-based calculations
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
```

**Location:**
- Inline in test files for simple fixtures
- Helper functions at top of test file

## Coverage

**Requirements:** None enforced (coverage reporting available)

**View Coverage:**
```bash
npm run test:coverage
```

**Coverage Reports:**
- Text (console output)
- JSON
- HTML (viewable in browser)

**Configuration:**
```typescript
// vitest.config.ts
coverage: {
  reporter: ['text', 'json', 'html'],
  exclude: ['node_modules/', 'tests/'],
}
```

## Test Types

**Unit Tests:**
- Scope: Pure functions, utility modules, business logic
- Location: `tests/unit/`
- Current coverage:
  - `@/lib/timer/timer-utils.ts` - Time formatting, timer state
  - Pricing calculations - Tax, rush fees, deposits, lead times

**Integration Tests:**
- Scope: API endpoints (implicit through E2E)
- Approach: E2E tests verify API responses via UI interactions

**E2E Tests:**
- Scope: Full user workflows across pages
- Location: `tests/e2e/`
- Coverage areas:
  - `homepage.spec.ts` - Health checks, navigation smoke tests
  - `1-order-flow-intake.spec.ts` - Customer flow, search, services, pricing
  - `2-ui-branding.spec.ts` - French labels, responsive design, printing
  - `3-crm-notifications.spec.ts` - CRM integration, notifications
  - `4-production-hourly.spec.ts` - Timer, assignment, workload

## Common Patterns

**Async Testing:**
```typescript
it('handles async operation', async () => {
  const result = await asyncFunction()
  expect(result).toBe(expected)
})

// With timing tolerance
it('calculates elapsed time', () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  const elapsed = calculateElapsedTime(fiveMinutesAgo)

  // Allow 1 second tolerance
  expect(elapsed).toBeGreaterThanOrEqual(299)
  expect(elapsed).toBeLessThanOrEqual(301)
})
```

**Error Testing:**
```typescript
it('handles negative values as zero', () => {
  expect(formatTime(-10)).toBe('0s')
  expect(formatTime(-3600)).toBe('0s')
})

it('throws on invalid input', () => {
  expect(() => validateFunction(invalid)).toThrow()
})
```

**UI Element Testing (E2E):**
```typescript
// Wait for element visibility
await expect(page.getByText(/Expected/i)).toBeVisible()

// Check element count
await expect(errorPage).toHaveCount(0)

// Check URL
expect(page.url()).toContain('/expected-path')

// Conditional interaction
if (await element.isVisible()) {
  await element.click()
}
```

**Responsive Testing:**
```typescript
test('works on tablet', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto(`${BASE_URL}/board`)
  // ...
})

test('works on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE_URL}/intake`)
  // ...
})
```

**API Testing (E2E):**
```typescript
test('API endpoint responds', async ({ request }) => {
  const response = await request.get(`${BASE_URL}/api/services`)
  expect(response.status()).toBeLessThan(500)
})
```

## Playwright Configuration

**Key Settings:**
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**Browser Projects:**
- Desktop Chrome, Firefox, Safari
- Mobile Chrome (Pixel 5), Mobile Safari (iPhone 12)

## Test Documentation Style

**Header Comments:**
```typescript
/**
 * TEST SUITE 1: ORDER FLOW & INTAKE
 * ==================================
 * Covers: Order Flow, Customer Privacy & Search, Services Configuration, Pricing & Lead Times
 *
 * BASE URL: https://hottecouture-v2.vercel.app
 *
 * NAVIGATION MAP:
 * - Home: /
 * - Intake Wizard: /intake
 * - Board (Kanban): /board
 */
```

**Test Comments:**
```typescript
test('1.1 Intake starts with Customer step', async ({ page }) => {
  // CHECKLIST: Customer step first
  // Navigate: /intake
  // Expected: First visible step should be "Client"
```

---

*Testing analysis: 2026-01-20*

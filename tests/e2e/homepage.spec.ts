/**
 * HOMEPAGE & SMOKE TESTS
 * =======================
 * Basic health checks for the application
 *
 * For full test coverage by checklist area, see:
 * - 1-order-flow-intake.spec.ts (Order Flow, Customer, Services, Pricing)
 * - 2-ui-branding.spec.ts (UI, French Labels, Printing)
 * - 3-crm-notifications.spec.ts (CRM, Notifications, Integrations)
 * - 4-production-hourly.spec.ts (Timer, Assignment, Workload)
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.TEST_URL || 'https://hottecouture-v2.vercel.app'

test.describe('Application Health Check', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    // Page should not show error
    const errorPage = page.getByText(/500 Internal Server Error/i)
    await expect(errorPage).toHaveCount(0)

    // Should have some main content
    const mainContent = page.locator('main, .container, body')
    await expect(mainContent).toBeVisible()
  })

  test('intake page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/intake`)
    await page.waitForLoadState('networkidle')

    // Should show client search/create
    const clientContent = page.getByText(/Rechercher Client|Information Client|Client/i)
    await expect(clientContent).toBeVisible()
  })

  test('board page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/board`)
    await page.waitForLoadState('networkidle')

    // Should show production board
    const boardContent = page.getByText(/Production Board|New Order/i)
    await expect(boardContent).toBeVisible()
  })

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto(`${BASE_URL}/board`)
    await page.waitForLoadState('networkidle')

    // Board should still be accessible
    const header = page.locator('header')
    await expect(header).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE_URL}/intake`)
    await page.waitForLoadState('networkidle')

    // Intake should be usable
    const searchInput = page.locator('input#search')
    await expect(searchInput).toBeVisible()
  })
})

test.describe('API Endpoints Health', () => {
  test('services API responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/services`)
    expect(response.status()).toBeLessThan(500)
  })

  test('orders API responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/orders`)
    expect(response.status()).toBeLessThan(500)
  })

  test('clients API responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/clients`)
    expect(response.status()).toBeLessThan(500)
  })
})

test.describe('Navigation Smoke Tests', () => {
  test('can navigate from home to intake', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    // Click on intake/order link
    const intakeLink = page.getByRole('link', { name: /Intake|New Order|Nouvelle/i })
    if (await intakeLink.count() > 0) {
      await intakeLink.first().click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toContain('/intake')
    }
  })

  test('can navigate from board to intake', async ({ page }) => {
    await page.goto(`${BASE_URL}/board`)
    await page.waitForLoadState('networkidle')

    // Click new order button
    const newOrderLink = page.getByRole('link', { name: /New Order/i })
    if (await newOrderLink.isVisible()) {
      await newOrderLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toContain('/intake')
    }
  })
})

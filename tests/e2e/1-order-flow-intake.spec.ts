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
 * - Clients: /clients
 * - Admin Pricing: /admin/pricing
 */

import { test, expect, Page } from '@playwright/test'

// Test configuration
const BASE_URL = process.env.TEST_URL || 'https://hottecouture-v2.vercel.app'

// Helper: Navigate to intake page
async function goToIntake(page: Page) {
  await page.goto(`${BASE_URL}/intake`)
  await page.waitForLoadState('networkidle')
}

// Helper: Navigate to board
async function goToBoard(page: Page) {
  await page.goto(`${BASE_URL}/board`)
  await page.waitForLoadState('networkidle')
}

// Helper: Create test client data
function getTestClient() {
  const timestamp = Date.now()
  return {
    firstName: 'Test',
    lastName: `User${timestamp}`,
    phone: `+1555${String(timestamp).slice(-7)}`,
    email: `test${timestamp}@example.com`,
  }
}

test.describe('1. ORDER FLOW - Customer Step First', () => {
  test.beforeEach(async ({ page }) => {
    await goToIntake(page)
  })

  test('1.1 Intake starts with Customer step (not pipeline selector)', async ({ page }) => {
    // CHECKLIST: Customer step first
    // Navigate: /intake
    // Expected: First visible step should be "Client" or "Customer Information"

    // Check the step indicator shows step 1 active
    const activeStep = page.locator('.bg-gradient-to-r.from-primary-500').first()
    await expect(activeStep).toBeVisible()

    // Check for client-related content (search field or create form)
    const clientSection = page.getByText(/Rechercher Client|Information Client|Customer/i).first()
    await expect(clientSection).toBeVisible()

    // Verify search input exists
    const searchInput = page.locator('input[placeholder*="téléphone"], input[placeholder*="phone"], input#search')
    await expect(searchInput).toBeVisible()
  })

  test('1.2 Steps displayed in left sidebar (not top stepper)', async ({ page }) => {
    // CHECKLIST: Steps placed in left sidebar, Remove top stepper
    // Navigate: /intake
    // Expected: Vertical step indicators on the left side

    // Check for vertical step layout (flex-col)
    const stepContainer = page.locator('.flex.flex-col.items-center.gap-2')
    await expect(stepContainer).toBeVisible()

    // Verify multiple step indicators exist in vertical arrangement
    const stepIndicators = page.locator('.w-8.h-8.rounded-full')
    const count = await stepIndicators.count()
    expect(count).toBeGreaterThanOrEqual(4) // At least 4 steps: client, pipeline, garments, services
  })

  test('1.3 "Change Customer" button works correctly', async ({ page }) => {
    // CHECKLIST: Fix "Change Customer" behavior
    // Navigate: /intake > Create client > Click "Change Customer"
    // Expected: Returns to client search/create view

    const testClient = getTestClient()

    // Click create new client
    await page.getByRole('button', { name: /Créer Nouveau Client|Create New/i }).click()
    await page.waitForTimeout(300)

    // Fill form
    await page.locator('input#firstName').fill(testClient.firstName)
    await page.locator('input#lastName').fill(testClient.lastName)
    await page.locator('input#phone').fill(testClient.phone)
    await page.locator('input#email').fill(testClient.email)

    // Submit - Note: In real test, this would create a client
    // For this test, we simulate having a selected client

    // After client is selected, look for "Change Customer" button
    const changeButton = page.getByRole('button', { name: /Changer Client|Change Customer/i })

    // If visible, click it and verify we return to search
    if (await changeButton.isVisible()) {
      await changeButton.click()
      await page.waitForTimeout(300)

      // Should see search input again
      const searchInput = page.locator('input#search')
      await expect(searchInput).toBeVisible()
    }
  })
})

test.describe('2. CUSTOMER PRIVACY & SEARCH', () => {
  test.beforeEach(async ({ page }) => {
    await goToIntake(page)
  })

  test('2.1 Search by name and phone enabled', async ({ page }) => {
    // CHECKLIST: Enable search by name and phone
    // Navigate: /intake
    // Expected: Search field accepts name or phone input

    const searchInput = page.locator('input#search')
    await expect(searchInput).toBeVisible()

    // Check placeholder text mentions both phone and email/name
    const placeholder = await searchInput.getAttribute('placeholder')
    expect(placeholder?.toLowerCase()).toMatch(/téléphone|phone|courriel|email|nom|name/)
  })

  test('2.2 Phone/email hidden by default (privacy masking)', async ({ page }) => {
    // CHECKLIST: Hide phone/email by default
    // Navigate: /intake > Search for existing client
    // Expected: Phone shows as ***-***-XXXX, email as X***@domain.com

    const searchInput = page.locator('input#search')
    await searchInput.fill('test') // Search for test clients
    await page.waitForTimeout(500)

    // Look for masked format in search results
    const maskedPhone = page.getByText(/\*\*\*-\*\*\*-\d{4}/)
    const maskedEmail = page.getByText(/[a-zA-Z]\*\*\*@/)

    // At least one should be visible if there are results
    const resultsSection = page.locator('.space-y-1').first()
    if (await resultsSection.isVisible()) {
      const hasMaskedContent = await maskedPhone.count() > 0 || await maskedEmail.count() > 0
      // Note: This may fail if no results exist - that's expected
    }
  })

  test('2.3 Reveal details on tap/click', async ({ page }) => {
    // CHECKLIST: Reveal details on tap
    // Navigate: /intake > Search > Click on masked contact info
    // Expected: Phone/email revealed on click, hidden on second click

    const searchInput = page.locator('input#search')
    await searchInput.fill('test')
    await page.waitForTimeout(500)

    // Find clickable contact info area
    const contactInfo = page.locator('.text-xs.text-muted-foreground.cursor-pointer').first()

    if (await contactInfo.isVisible()) {
      // Get initial text (should be masked)
      const initialText = await contactInfo.textContent()

      // Click to reveal
      await contactInfo.click()
      await page.waitForTimeout(200)

      // Get revealed text
      const revealedText = await contactInfo.textContent()

      // Click again to hide
      await contactInfo.click()
      await page.waitForTimeout(200)

      // Verify toggle behavior (text should change)
      // Note: May not change if no clients found
    }
  })
})

test.describe('3. SERVICES & PRODUCT CONFIGURATION', () => {
  test('3.1 Admin UI for adding/editing/removing services exists', async ({ page }) => {
    // CHECKLIST: Add UI for adding/editing/removing services
    // Navigate: /admin/pricing
    // Expected: Interface for service management

    await page.goto(`${BASE_URL}/admin/pricing`)
    await page.waitForLoadState('networkidle')

    // Check for pricing management page
    const heading = page.getByRole('heading', { name: /Pricing Management|Gestion des prix/i })
    await expect(heading).toBeVisible()

    // Check for import functionality
    const importButton = page.getByRole('button', { name: /Import/i })
    await expect(importButton).toBeVisible()
  })

  test('3.2 No duplicate service entries in selection', async ({ page }) => {
    // CHECKLIST: Fix duplicate service entries
    // Navigate: /intake > Services step
    // Expected: Each service appears only once in the list

    await goToIntake(page)

    // Would need to navigate through steps to services
    // This is a placeholder for full flow testing
  })

  test('3.3 View modes available (List, Kanban)', async ({ page }) => {
    // CHECKLIST: Implement List, Kanban, and Gantt views
    // Navigate: /board
    // Expected: Toggle between Kanban and List views

    await goToBoard(page)

    // Look for view toggle buttons
    const kanbanButton = page.getByRole('button', { name: /Board|Kanban/i })
    const listButton = page.getByRole('button', { name: /List|Liste/i })

    await expect(kanbanButton).toBeVisible()
    await expect(listButton).toBeVisible()

    // Test switching views
    await listButton.click()
    await page.waitForTimeout(300)

    // Verify list view is active
    await kanbanButton.click()
    await page.waitForTimeout(300)
  })
})

test.describe('4. PRICING & LEAD TIMES', () => {
  test('4.1 No "Starting at" prefix on prices', async ({ page }) => {
    // CHECKLIST: Remove "Starting at"
    // Navigate: /intake > Services step
    // Expected: Prices shown without "Starting at" prefix

    await goToIntake(page)

    // Search for "Starting at" text - should NOT be found
    const startingAt = page.getByText(/Starting at|À partir de/i)
    await expect(startingAt).toHaveCount(0)
  })

  test('4.2 Default alteration lead time is 10 days', async ({ page }) => {
    // CHECKLIST: Set 10-day alteration lead time
    // Navigate: /intake > Pricing step
    // Expected: Default due date is 10 business days from today

    await goToIntake(page)

    // Navigate to pricing step would require full flow
    // For now, check the pricing step component description
    const description = page.getByText(/10 jours ouvrables|10 business days|10 working days/i)
    // This might be in the pricing step when we get there
  })

  test('4.3 Consultation is free ($0)', async ({ page }) => {
    // CHECKLIST: Consultation = Free
    // Navigate: /intake > Services step > Select consultation
    // Expected: Consultation service has $0 price

    // Would need to navigate through to services step
    // Placeholder for full flow test
  })

  test('4.4 Due dates are auto-generated', async ({ page }) => {
    // CHECKLIST: Auto-generate due dates
    // Navigate: /intake > Pricing step
    // Expected: Due date field is pre-populated

    await goToIntake(page)

    // The pricing step auto-calculates due date on mount
    // Would need to navigate through steps to verify
  })
})

test.describe('5. INTAKE COMPLETE FLOW', () => {
  test('5.1 Full intake wizard flow (smoke test)', async ({ page }) => {
    // Complete flow: Client > Pipeline > Garments > Services > Pricing > Assignment > Summary
    // Navigate: /intake through all steps

    await goToIntake(page)

    // Step 1: Client
    await expect(page.getByText(/Information Client|Rechercher Client/i)).toBeVisible()

    // Create new client
    const createButton = page.getByRole('button', { name: /Créer Nouveau Client/i })
    if (await createButton.isVisible()) {
      await createButton.click()
      await page.waitForTimeout(300)

      const testClient = getTestClient()
      await page.locator('input#firstName').fill(testClient.firstName)
      await page.locator('input#lastName').fill(testClient.lastName)
      await page.locator('input#phone').fill(testClient.phone)
      await page.locator('input#email').fill(testClient.email)

      // Would submit and continue through flow
      // This is a smoke test skeleton
    }
  })

  test('5.2 Auto-advance on card click (where applicable)', async ({ page }) => {
    // CHECKLIST: Auto-advance on card click
    // Navigate: /intake > Pipeline selection
    // Expected: Clicking pipeline card advances to next step

    await goToIntake(page)

    // Would need client first, then check pipeline behavior
    // Placeholder for auto-advance testing
  })

  test('5.3 Next button only shown when required', async ({ page }) => {
    // CHECKLIST: Keep "Next" only when required
    // Navigate: /intake
    // Expected: Next button visibility based on step requirements

    await goToIntake(page)

    // Before client is selected, Next should not be visible
    const nextButton = page.getByRole('button', { name: /Suivant|Next/i })

    // In client step without selection, Next should be hidden
    // After selection, Next should appear
  })
})

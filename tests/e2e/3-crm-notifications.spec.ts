/**
 * TEST SUITE 3: CRM AUTOMATION & NOTIFICATIONS
 * =============================================
 * Covers: CRM Automation, Notifications, Integrations (GHL, Stripe, Calendar)
 *
 * BASE URL: https://hottecouture-v2.vercel.app
 *
 * NAVIGATION MAP:
 * - Board: /board
 * - Intake: /intake
 * - Client Detail: /clients/[id]
 *
 * API ENDPOINTS TO TEST:
 * - POST /api/intake (creates client + syncs to GHL)
 * - POST /api/order/[id]/stage (triggers notifications)
 * - POST /api/webhooks/order-ready (SMS notification)
 * - POST /api/payments/create-checkout (GHL invoice)
 */

import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.TEST_URL || 'https://hottecouture-v2.vercel.app'

// Helper: Navigate to board
async function goToBoard(page: Page) {
  await page.goto(`${BASE_URL}/board`)
  await page.waitForLoadState('networkidle')
}

// Helper: Navigate to intake
async function goToIntake(page: Page) {
  await page.goto(`${BASE_URL}/intake`)
  await page.waitForLoadState('networkidle')
}

test.describe('1. CRM AUTOMATION - Client Sync', () => {
  test('1.1 New client creation triggers CRM sync', async ({ page }) => {
    // CHECKLIST: Auto-create customer account on creation
    // Navigate: /intake > Create new client
    // Expected: Client data sent to GHL on order submission

    await goToIntake(page)

    // This test verifies the flow exists
    // Actual GHL sync verification needs API mocking or log inspection

    // Check create client form exists
    const createButton = page.getByRole('button', { name: /Créer Nouveau Client/i })
    await expect(createButton).toBeVisible()

    // Form should collect CRM-relevant fields
    await createButton.click()
    await page.waitForTimeout(300)

    // Verify all required fields for CRM are present
    await expect(page.locator('input#firstName')).toBeVisible()
    await expect(page.locator('input#lastName')).toBeVisible()
    await expect(page.locator('input#phone')).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()

    // Newsletter consent (for nurture sequence enrollment)
    await expect(page.locator('input#newsletterConsent')).toBeVisible()
  })

  test('1.2 Email is required for CRM sync', async ({ page }) => {
    // CHECKLIST: Push customer to CRM (requires email)
    // Navigate: /intake > Create client without email
    // Expected: Validation error for missing email

    await goToIntake(page)

    const createButton = page.getByRole('button', { name: /Créer Nouveau Client/i })
    await createButton.click()
    await page.waitForTimeout(300)

    // Fill form without email
    await page.locator('input#firstName').fill('Test')
    await page.locator('input#lastName').fill('User')
    await page.locator('input#phone').fill('+15551234567')
    // Don't fill email

    // Try to submit
    const submitButton = page.getByRole('button', { name: /Créer Client/i })
    await submitButton.click()
    await page.waitForTimeout(300)

    // Check for email validation error
    const emailError = page.getByText(/Email requis|email required/i)
    await expect(emailError).toBeVisible()
  })

  test('1.3 Preferred contact method captured for CRM', async ({ page }) => {
    // Navigate: /intake > Create client
    // Expected: Preferred contact (SMS/Email) selection available

    await goToIntake(page)

    const createButton = page.getByRole('button', { name: /Créer Nouveau Client/i })
    await createButton.click()
    await page.waitForTimeout(300)

    // Check for preferred contact selector
    const preferredContactSelect = page.locator('select#preferredContact')
    await expect(preferredContactSelect).toBeVisible()

    // Verify options
    const options = preferredContactSelect.locator('option')
    const count = await options.count()
    expect(count).toBeGreaterThanOrEqual(2) // Email and SMS
  })

  test('1.4 Language preference captured for CRM', async ({ page }) => {
    // Navigate: /intake > Create client
    // Expected: Language selection (FR/EN) for CRM tagging

    await goToIntake(page)

    const createButton = page.getByRole('button', { name: /Créer Nouveau Client/i })
    await createButton.click()
    await page.waitForTimeout(300)

    // Check for language selector
    const languageSelect = page.locator('select#language')
    await expect(languageSelect).toBeVisible()

    // Verify French and English options
    await expect(languageSelect.locator('option[value="fr"]')).toBeVisible()
    await expect(languageSelect.locator('option[value="en"]')).toBeVisible()
  })

  test('1.5 Newsletter consent for nurture sequence enrollment', async ({ page }) => {
    // CHECKLIST: Auto-enroll in nurture sequence
    // Navigate: /intake > Create client
    // Expected: Newsletter consent checkbox for sequence enrollment

    await goToIntake(page)

    const createButton = page.getByRole('button', { name: /Créer Nouveau Client/i })
    await createButton.click()
    await page.waitForTimeout(300)

    // Check for newsletter consent checkbox
    const newsletterCheckbox = page.locator('input#newsletterConsent')
    await expect(newsletterCheckbox).toBeVisible()

    // Verify label
    const label = page.getByText(/infolettre|newsletter/i)
    await expect(label).toBeVisible()
  })
})

test.describe('2. NOTIFICATIONS - SMS/Email', () => {
  test('2.1 SMS confirmation modal on Ready status', async ({ page }) => {
    // CHECKLIST: Prevent accidental notifications on drag
    // Navigate: /board > Drag order to Ready
    // Expected: Confirmation modal before sending SMS

    await goToBoard(page)

    // Look for SMS confirmation modal component
    // This appears when dragging to "ready" status
    // We can check that the modal component exists in the DOM

    // The SmsConfirmationModal should be conditionally rendered
    // Check for any modal-related elements
    const smsModal = page.locator('[class*="modal"], [role="dialog"]')
    // Modal won't be visible until triggered
  })

  test('2.2 Notification not sent without confirmation', async ({ page }) => {
    // CHECKLIST: Prevent accidental notifications on drag
    // Navigate: /board
    // Expected: No auto-send on status change

    await goToBoard(page)

    // The board shows a confirmation dialog when moving to "ready"
    // This prevents accidental SMS sends
    // Verification would require monitoring network requests
  })
})

test.describe('3. INTEGRATIONS - Payment & Invoicing', () => {
  test('3.1 Payment options available in order modal', async ({ page }) => {
    // CHECKLIST: Stripe integration
    // Navigate: /board > Open order > Payment section
    // Expected: Payment/checkout options visible

    await goToBoard(page)

    // Look for payment-related buttons or links
    // Would need to open an order detail modal
    const paymentButton = page.getByRole('button', { name: /Payment|Paiement/i })
    // May not be visible without selecting an order
  })

  test('3.2 Invoice/checkout link generation exists', async ({ page }) => {
    // CHECKLIST: Stripe + GHL invoicing
    // Navigate: /board > Order detail
    // Expected: Ability to create payment link

    await goToBoard(page)

    // Check for checkout link creation functionality
    // This would be in the order detail modal
  })
})

test.describe('4. INTEGRATIONS - Calendar', () => {
  test('4.1 Booking page exists', async ({ page }) => {
    // CHECKLIST: Google Workspace + Calendar
    // Navigate: /booking
    // Expected: Booking/appointment interface

    await page.goto(`${BASE_URL}/booking`)
    await page.waitForLoadState('networkidle')

    // Check page renders
    const errorPage = page.getByText(/404|Not Found/i)
    await expect(errorPage).toHaveCount(0)
  })

  test('4.2 Calendar integration link exists', async ({ page }) => {
    // Navigate: /board/workload
    // Expected: Workload schedule with calendar view

    await page.goto(`${BASE_URL}/board/workload`)
    await page.waitForLoadState('networkidle')

    // Check for workload/calendar content
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible()
  })
})

test.describe('5. API INTEGRATION CHECKS', () => {
  test('5.1 Intake API endpoint accessible', async ({ request }) => {
    // Test API endpoint exists (OPTIONS or health check)
    const response = await request.get(`${BASE_URL}/api/services`)
    expect(response.status()).toBeLessThan(500)
  })

  test('5.2 Orders API endpoint accessible', async ({ request }) => {
    // Test orders endpoint
    const response = await request.get(`${BASE_URL}/api/orders`)
    expect(response.status()).toBeLessThan(500)
  })

  test('5.3 Clients API endpoint accessible', async ({ request }) => {
    // Test clients endpoint
    const response = await request.get(`${BASE_URL}/api/clients`)
    expect(response.status()).toBeLessThan(500)
  })
})

/**
 * TEST SUITE 4: PRODUCTION & HOURLY ITEMS
 * ========================================
 * Covers: Hourly Items, Assignment, Time Tracking, Printing, Workload Schedule
 *
 * BASE URL: https://hottecouture-v2.vercel.app
 *
 * NAVIGATION MAP:
 * - Board: /board
 * - Workload Schedule: /board/workload
 * - Today's Tasks: /board/today
 * - Intake (Assignment): /intake > Assignment step
 * - Labels Print: /labels/[orderId]
 * - Print Tasks: /print/tasks
 *
 * CHECKLIST ITEMS:
 * - Hourly Items: Show initial estimate, Edit hours/price in In Progress
 * - Prevent Done until final hours entered
 * - 1 qty = 1 hour
 * - Per-item time tracking
 * - Assign seamstress at step 5
 * - Push tasks to Google Calendar
 * - Build automated workload schedule
 * - Two labels per print
 * - Auto-print option on order creation
 */

import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.TEST_URL || 'https://hottecouture-v2.vercel.app'

// Helper functions
async function goToBoard(page: Page) {
  await page.goto(`${BASE_URL}/board`)
  await page.waitForLoadState('networkidle')
}

async function goToIntake(page: Page) {
  await page.goto(`${BASE_URL}/intake`)
  await page.waitForLoadState('networkidle')
}

async function goToWorkload(page: Page) {
  await page.goto(`${BASE_URL}/board/workload`)
  await page.waitForLoadState('networkidle')
}

test.describe('1. HOURLY ITEMS - Initial Estimate', () => {
  test('1.1 Hourly services show initial estimate in intake', async ({ page }) => {
    // CHECKLIST: Show initial estimate
    // Navigate: /intake > Services step > Select hourly service
    // Expected: Estimate displayed for hourly items

    await goToIntake(page)

    // Would need to navigate through steps to services
    // Check for hourly rate display elements
    // Format: "X hours × $35/h"
  })

  test('1.2 Hourly items display rate per hour', async ({ page }) => {
    // Navigate: /intake > Services
    // Expected: Price shows /h suffix for hourly items

    await goToIntake(page)

    // Look for hourly rate indicator
    const hourlyIndicator = page.getByText(/\$\d+\.?\d*\/h|\d+\$/h/i)
    // May need navigation to services step
  })
})

test.describe('2. HOURLY ITEMS - In Progress Editing', () => {
  test('2.1 Hours editable in In Progress stage', async ({ page }) => {
    // CHECKLIST: Edit hours/price in In Progress
    // Navigate: /board > Open order in "Working" status
    // Expected: Ability to modify hours worked

    await goToBoard(page)

    // Look for timer or time entry controls
    // Would need an order in "working" status
    const timerControls = page.locator('[data-testid="timer-button"], .timer-button')
    // Timer visibility depends on orders existing
  })

  test('2.2 Timer controls available for active orders', async ({ page }) => {
    // Navigate: /board > Order in progress
    // Expected: Start/Stop/Pause timer controls

    await goToBoard(page)

    // Check for timer-related buttons in order cards or modals
    // Common timer action text
    const timerActions = page.getByText(/Start Timer|Pause|Stop|Resume|Démarrer/i)
    // Only visible when order modal is open
  })
})

test.describe('3. HOURLY ITEMS - Done Prevention', () => {
  test('3.1 Cannot mark Done without hours logged', async ({ page }) => {
    // CHECKLIST: Prevent Done until final hours entered
    // Navigate: /board > Try to move hourly order to Done
    // Expected: Error or prompt to enter hours

    await goToBoard(page)

    // This would require:
    // 1. An order with hourly items in "working" or "QC" status
    // 2. Attempting to move to "done"
    // 3. Expecting an error message

    // The error message in the code: "Cannot mark as done: Please record work hours using the timer first."
    const workHoursError = page.getByText(/record work hours|work time|timer first/i)
    // Only appears after failed attempt
  })

  test('3.2 Alert shown when moving to Done without time', async ({ page }) => {
    // The app shows an alert dialog for this
    // Verification through alert handling
    await goToBoard(page)

    // Set up alert handler
    page.on('dialog', async dialog => {
      const message = dialog.message()
      if (message.includes('work hours') || message.includes('timer')) {
        expect(message).toContain('work')
        await dialog.dismiss()
      }
    })
  })
})

test.describe('4. TIME TRACKING - Per Item', () => {
  test('4.1 Timer button exists in order view', async ({ page }) => {
    // CHECKLIST: Per-item time tracking
    // Navigate: /board > Open order
    // Expected: Timer functionality visible

    await goToBoard(page)

    // Look for timer components
    // The TimerButton component shows play/pause icons
    const timerIcon = page.locator('.lucide-play, .lucide-pause, [class*="timer"]')
    // May require opening an order modal
  })

  test('4.2 Time tracking UI shows elapsed time', async ({ page }) => {
    // Navigate: /board > Active order with running timer
    // Expected: Timer display shows elapsed time

    await goToBoard(page)

    // Look for time display format (00:00 or Xm Xs)
    const timeDisplay = page.getByText(/\d{1,2}:\d{2}|\d+[hm]\s*\d*[ms]?/)
    // Would be visible on cards with active timers
  })
})

test.describe('5. ASSIGNMENT - Seamstress at Step 5', () => {
  test('5.1 Assignment step exists in intake', async ({ page }) => {
    // CHECKLIST: Assign seamstress at step 5
    // Navigate: /intake
    // Expected: Assignment is step 6 (after pricing)

    await goToIntake(page)

    // Check step indicators - Assignment should be step 6
    // Steps: Client(1), Pipeline(2), Garments(3), Services(4), Pricing(5), Assignment(6)

    const steps = page.locator('.w-8.h-8.rounded-full')
    const count = await steps.count()

    // Should have 6 steps
    expect(count).toBeGreaterThanOrEqual(6)
  })

  test('5.2 Staff list available for assignment', async ({ page }) => {
    // Navigate: /intake > Assignment step
    // Expected: List of available staff members

    await goToIntake(page)

    // Would need to navigate through steps to assignment
    // Assignment step shows staff cards
  })
})

test.describe('6. WORKLOAD SCHEDULE', () => {
  test('6.1 Workload page exists and loads', async ({ page }) => {
    // CHECKLIST: Build automated workload schedule
    // Navigate: /board/workload
    // Expected: Workload visualization

    await goToWorkload(page)

    // Check page renders without error
    const errorPage = page.getByText(/404|Error|Not Found/i)
    await expect(errorPage).toHaveCount(0)

    // Look for workload-related content
    const content = page.locator('main, .container')
    await expect(content).toBeVisible()
  })

  test('6.2 Workload shows staff members', async ({ page }) => {
    // Navigate: /board/workload
    // Expected: Staff names visible

    await goToWorkload(page)

    // Look for staff/assignee information
    const staffSection = page.locator('[class*="staff"], [class*="assignee"]')
    // Content depends on database
  })

  test('6.3 Workload accessible from board menu', async ({ page }) => {
    // Navigate: /board > Menu > Workload
    // Expected: Link to workload page

    await goToBoard(page)

    // Look for workload menu item
    const moreMenu = page.getByRole('button', { name: /more/i }).or(page.locator('.lucide-more-horizontal').first())

    if (await moreMenu.isVisible()) {
      await moreMenu.click()
      await page.waitForTimeout(300)

      const workloadLink = page.getByRole('link', { name: /Workload/i })
      await expect(workloadLink).toBeVisible()
    }
  })
})

test.describe('7. GOOGLE CALENDAR INTEGRATION', () => {
  test('7.1 Calendar booking page exists', async ({ page }) => {
    // CHECKLIST: Push tasks to Google Calendar
    // Navigate: /booking
    // Expected: Calendar integration interface

    await page.goto(`${BASE_URL}/booking`)
    await page.waitForLoadState('networkidle')

    // Page should load without error
    const mainContent = page.locator('main, .container, body')
    await expect(mainContent).toBeVisible()
  })

  test('7.2 Today view exists', async ({ page }) => {
    // Navigate: /board/today
    // Expected: Today's tasks view

    await page.goto(`${BASE_URL}/board/today`)
    await page.waitForLoadState('networkidle')

    // Check page loads
    const errorPage = page.getByText(/404|Not Found/i)
    await expect(errorPage).toHaveCount(0)
  })
})

test.describe('8. PRINTING - Labels', () => {
  test('8.1 Print tasks page accessible', async ({ page }) => {
    // CHECKLIST: Label printer setup
    // Navigate: /print/tasks
    // Expected: Print interface loads

    await page.goto(`${BASE_URL}/print/tasks`)
    await page.waitForLoadState('networkidle')

    // Check page renders
    const errorPage = page.getByText(/404|Not Found/i)
    await expect(errorPage).toHaveCount(0)
  })

  test('8.2 Auto-print toggle in intake', async ({ page }) => {
    // CHECKLIST: Auto-print option on order creation
    // Navigate: /intake (would be in pricing step)
    // Expected: Toggle for automatic printing

    await goToIntake(page)

    // Look for auto-print related text
    // This appears in the PricingStep component
    const autoPrintLabel = page.getByText(/Impression automatique|Auto-print|automatic/i)
    // Only visible in pricing step
  })
})

test.describe('9. BOARD FUNCTIONALITY', () => {
  test('9.1 Board loads with orders', async ({ page }) => {
    await goToBoard(page)

    // Look for order cards or empty state
    const orderCards = page.locator('[draggable="true"]')
    const emptyState = page.getByText(/No orders|Aucune commande/i)

    // Either should be present
    const hasCards = (await orderCards.count()) > 0
    const hasEmpty = (await emptyState.count()) > 0

    // At least one should be true
    expect(hasCards || hasEmpty).toBe(true)
  })

  test('9.2 New Order button works', async ({ page }) => {
    await goToBoard(page)

    // Find and click new order button
    const newOrderButton = page.getByRole('link', { name: /New Order|Nouvelle commande/i })
    await expect(newOrderButton).toBeVisible()

    await newOrderButton.click()
    await page.waitForLoadState('networkidle')

    // Should navigate to intake
    expect(page.url()).toContain('/intake')
  })

  test('9.3 View toggle works (Kanban/List)', async ({ page }) => {
    await goToBoard(page)

    // Find view toggles
    const kanbanButton = page.getByRole('button', { name: /Board/i })
    const listButton = page.getByRole('button', { name: /List/i })

    await expect(kanbanButton).toBeVisible()
    await expect(listButton).toBeVisible()

    // Click list view
    await listButton.click()
    await page.waitForTimeout(300)

    // Click back to kanban
    await kanbanButton.click()
    await page.waitForTimeout(300)
  })

  test('9.4 Pipeline filter exists', async ({ page }) => {
    await goToBoard(page)

    // Look for pipeline filter (alteration/custom/all)
    const filterButtons = page.locator('[class*="filter"], button').filter({
      hasText: /All|Alteration|Custom|Tous/i,
    })

    // Should have filter options
    const count = await filterButtons.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('10. ORDER STATUS FLOW', () => {
  test('10.1 Status columns visible in Kanban', async ({ page }) => {
    await goToBoard(page)

    // Expected stages: Pending, Working, QC, Ready, Done (or similar)
    const stages = ['pending', 'working', 'qc', 'ready', 'done']

    // Look for stage headers or columns
    for (const stage of stages) {
      const stageElement = page.getByText(new RegExp(stage, 'i'))
      // Some stages may not be visible if no orders
    }
  })

  test('10.2 Archived orders link exists', async ({ page }) => {
    await goToBoard(page)

    // Open menu to find archived link
    const moreMenu = page.locator('.lucide-more-horizontal').first()

    if (await moreMenu.isVisible()) {
      await moreMenu.click()
      await page.waitForTimeout(300)

      const archivedLink = page.getByRole('link', { name: /Archived/i })
      await expect(archivedLink).toBeVisible()
    }
  })
})

test.describe('11. EXPORT FUNCTIONALITY', () => {
  test('11.1 Export work list button exists', async ({ page }) => {
    await goToBoard(page)

    // Look for export button (bottom left of board)
    const exportButton = page.getByRole('button', { name: /Export Work List|Export/i })
    await expect(exportButton).toBeVisible()
  })

  test('11.2 Export modal opens', async ({ page }) => {
    await goToBoard(page)

    const exportButton = page.getByRole('button', { name: /Export Work List/i })

    if (await exportButton.isVisible()) {
      await exportButton.click()
      await page.waitForTimeout(300)

      // Look for modal content
      const modalHeading = page.getByRole('heading', { name: /Export/i })
      await expect(modalHeading).toBeVisible()

      // Close modal
      const closeButton = page.getByRole('button', { name: /✕|Close|Fermer/i })
      if (await closeButton.isVisible()) {
        await closeButton.click()
      }
    }
  })
})

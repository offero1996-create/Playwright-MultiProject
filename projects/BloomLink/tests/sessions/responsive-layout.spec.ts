import { test, expect } from '@playwright/test';
import { BloomLinkHomePage } from '../../pages/bloomlink-home.page';
import { SessionsPage } from '../../pages/sessions.page';
import { CreateSessionPage } from '../../pages/create-session.page';
import { loginAndGoToSessions } from '../../utils/navigation-helper';
import { users } from '../../test-data/users';
import { STANDARD_VIEWPORTS, ViewportConfig } from '../../../../utils/responsive-helper';

/**
 * Responsive Layout Tests for BloomLink
 * 
 * Tests UI elements stay within bounds across multiple screen resolutions.
 * Covers: Home Page, Sessions Page, Create Session Form
 */

const user = users.owner;

// Viewports to test - common screen resolutions
const TEST_VIEWPORTS: ViewportConfig[] = [
  { width: 1920, height: 1080, name: 'Full HD' },
  { width: 1680, height: 1050, name: 'Large Desktop' },
  { width: 1600, height: 900, name: 'Desktop HD+' },
  { width: 1440, height: 900, name: 'MacBook Pro' },
  { width: 1366, height: 768, name: 'Common Laptop' },
  { width: 1280, height: 720, name: 'HD Laptop' },
];

test.describe('BloomLink - Responsive Layout Tests', () => {
  // Run tests in serial mode to prevent test pollution (test #5 creates sessions that affect #4)
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  let bloomLinkPage: any;
  let homePage: BloomLinkHomePage;
  let sessionsPage: SessionsPage;
  let createSessionPage: CreateSessionPage;

  test.beforeEach(async ({ page, context }) => {
    // Login and navigate to BloomLink
    bloomLinkPage = await loginAndGoToSessions(page, context, user.email, user.password, 'Responsive');
  });

  test('Home Page - All elements within bounds at all resolutions', async () => {
    homePage = new BloomLinkHomePage(bloomLinkPage);
    
    // Navigate to home
    await homePage.navigateToHome();
    await bloomLinkPage.waitForLoadState('domcontentloaded');

    // Run responsive checks
    const summaries = await homePage.runResponsiveChecks(TEST_VIEWPORTS);
    
    // Print report
    homePage.responsiveHelper.printReport(summaries);

    // Assert no failures
    for (const summary of summaries) {
      expect(
        summary.failedElements,
        `Home Page has ${summary.failedElements} overflowing elements at ${summary.resolution}`
      ).toBe(0);
      
      expect(
        summary.hasHorizontalScroll,
        `Home Page has horizontal scroll at ${summary.resolution}`
      ).toBe(false);
    }
  });

  test('Sessions Page - All elements within bounds at all resolutions', async () => {
    sessionsPage = new SessionsPage(bloomLinkPage);
    
    // Navigate to sessions
    await sessionsPage.navigateViaSidebar();
    await sessionsPage.waitForSessionsToLoad();

    // Run responsive checks
    const summaries = await sessionsPage.runResponsiveChecks(TEST_VIEWPORTS);
    
    // Print report
    sessionsPage.printResponsiveReport(summaries);

    // Assert no failures
    for (const summary of summaries) {
      expect(
        summary.failedElements,
        `Sessions Page has ${summary.failedElements} overflowing elements at ${summary.resolution}`
      ).toBe(0);
      
      expect(
        summary.hasHorizontalScroll,
        `Sessions Page has horizontal scroll at ${summary.resolution}`
      ).toBe(false);
    }
  });

  test('Create Session Form - All elements within bounds at all resolutions', async () => {
    sessionsPage = new SessionsPage(bloomLinkPage);
    createSessionPage = new CreateSessionPage(bloomLinkPage);
    
    // Navigate to create session form
    await sessionsPage.navigateViaSidebar();
    await sessionsPage.clickCreateSessionViaMouse();
    await createSessionPage.pageHeading.waitFor({ state: 'visible', timeout: 30000 });

    // Run responsive checks
    const summaries = await createSessionPage.runResponsiveChecks(TEST_VIEWPORTS);
    
    // Print report
    createSessionPage.responsiveHelper.printReport(summaries);

    // Assert no failures
    for (const summary of summaries) {
      expect(
        summary.failedElements,
        `Create Session Form has ${summary.failedElements} overflowing elements at ${summary.resolution}`
      ).toBe(0);
      
      expect(
        summary.hasHorizontalScroll,
        `Create Session Form has horizontal scroll at ${summary.resolution}`
      ).toBe(false);
    }
  });

  test('Sessions Page - Session card buttons stay within cards at all resolutions', async () => {
    sessionsPage = new SessionsPage(bloomLinkPage);
    
    // Navigate to sessions
    await sessionsPage.navigateViaSidebar();
    await sessionsPage.waitForSessionsToLoad();

    const allOverflows: { resolution: string; overflows: any[] }[] = [];

    for (const viewport of TEST_VIEWPORTS) {
      await sessionsPage.setViewport(viewport.width, viewport.height);
      await bloomLinkPage.waitForTimeout(500);
      
      const overflows = await sessionsPage.checkButtonsWithinCards();
      
      if (overflows.length > 0) {
        allOverflows.push({
          resolution: `${viewport.width}x${viewport.height} (${viewport.name})`,
          overflows
        });
      }
    }

    // Print detailed report
    if (allOverflows.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('         SESSION CARD BUTTON OVERFLOW REPORT                 ');
      console.log('═══════════════════════════════════════════════════════════\n');
      
      for (const { resolution, overflows } of allOverflows) {
        console.log(`❌ ${resolution}`);
        for (const o of overflows) {
          console.log(`   - "${o.button}" in card ${o.card} overflows by ${o.overflow}px`);
        }
        console.log('');
      }
    }

    // Assert no button overflows
    expect(
      allOverflows.length,
      `Session card buttons overflow at ${allOverflows.length} resolution(s)`
    ).toBe(0);
  });

  test('Full Flow - Create session for tomorrow and verify Scheduled/Cancel buttons visible', async () => {
    sessionsPage = new SessionsPage(bloomLinkPage);
    createSessionPage = new CreateSessionPage(bloomLinkPage);
    
    // Navigate to create session
    await sessionsPage.navigateViaSidebar();
    await sessionsPage.clickCreateSessionViaMouse();
    await createSessionPage.pageHeading.waitFor({ state: 'visible', timeout: 30000 });

    // Create session for tomorrow
    await createSessionPage.createSessionForTomorrow(
      users.admin.displayName || 'OfferoAdmin',
      'ResponsiveTest',
      'Automated responsive layout test session'
    );

    // Wait for redirect to sessions page
    await sessionsPage.waitForSessionsToLoad();
    await bloomLinkPage.waitForTimeout(2000);

    // Verify Scheduled and Cancel Session buttons at each resolution
    const scheduledButton = bloomLinkPage.getByRole('button', { name: 'Scheduled' }).first();
    const cancelButton = bloomLinkPage.getByRole('button', { name: 'Cancel Session' }).first();

    const buttonResults: { resolution: string; scheduledVisible: boolean; cancelVisible: boolean; overflow: boolean }[] = [];

    for (const viewport of TEST_VIEWPORTS) {
      await sessionsPage.setViewport(viewport.width, viewport.height);
      await bloomLinkPage.waitForTimeout(500);

      const scheduledVisible = await scheduledButton.isVisible().catch(() => false);
      const cancelVisible = await cancelButton.isVisible().catch(() => false);

      // Check bounds
      let overflow = false;
      if (scheduledVisible) {
        const result = await sessionsPage.responsiveHelper.checkElementHorizontalBounds(scheduledButton, 'Scheduled');
        if (!result.isWithinBounds) overflow = true;
      }
      if (cancelVisible) {
        const result = await sessionsPage.responsiveHelper.checkElementHorizontalBounds(cancelButton, 'Cancel Session');
        if (!result.isWithinBounds) overflow = true;
      }

      buttonResults.push({
        resolution: `${viewport.width}x${viewport.height}`,
        scheduledVisible,
        cancelVisible,
        overflow
      });
    }

    // Print results
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('      SCHEDULED/CANCEL BUTTON VISIBILITY REPORT              ');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Resolution      | Scheduled | Cancel | Overflow');
    console.log('────────────────┼───────────┼────────┼─────────');
    
    for (const r of buttonResults) {
      const sched = r.scheduledVisible ? '✅' : '❌';
      const cancel = r.cancelVisible ? '✅' : '❌';
      const over = r.overflow ? '❌ YES' : '✅ NO';
      console.log(`${r.resolution.padEnd(15)} | ${sched.padEnd(9)} | ${cancel.padEnd(6)} | ${over}`);
    }
    console.log('');

    // Assert all buttons visible and no overflow
    for (const r of buttonResults) {
      expect(r.scheduledVisible, `Scheduled button not visible at ${r.resolution}`).toBe(true);
      expect(r.cancelVisible, `Cancel button not visible at ${r.resolution}`).toBe(true);
      expect(r.overflow, `Buttons overflow at ${r.resolution}`).toBe(false);
    }
  });
});

test.describe('BloomLink - Individual Resolution Tests', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  let bloomLinkPage: any;

  test.beforeEach(async ({ page, context }) => {
    bloomLinkPage = await loginAndGoToSessions(page, context, user.email, user.password, 'Responsive');
  });

  // Generate individual tests for critical resolution (1366x768)
  test('1366x768 - Sessions Page elements within bounds', async () => {
    const sessionsPage = new SessionsPage(bloomLinkPage);
    
    await sessionsPage.navigateViaSidebar();
    await sessionsPage.waitForSessionsToLoad();
    
    // Set to problematic resolution
    await sessionsPage.setViewport(1366, 768);
    await bloomLinkPage.waitForTimeout(500);

    // Assert all elements within bounds
    await sessionsPage.assertAllElementsWithinBounds();

    // Take screenshot for visual verification
    await sessionsPage.takeResponsiveScreenshot(1366, 768);
  });

  test('1366x768 - Create Session Form elements within bounds', async () => {
    const sessionsPage = new SessionsPage(bloomLinkPage);
    const createSessionPage = new CreateSessionPage(bloomLinkPage);
    
    await sessionsPage.navigateViaSidebar();
    await sessionsPage.clickCreateSessionViaMouse();
    await createSessionPage.pageHeading.waitFor({ state: 'visible', timeout: 30000 });
    
    // Set to problematic resolution
    await createSessionPage.setViewport(1366, 768);
    await bloomLinkPage.waitForTimeout(500);

    // Assert all elements within bounds
    await createSessionPage.assertAllElementsWithinBounds();

    // Take screenshot for visual verification
    await createSessionPage.takeResponsiveScreenshot(1366, 768);
  });

  test('1280x720 - Sessions Page elements within bounds', async () => {
    const sessionsPage = new SessionsPage(bloomLinkPage);
    
    await sessionsPage.navigateViaSidebar();
    await sessionsPage.waitForSessionsToLoad();
    
    // Set to smaller resolution
    await sessionsPage.setViewport(1280, 720);
    await bloomLinkPage.waitForTimeout(500);

    // Assert all elements within bounds
    await sessionsPage.assertAllElementsWithinBounds();

    // Take screenshot for visual verification
    await sessionsPage.takeResponsiveScreenshot(1280, 720);
  });
});

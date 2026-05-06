/**
 * BloomLink Navigation helpers for complex multi-page workflows.
 */

import { Page, BrowserContext, Browser, chromium } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { MessagesPage } from '../pages/messages.page';
import { testConfig } from '../../../config/testConfig';
import { urls } from '../test-data/urls';
import { users } from '../test-data/users';

export interface NavigationResult {
  bloomLinkPage: Page;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
}

/**
 * Complete login flow: Login → Dashboard → BloomLink → Sessions page.
 * @param page - Playwright Page instance
 * @param context - Browser context (for handling new tabs)
 * @param email - User email
 * @param password - User password
 * @param label - Label for logging (e.g., 'User1', 'Owner')
 * @returns The BloomLink page instance on Sessions
 */
export async function loginAndGoToSessions(
  page: Page,
  context: BrowserContext,
  email: string,
  password: string,
  label: string
): Promise<Page> {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  // Login to platform
  await page.goto(urls.platformLogin);
  await loginPage.login(email, password);
  await dashboardPage.waitForDashboardReady();
  console.log(`[${label}] Logged in as ${email}`);

  // Open BloomLink via dropdown (SSO auth is passed through the new tab)
  const bloomLinkPagePromise = context.waitForEvent('page', { timeout: 15000 });
  await dashboardPage.openUserDropdown();
  await dashboardPage.bloomLinkMenuItem.click();
  const bloomLinkPage = await bloomLinkPagePromise;

  // Wait for the new tab to finish loading and settle on its final URL
  await bloomLinkPage.waitForLoadState('domcontentloaded');
  await bloomLinkPage.waitForTimeout(3000); // allow any redirects to complete
  await bloomLinkPage.bringToFront();
  const allPages = context.pages();
  console.log(`[${label}] All pages in context (${allPages.length}): ${allPages.map(p => p.url()).join(' | ')}`);
  console.log(`[${label}] Captured BloomLink tab URL: ${bloomLinkPage.url()}`);

  // Grant media permissions
  await context.grantPermissions(['camera', 'microphone'], { origin: urls.bloomLinkOrigin });

  // Wait for "Please wait" spinner to clear before interacting with sidebar
  const pleaseWait = bloomLinkPage.getByText('Please wait');
  await pleaseWait.waitFor({ state: 'hidden', timeout: testConfig.timeouts.pageLoad }).catch(() => {});

  // Navigate to Sessions via sidebar link (SPA navigation — avoids SSO redirect)
  const sessionsLink = bloomLinkPage.getByRole('link', { name: 'Sessions' });
  await sessionsLink.waitFor({ state: 'visible', timeout: 90000 });
  await sessionsLink.click();
  await bloomLinkPage.waitForLoadState('domcontentloaded');
  await pleaseWait.waitFor({ state: 'hidden', timeout: testConfig.timeouts.pageLoad }).catch(() => {});
  console.log(`[${label}] On Sessions list: ${bloomLinkPage.url()}`);

  console.log(`[${label}] On Sessions page.`);
  return bloomLinkPage;
}

/**
 * Login and navigate to Dashboard only.
 * @returns Object containing page instances
 */
export async function loginToDashboard(
  page: Page,
  email: string,
  password: string
): Promise<{ loginPage: LoginPage; dashboardPage: DashboardPage }> {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await page.goto(urls.platformLogin);
  await loginPage.login(email, password);
  await dashboardPage.waitForDashboardReady();

  return { loginPage, dashboardPage };
}

/**
 * Open BloomLink from Dashboard in a new tab.
 * @returns The BloomLink page instance
 */
export async function openBloomLinkFromDashboard(
  dashboardPage: DashboardPage,
  context: BrowserContext
): Promise<Page> {
  const bloomLinkPagePromise = context.waitForEvent('page');
  await dashboardPage.openUserDropdown();
  await dashboardPage.bloomLinkMenuItem.click();
  const bloomLinkPage = await bloomLinkPagePromise;
  await bloomLinkPage.waitForLoadState('domcontentloaded');
  await bloomLinkPage.bringToFront();

  // Grant media permissions
  await context.grantPermissions(['camera', 'microphone'], { origin: urls.bloomLinkOrigin });

  return bloomLinkPage;
}

/**
 * Login → BloomLink → Messages → select or start conversation.
 * @param page - Playwright Page instance
 * @param context - Browser context
 * @param user - User credentials object with email, password, displayName
 * @param recipientName - Display name of conversation recipient
 * @param label - Label for logging (e.g., 'User1', 'User2')
 * @returns Object containing bloomLinkPage and messagesPage
 */
export async function loginAndOpenConversation(
  page: Page,
  context: BrowserContext,
  user: typeof users.owner,
  recipientName: string,
  label: string,
): Promise<{ bloomLinkPage: Page; messagesPage: MessagesPage }> {
  const bloomLinkPage = await loginAndGoToSessions(page, context, user.email, user.password, label);

  const messagesPage = new MessagesPage(bloomLinkPage);
  await messagesPage.navigateToMessages();
  console.log(`[${label}] On Messages page.`);

  const firstName = recipientName.split(' ')[0];
  const conversationExists = await messagesPage.isConversationVisible(firstName);

  if (conversationExists) {
    await messagesPage.selectConversation(recipientName);
    console.log(`[${label}] Selected existing conversation with ${recipientName}.`);
  } else {
    await messagesPage.startNewConversation(recipientName);
    console.log(`[${label}] Started new conversation with ${recipientName}.`);
  }

  return { bloomLinkPage, messagesPage };
}

export interface SecondBrowserSession {
  browser: Browser;
  page: Page;
  context: BrowserContext;
}

/**
 * Launch a second browser instance for multi-user message tests.
 * Centralizes headless detection, viewport config, and optional context options.
 * @param contextOptions - Additional context options (e.g., { acceptDownloads: true })
 * @returns Object containing browser, context, and page
 */
export async function launchSecondBrowser(
  contextOptions: Record<string, unknown> = {},
): Promise<SecondBrowserSession> {
  const headless = process.env.HEADLESS === 'true' || !!process.env.CI;
  const browser = await chromium.launch({
    headless,
    args: headless ? [] : ['--start-maximized'],
  });
  const context = await browser.newContext({
    viewport: headless ? { width: 1920, height: 1080 } : null,
    ...contextOptions,
  });
  const page = await context.newPage();
  return { browser, page, context };
}

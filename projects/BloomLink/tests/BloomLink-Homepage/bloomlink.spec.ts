import { test } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { BloomLinkHomePage } from '../../pages/bloomlink-home.page';
import { users } from '../../test-data/users';
import { urls } from '../../test-data/urls';
import { assertVisible, assertTextContains } from '../../../../utils/assertions/ui';
import { assertUrlContains } from '../../../../utils/assertions/navigation';

test.describe('BloomLink Navigation', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    await page.goto(urls.platformLogin);
    await loginPage.login(users.alternate.email, users.alternate.password);
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  });

  test('Navigate to BloomLink and verify homepage elements', async ({ context }) => {
    await dashboardPage.openUserDropdown();
    await dashboardPage.bloomLinkMenuItem.click();

    const newPage = await context.waitForEvent('page', { timeout: 10000 });
    await newPage.waitForLoadState('domcontentloaded');

    const bloomLinkTitle = await newPage.title();
    assertTextContains(bloomLinkTitle, 'Bloomlink', 'BloomLink page title');
    assertUrlContains(newPage, 'bloomlink.bloomifai.com', 'BloomLink URL');

    const bloomLinkPage = new BloomLinkHomePage(newPage);
    await assertVisible(bloomLinkPage.welcomeMessage, 'Welcome message');
    await assertVisible(bloomLinkPage.welcomeHeading, 'Welcome heading');

    await assertVisible(bloomLinkPage.homeLink, 'Home sidebar link');
    await assertVisible(bloomLinkPage.sessionsLink, 'Sessions sidebar link');
    await assertVisible(bloomLinkPage.teamLink, 'Team sidebar link');
    await assertVisible(bloomLinkPage.messagesLink, 'Messages sidebar link');
  });
});

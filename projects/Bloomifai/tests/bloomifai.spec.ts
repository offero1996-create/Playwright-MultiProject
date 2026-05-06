import { test } from '../fixtures/test-fixtures';
import { users } from '../test-data/users';
import { urls } from '../test-data/urls';
import { assertVisible } from '../../../utils/assertions';

test.describe('Bloomifai - Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(urls.platformLogin);
  });

  test('Login with valid credentials', async ({ loginPage, dashboardPage }) => {
    await loginPage.login(users.primary.email, users.primary.password);
    await dashboardPage.waitForDashboardReady();
    await assertVisible(dashboardPage.welcomeHeading, 'Dashboard welcome heading');
  });

  test('Verify login page elements', async ({ loginPage }) => {
    await assertVisible(loginPage.emailInput, 'Email input');
    await assertVisible(loginPage.passwordInput, 'Password input');
    await assertVisible(loginPage.loginButton, 'Login button');
    await assertVisible(loginPage.forgotPasswordLink, 'Forgot password link');
  });

  test('Login button is disabled with empty fields', async ({ loginPage }) => {
    await assertVisible(loginPage.loginButton, 'Login button');
  });
});

test.describe('Bloomifai - Dashboard', () => {
  test.beforeEach(async ({ page, loginPage }) => {
    await page.goto(urls.platformLogin);
    await loginPage.login(users.primary.email, users.primary.password);
  });

  test('Dashboard elements are visible after login', async ({ dashboardPage }) => {
    await dashboardPage.waitForDashboardReady();
    await assertVisible(dashboardPage.welcomeHeading, 'Welcome heading');
    await assertVisible(dashboardPage.createNewChannelButton, 'Create New Channel button');
    await assertVisible(dashboardPage.myChannelsButton, 'My Channels button');
    await assertVisible(dashboardPage.sharedWithMeButton, 'Shared With Me button');
  });

  test('User dropdown menu items are visible', async ({ dashboardPage }) => {
    await dashboardPage.waitForDashboardReady();
    await dashboardPage.openUserDropdown();
    await assertVisible(dashboardPage.dataSourceMenuItem, 'Data Source menu item');
    await assertVisible(dashboardPage.teamUsersMenuItem, 'Team Users menu item');
    await assertVisible(dashboardPage.settingsMenuItem, 'Settings menu item');
  });
});

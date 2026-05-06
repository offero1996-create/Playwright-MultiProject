import { Page, Locator } from '@playwright/test';
import { PageHelper } from '../../../utils/page-helper';
import { testConfig } from '../../../config/testConfig';

/**
 * Bloomifai Dashboard Page
 * Page object for the Bloomifai platform main dashboard.
 */
export class DashboardPage extends PageHelper {
  // Header/Navigation locators
  readonly userProfileDropdown: Locator;
  readonly welcomeHeading: Locator;
  readonly createNewChannelButton: Locator;

  // Sidebar navigation
  readonly myChannelsButton: Locator;
  readonly sharedWithMeButton: Locator;

  // Dropdown menu items
  readonly dataSourceMenuItem: Locator;
  readonly teamUsersMenuItem: Locator;
  readonly settingsMenuItem: Locator;
  readonly bloomLinkMenuItem: Locator;
  readonly budSkillsMenuItem: Locator;
  readonly logoutMenuItem: Locator;

  // Search and filters
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);

    // Header elements
    this.userProfileDropdown = page.locator('nav').locator('div').last();
    this.welcomeHeading = page.getByRole('heading', { name: /Welcome,/ });
    this.createNewChannelButton = page.getByRole('button', { name: 'Create New Channel' }).first();

    // Sidebar navigation
    this.myChannelsButton = page.getByRole('button', { name: 'My Channels' });
    this.sharedWithMeButton = page.getByRole('button', { name: 'Shared With Me' });

    // Dropdown menu items
    this.dataSourceMenuItem = page.getByText('Data source');
    this.teamUsersMenuItem = page.getByText('Team users');
    this.settingsMenuItem = page.getByText('Settings');
    this.bloomLinkMenuItem = page.getByText('BloomLink');
    this.budSkillsMenuItem = page.getByText('Bud Skills');
    this.logoutMenuItem = page.getByText('Log out');

    // Search
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
  }

  async openUserDropdown() {
    await this.userProfileDropdown.click();
  }

  async waitForDashboardReady(timeout = testConfig.timeouts.pageLoad) {
    await this.welcomeHeading.waitFor({ state: 'visible', timeout });
    await this.createNewChannelButton.waitFor({ state: 'visible', timeout });
  }

  async navigateToDataSource() {
    await this.openUserDropdown();
    await this.dataSourceMenuItem.click();
  }

  async navigateToTeamUsers() {
    await this.openUserDropdown();
    await this.teamUsersMenuItem.click();
  }

  async navigateToSettings() {
    await this.openUserDropdown();
    await this.settingsMenuItem.click();
  }

  async logout() {
    await this.openUserDropdown();
    await this.logoutMenuItem.click();
  }

  async isWelcomeHeadingVisible(): Promise<boolean> {
    return await this.welcomeHeading.isVisible();
  }

  async getWelcomeText(): Promise<string> {
    return await this.welcomeHeading.textContent() || '';
  }
}

import { Page, Locator } from '@playwright/test';
import { PageHelper } from '../../../utils/page-helper';
import { testConfig } from '../../../config/testConfig';

export class DashboardPage extends PageHelper {
  // Header/Navigation locators
  readonly userProfileDropdown: Locator;
  readonly userNameText: Locator;
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
  readonly faqSupportMenuItem: Locator;
  readonly logoutMenuItem: Locator;

  // Search and filters
  readonly searchInput: Locator;
  readonly showOnlyKPIReportsToggle: Locator;

  constructor(page: Page) {
    super(page);

    // Header elements
    this.userProfileDropdown = page.locator('nav').locator('div').last();
    this.userNameText = page.locator('nav').locator('div').last();
    this.welcomeHeading = page.getByRole('heading', { name: /Welcome,/ });
    this.createNewChannelButton = page.getByRole('button', { name: 'Create New Channel' }).first();

    // Sidebar navigation
    this.myChannelsButton = page.getByRole('button', { name: 'My Channels' });
    this.sharedWithMeButton = page.getByRole('button', { name: 'Shared With Me' });

    // Dropdown menu items — scoped to the visible dropdown list to avoid matching sidebar/other elements
    const dropdownList = page.locator('ul').filter({ hasText: 'BloomLink' }).filter({ hasText: 'Log out' }).last();
    this.dataSourceMenuItem = dropdownList.getByText('Data source');
    this.teamUsersMenuItem = dropdownList.getByText('Team users');
    this.settingsMenuItem = dropdownList.getByText('Settings');
    this.bloomLinkMenuItem = dropdownList.getByText('BloomLink');
    this.budSkillsMenuItem = dropdownList.getByText('Bud Skills');
    this.faqSupportMenuItem = dropdownList.getByText('FAQ & Support');
    this.logoutMenuItem = dropdownList.getByText('Log out');

    // Search and filters
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    this.showOnlyKPIReportsToggle = page.getByRole('button', { name: "Show only KPI's Reports" });
  }

  async openUserDropdown() {
    await this.userProfileDropdown.click();
  }

  async waitForDashboardReady(timeout = testConfig.timeouts.pageLoad) {
    await this.welcomeHeading.waitFor({ state: 'visible', timeout });
    await this.createNewChannelButton.waitFor({ state: 'visible', timeout });
  }

  async navigateToBloomLink() {
    await this.openUserDropdown();
    await this.bloomLinkMenuItem.click();
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

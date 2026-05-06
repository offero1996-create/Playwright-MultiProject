import { Page, Locator } from '@playwright/test';
import { PageHelper } from '../../../utils/page-helper';
import { ResponsiveHelper, ResponsiveCheckSummary, ViewportConfig, STANDARD_VIEWPORTS } from '../../../utils/responsive-helper';

export class BloomLinkHomePage extends PageHelper {
  readonly responsiveHelper: ResponsiveHelper;
  // Sidebar navigation
  readonly homeLink: Locator;
  readonly sessionsLink: Locator;
  readonly teamLink: Locator;
  readonly messagesLink: Locator;

  // Main content
  readonly welcomeHeading: Locator;
  readonly welcomeMessage: Locator;
  readonly ongoingAppointmentsText: Locator;
  readonly virtuOwlLogo: Locator;

  // Session tabs
  readonly upcomingSessionsTab: Locator;
  readonly recentSessionsTab: Locator;

  constructor(page: Page) {
    super(page);
    this.responsiveHelper = new ResponsiveHelper(page);

    // Sidebar navigation
    this.homeLink = page.getByRole('link', { name: 'Home' });
    this.sessionsLink = page.getByRole('link', { name: 'Sessions' });
    this.teamLink = page.getByRole('link', { name: 'Team' });
    this.messagesLink = page.getByRole('link', { name: /Messages/ });

    // Main content
    this.welcomeHeading = page.getByRole('heading', { name: /Hi,/ });
    this.welcomeMessage = page.getByText('Welcome To Bloomlink!');
    this.ongoingAppointmentsText = page.getByText('Ongoing Appointments');
    this.virtuOwlLogo = page.getByAltText('VirtuOwl');

    // Session tabs
    this.upcomingSessionsTab = page.getByRole('button', { name: 'Upcoming Sessions' });
    this.recentSessionsTab = page.getByRole('button', { name: 'Recent Sessions' });
  }

  async navigateToHome() {
    await this.homeLink.click();
  }

  async navigateToSessions() {
    await this.sessionsLink.click();
  }

  async navigateToTeam() {
    await this.teamLink.click();
  }

  async navigateToMessages() {
    await this.messagesLink.click();
  }

  async selectUpcomingSessions() {
    await this.upcomingSessionsTab.click();
  }

  async selectRecentSessions() {
    await this.recentSessionsTab.click();
  }

  async isWelcomeMessageVisible(): Promise<boolean> {
    return await this.welcomeMessage.isVisible();
  }

  async getWelcomeHeadingText(): Promise<string> {
    return await this.welcomeHeading.textContent() || '';
  }

  // ═══════════════════════════════════════════════════════════════
  // RESPONSIVE TESTING METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all critical elements for responsive testing
   */
  getResponsiveElements(): { locator: Locator; name: string }[] {
    return [
      { locator: this.welcomeHeading, name: 'Welcome Heading' },
      { locator: this.welcomeMessage, name: 'Welcome Message' },
      { locator: this.ongoingAppointmentsText, name: 'Ongoing Appointments' },
      { locator: this.upcomingSessionsTab, name: 'Upcoming Sessions Tab' },
      { locator: this.recentSessionsTab, name: 'Recent Sessions Tab' },
      { locator: this.homeLink, name: 'Home Link' },
      { locator: this.sessionsLink, name: 'Sessions Link' },
      { locator: this.teamLink, name: 'Team Link' },
      { locator: this.messagesLink, name: 'Messages Link' },
    ];
  }

  /**
   * Set viewport size for responsive testing
   */
  async setViewport(width: number, height: number): Promise<void> {
    await this.responsiveHelper.setViewport(width, height);
  }

  /**
   * Check if all home page elements are within viewport bounds
   */
  async checkResponsiveBounds(): Promise<ResponsiveCheckSummary> {
    const elements = this.getResponsiveElements();
    const results = await this.responsiveHelper.checkMultipleElementsBounds(elements);
    const hasScroll = await this.responsiveHelper.hasHorizontalScroll();
    return this.responsiveHelper.generateSummary('Home Page', results, hasScroll);
  }

  /**
   * Run responsive checks across multiple viewports
   */
  async runResponsiveChecks(viewports: ViewportConfig[] = STANDARD_VIEWPORTS): Promise<ResponsiveCheckSummary[]> {
    const elements = this.getResponsiveElements();
    return await this.responsiveHelper.runResponsiveChecks('Home Page', elements, viewports);
  }

  /**
   * Assert all elements are within bounds at current viewport
   */
  async assertAllElementsWithinBounds(): Promise<void> {
    const elements = this.getResponsiveElements();
    for (const { locator, name } of elements) {
      const isVisible = await locator.isVisible().catch(() => false);
      if (isVisible) {
        await this.responsiveHelper.assertElementWithinBounds(locator, name);
      }
    }
    await this.responsiveHelper.assertNoHorizontalScroll();
  }

  /**
   * Take screenshot at current viewport
   */
  async takeResponsiveScreenshot(width: number, height: number): Promise<string> {
    return await this.responsiveHelper.takeScreenshot('home-page', width, height);
  }
}

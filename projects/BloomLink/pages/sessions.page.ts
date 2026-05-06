import { Page, Locator } from '@playwright/test';
import { PageHelper } from '../../../utils/page-helper';
import { testConfig } from '../../../config/testConfig';
import { logger } from '../../../utils/logger';
import { ResponsiveHelper, ResponsiveCheckSummary, ViewportConfig, STANDARD_VIEWPORTS } from '../../../utils/responsive-helper';

export class SessionsPage extends PageHelper {
  readonly responsiveHelper: ResponsiveHelper;
  // Header elements
  readonly sessionsHeading: Locator;
  readonly createSessionButton: Locator;
  readonly sessionsFilterDropdown: Locator;
  readonly notificationIcon: Locator;

  // Session list table headers
  readonly channelNameHeader: Locator;
  readonly teamMembersHeader: Locator;
  readonly sessionTypeHeader: Locator;
  readonly createdByHeader: Locator;

  constructor(page: Page) {
    super(page);
    this.responsiveHelper = new ResponsiveHelper(page);

    // Header elements
    this.sessionsHeading = page.getByRole('heading', { name: 'Sessions' });
    this.createSessionButton = page.getByRole('button', { name: 'Create Session' });
    this.sessionsFilterDropdown = page.locator('select, combobox').first();
    this.notificationIcon = page.locator('button').filter({ hasText: /^\d+$/ }).first();

    // Session list table headers
    this.channelNameHeader = page.getByRole('columnheader', { name: 'Channel Name' });
    this.teamMembersHeader = page.getByRole('columnheader', { name: 'Team Members' });
    this.sessionTypeHeader = page.getByRole('columnheader', { name: 'Session Type' });
    this.createdByHeader = page.getByRole('columnheader', { name: 'Created By' });
  }

  async navigateToSessions(userId: string) {
    await this.goto(`/owner/appointment/${userId}`);
  }

  async clickCreateSession() {
    await this.createSessionButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.pageLoad });
    await this.createSessionButton.click();
  }

  async clickCreateSessionViaMouse() {
    await this.mouseClick(this.createSessionButton);
  }

  async selectSessionFilter(filter: 'All Sessions' | 'Today Session' | 'Previous Session' | 'Upcoming Sessions' | 'Custom Date') {
    await this.sessionsFilterDropdown.selectOption({ label: filter });
  }

  async waitForSessionsToLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.sessionsHeading.waitFor({ state: 'visible', timeout: testConfig.timeouts.pageLoad }).catch(() => {});
  }

  /**
   * Wait for loading overlay to disappear.
   */
  async waitForLoading() {
    const pleaseWait = this.page.getByText('Please wait');
    await pleaseWait.waitFor({ state: 'hidden', timeout: testConfig.timeouts.pageLoad }).catch(() => {});
  }

  /**
   * Navigate to Sessions page via sidebar link.
   * If the page has navigated away from BloomLink (e.g. back to platform dashboard
   * after ending a meeting), go to the BloomLink origin first.
   */
  async navigateViaSidebar() {
    // Click the exact sidebar nav link that points to /owner/appointment (the list, not a detail page)
    const sessionsNavLink = this.page.locator('nav a[href="/owner/appointment"], a[href="/owner/appointment"]').first();
    const navVisible = await sessionsNavLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (navVisible) {
      await sessionsNavLink.click();
    } else {
      // Fallback: click any Sessions link
      const sessionsLink = this.page.getByRole('link', { name: 'Sessions' }).first();
      await sessionsLink.click();
    }
    await this.waitForLoading();
    await this.createSessionButton.waitFor({ state: 'visible', timeout: testConfig.timeouts.pageLoad });
  }

  /**
   * High-level: Wait for join window to become available (respecting 10-min buffer).
   * @param startTime - Session start time (format: "HH:MM AM/PM")
   * @param userId - User ID for logging
   */
  async waitForJoinWindow(startTime: string, userId: string): Promise<void> {
    const { msUntilJoinAvailable } = await import('../../../utils/date-helper');
    const waitMs = msUntilJoinAvailable(startTime);
    if (waitMs > 0) {
      logger.user(`Join opens 10 mins before ${startTime}. Waiting ~${Math.ceil(waitMs / 60_000)} min(s)...`, userId);
      await this.page.waitForTimeout(waitMs + 5_000);
    }
  }

  /**
   * High-level workflow: Wait for join window, navigate to sessions, and join the session.
   * @param startTime - Session start time
   * @param userId - User ID for logging
   * @returns true if successfully joined
   */
  async waitForJoinWindowAndJoinSession(startTime: string, userId: string): Promise<boolean> {
    await this.waitForJoinWindow(startTime, userId);
    await this.navigateViaSidebar();
    return await this.waitAndClickJoin(userId);
  }

  /**
   * Poll for Join/In Call button and click it.
   * @param label - Label for logging (e.g., 'User1')
   * @param maxAttempts - Maximum polling attempts (default: 20)
   * @returns true if Join button was found and clicked
   */
  async waitAndClickJoin(label: string, maxAttempts = testConfig.polling.joinMaxAttempts): Promise<boolean> {
    const joinableButton = this.page.getByRole('button', { name: /^(Join|In Call)$/i }).first();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.waitForLoading();

      const visible = await joinableButton.isVisible().catch(() => false);
      if (visible) {
        const btnText = await joinableButton.textContent();
        console.log(`[${label}] Join button found ("${btnText}") on attempt ${attempt}.`);
        
        // Wait for overlays to disappear
        await this.page.locator('[class*="overlay"]').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
        
        // Click with force to bypass overlay issues
        await joinableButton.click({ force: true });
        return true;
      }

      // Debug: capture screenshot on first failed attempt
      if (attempt === 1) {
        await this.page.screenshot({ path: `reports/debug-join-${label}.png` });
        console.log(`[${label}] Debug screenshot saved.`);
      }

      console.log(`[${label}] Attempt ${attempt}/${maxAttempts}: No Join button yet. Reloading in 10s...`);
      await this.page.waitForTimeout(testConfig.polling.joinInterval);
      await this.page.reload({ waitUntil: 'networkidle', timeout: testConfig.timeouts.pageLoad }).catch(() => {});
    }
    return false;
  }

  /**
   * Click on a completed/pending session by status.
   * @param status - Status text to match (e.g., 'Completed', 'Note Pending')
   * @returns true if button was found and clicked
   */
  async clickSessionByStatus(status: string): Promise<boolean> {
    const statusBtn = this.page.getByRole('button', { name: new RegExp(status, 'i') }).first();
    const visible = await statusBtn.isVisible().catch(() => false);
    if (visible) {
      const statusText = await statusBtn.textContent();
      console.log(`Session status: "${statusText}"`);
      await statusBtn.click();
      await this.page.waitForLoadState('domcontentloaded');
      return true;
    }
    return false;
  }

  /**
   * Click on completed or note pending session.
   * @returns true if found and clicked
   */
  async clickCompletedSession(): Promise<boolean> {
    return this.clickSessionByStatus('Completed|Note Pending');
  }

  /**   * Wait for session notes (AI-generated summary) to appear after meeting.
   * Specifically targets the "Session Notes" section, not Transcript Notes.
   * @param timeoutSeconds - Maximum time to wait (default: 300 = 5 minutes)
   * @param pollIntervalSeconds - Poll interval (default: 10)
   * @returns Object with found status and notes text
   */
  async waitForSessionNotesGenerated(
    timeoutSeconds = 300,
    pollIntervalSeconds = 10
  ): Promise<{ found: boolean; text: string }> {
    const maxPolls = timeoutSeconds / pollIntervalSeconds;

    logger.step(`Waiting for AI-generated session notes...`);

    for (let i = 1; i <= maxPolls; i++) {
      // Find the "Session Notes" heading specifically
      const sessionNotesHeading = this.page.locator('text=Session Notes').filter({ hasText: /^Session Notes$/ }).first();
      const isVisible = await sessionNotesHeading.isVisible().catch(() => false);

      if (isVisible) {
        // Get the content after the heading (usually in a scrollable container)
        const sessionNotesContainer = sessionNotesHeading.locator('..').locator('..');
        const notesText = await sessionNotesContainer.textContent().catch(() => '');

        if (notesText && notesText.trim().length > 50) {
          // Remove the heading itself and extra whitespace
          const cleanedText = notesText
            .replace(/Session Notes/gi, '') // Remove heading
            .replace(/Transcript Notes[\s\S]*/gi, '') // Stop at Transcript section
            .trim();

          if (cleanedText.length > 50) {
            logger.step(`Session notes found after ${i * pollIntervalSeconds}s`);
            return { found: true, text: cleanedText };
          }
        }
      }

      // Reload periodically
      if (i % 6 === 0) {
        logger.info(`  ... ${i * pollIntervalSeconds}s elapsed. Still waiting for session notes.`);
        await this.page.reload({ waitUntil: 'networkidle', timeout: testConfig.timeouts.pageLoad }).catch(() => {});
      }

      await this.page.waitForTimeout(pollIntervalSeconds * 1000);
    }

    logger.info(`No session notes appeared within ${timeoutSeconds / 60} minutes.`);
    return { found: false, text: '' };
  }

  /**   * Wait for transcription to appear after meeting ends.
   * @param timeoutSeconds - Maximum time to wait (default: 300 = 5 minutes)
   * @param pollIntervalSeconds - Poll interval (default: 10)
   * @returns Object with found status and transcription text
   */
  async waitForTranscription(
    timeoutSeconds = 300,
    pollIntervalSeconds = 10
  ): Promise<{ found: boolean; text: string }> {
    const maxPolls = timeoutSeconds / pollIntervalSeconds;
    const defaultLabels = [
      'Session Notes', 'Channel Notes', 'No Channel Notes found',
      'Recommendations', 'Session Notes Complete', 'Save',
      'Transcript Notes', 'Sessions', 'Create Session', 'Home', 'Team', 'Messages'
    ];

    logger.step(`Waiting up to ${timeoutSeconds / 60} minutes for transcription...`);

    for (let i = 1; i <= maxPolls; i++) {
      // Look for transcript-related sections
      const transcriptSection = this.page.locator('text=/Transcript|Session Notes|Channel Notes/i').first().locator('..').locator('..');
      const sectionText = await transcriptSection.textContent().catch(() => '');

      // Strip default UI labels to find actual transcription content
      let strippedText = sectionText || '';
      for (const label of defaultLabels) {
        strippedText = strippedText.replace(new RegExp(label, 'gi'), '');
      }
      strippedText = strippedText.trim();

      if (strippedText.length > 10) {
        logger.step(`Transcription found after ${i * pollIntervalSeconds}s.`);
        return { found: true, text: strippedText };
      }

      // Also check textarea/editable areas
      const notesArea = this.page.locator('textarea, [contenteditable="true"]').last();
      const notesText = await notesArea.textContent().catch(() => '');
      if (notesText && notesText.trim().length > 10 && !notesText.includes('No Channel Notes found')) {
        logger.step(`Transcription found in notes area after ${i * pollIntervalSeconds}s.`);
        return { found: true, text: notesText.trim() };
      }

      // Reload periodically
      if (i % 6 === 0) {
        logger.info(`  ... ${i * pollIntervalSeconds}s elapsed. Still waiting for transcription.`);
        await this.page.reload({ waitUntil: 'networkidle', timeout: testConfig.timeouts.pageLoad }).catch(() => {});
      }

      await this.page.waitForTimeout(pollIntervalSeconds * 1000);
    }

    logger.info(`No transcription appeared within ${timeoutSeconds / 60} minutes.`);
    return { found: false, text: '' };
  }

  /**
   * Click the "View Session Notes" tab if visible.
   * @returns true if the tab was found and clicked
   */
  async clickViewSessionNotesTab(): Promise<boolean> {
    const viewSessionNotesTab = this.page
      .getByRole('tab', { name: /View Session Notes/i })
      .or(this.page.locator('text=View Session Notes'));
    const visible = await viewSessionNotesTab.first().isVisible().catch(() => false);
    if (visible) {
      await viewSessionNotesTab.first().click();
      await this.waitFor(2000);
    }
    return visible;
  }

  /**
   * Get the text content of a named notes section (e.g., "Session Notes", "Transcript Notes", "Channel Notes").
   * @param sectionName - The heading text of the section
   * @returns The full text content of the section container
   */
  async getNoteSectionContent(sectionName: string): Promise<string> {
    const section = this.page
      .locator(`text=${sectionName}`)
      .first()
      .locator('..')
      .locator('..');
    return (await section.textContent().catch(() => '')) || '';
  }

  /**
   * Check whether a notes section is empty by matching common "not found" patterns.
   * @param sectionName - The heading text (e.g., "Session Notes", "Transcript Notes", "Channel Notes")
   * @param emptyPattern - Optional regex to detect empty state. Defaults to /No.*Notes.*found/i
   * @returns true if the section is empty
   */
  async isNoteSectionEmpty(sectionName: string, emptyPattern?: RegExp): Promise<boolean> {
    const content = await this.getNoteSectionContent(sectionName);
    const pattern = emptyPattern || new RegExp(`No.*${sectionName}.*found|No.*notes.*found`, 'i');
    return pattern.test(content);
  }

  /**
   * Get session notes content from the page.
   * @returns Session notes text or empty string
   */
  async getSessionNotesContent(): Promise<string> {
    const notesArea = this.page.locator('textarea, [contenteditable="true"]').last();
    return await notesArea.textContent().catch(() => '') || '';
  }

  /**
   * Check if session notes section is visible.
   */
  async isSessionNotesVisible(): Promise<boolean> {
    const sessionNotesSection = this.page.locator('text=/Session Notes|Channel Notes/i').first();
    return await sessionNotesSection.isVisible().catch(() => false);
  }

  /**
   * High-level wrapper to navigate and find completed session.
   */
  async navigateAndFindCompletedSession(userId: string) {
    logger.step('Post-Meeting: Checking transcription');
    await this.waitFor(3000);
    await this.navigateViaSidebar();
    
    const completedFound = await this.clickCompletedSession();
    if (!completedFound) {
      logger.user(`No Completed/Note Pending button found. Checking page content...`, userId);
    }
    return completedFound;
  }

  /**
   * High-level wrapper to verify all notes are not empty with logging.
   */
  async verifyAllNotesNotEmpty(userId: string): Promise<{
    sessionNotesEmpty: boolean;
    sessionNotesContent: string;
    transcriptEmpty: boolean;
    transcriptContent: string;
    channelEmpty: boolean;
  }> {
    await this.clickViewSessionNotesTab();

    const hasEmptySessionNotes = await this.isNoteSectionEmpty('Session Notes');
    const sessionNotesContent = await this.getNoteSectionContent('Session Notes');

    const hasEmptyTranscript = await this.isNoteSectionEmpty('Transcript Notes');
    const transcriptNotesContent = await this.getNoteSectionContent('Transcript Notes');

    const hasEmptyChannelNotes = await this.isNoteSectionEmpty('Channel Notes');

    return {
      sessionNotesEmpty: hasEmptySessionNotes,
      sessionNotesContent,
      transcriptEmpty: hasEmptyTranscript,
      transcriptContent: transcriptNotesContent,
      channelEmpty: hasEmptyChannelNotes,
    };
  }

  /**
   * High-level wrapper to log transcription result.
   */
  logTranscriptionResult(result: { found: boolean; text: string }) {
    if (result.found) {
      logger.step(`TRANSCRIPTION CONFIRMED: "${result.text.substring(0, 300)}"`);
    } else {
      logger.step(`No transcription appeared within 5 minutes.`);
    }
  }

  /**
   * Cancel all "Scheduled" sessions and end any "In Call" sessions so the time
   * slots are freed before creating a new session.
   */
  async cleanupStaleSessions(label = 'User1'): Promise<void> {
    await this.navigateViaSidebar();

    // Cancel all Scheduled sessions
    const cancelButtons = this.page.getByRole('button', { name: 'Cancel Session' });
    let cancelCount = await cancelButtons.count();
    while (cancelCount > 0) {
      logger.user(`Cancelling scheduled session...`, label);
      await cancelButtons.first().click();
      // Fill reason and click Save in the cancellation dialog
      const reasonTextarea = this.page.getByPlaceholder(/Reason can be added/i);
      const dialogVisible = await reasonTextarea.isVisible({ timeout: 3000 }).catch(() => false);
      if (dialogVisible) {
        await reasonTextarea.fill('Automated test cleanup');
        await this.page.getByRole('button', { name: 'Save' }).click();
      }
      await this.page.waitForTimeout(2000);
      cancelCount = await cancelButtons.count();
    }

    // End any In Call sessions
    const inCallButtons = this.page.getByRole('button', { name: 'In Call' });
    let inCallCount = await inCallButtons.count();
    while (inCallCount > 0) {
      logger.user(`Ending in-call session...`, label);
      await inCallButtons.first().click();
      // Wait for meeting UI then end
      const { MeetingPage } = await import('./meeting.page');
      const meetingPage = new MeetingPage(this.page);
      await meetingPage.waitForMeetingUi();
      await meetingPage.endMeeting();
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(2000);
      await this.navigateViaSidebar();
      inCallCount = await inCallButtons.count();
    }

    logger.user('Stale sessions cleaned up.', label);
  }

  // ═══════════════════════════════════════════════════════════════
  // RESPONSIVE TESTING METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get session card locators dynamically
   */
  getSessionCards(): Locator {
    // Session cards contain Channel Name, Team Member Name, etc.
    return this.page.locator('[class*="card"], [class*="session"], [class*="appointment"]')
      .filter({ hasText: 'Channel Name' });
  }

  /**
   * Get all action buttons in session cards
   */
  getSessionActionButtons(): Locator {
    return this.page.getByRole('button', { 
      name: /Scheduled|Cancel Session|Note Pending|Team Member Missed|Join|In Call|Completed/i 
    });
  }

  /**
   * Get all critical elements for responsive testing
   */
  getResponsiveElements(): { locator: Locator; name: string }[] {
    return [
      { locator: this.sessionsHeading, name: 'Sessions Heading' },
      { locator: this.createSessionButton, name: 'Create Session Button' },
      { locator: this.page.locator('text=All Sessions').first(), name: 'All Sessions Dropdown' },
    ];
  }

  /**
   * Get all session card action buttons for responsive testing
   */
  async getSessionCardElements(): Promise<{ locator: Locator; name: string }[]> {
    const elements: { locator: Locator; name: string }[] = [];
    
    // Get all action button types
    const buttonTypes = [
      'Scheduled',
      'Cancel Session', 
      'Note Pending',
      'Team Member Missed',
      'Join',
      'In Call',
      'Completed'
    ];

    for (const buttonType of buttonTypes) {
      const buttons = this.page.getByRole('button', { name: buttonType });
      const count = await buttons.count();
      for (let i = 0; i < count; i++) {
        elements.push({
          locator: buttons.nth(i),
          name: `${buttonType} Button ${i + 1}`
        });
      }
    }

    return elements;
  }

  /**
   * Set viewport size for responsive testing
   */
  async setViewport(width: number, height: number): Promise<void> {
    await this.responsiveHelper.setViewport(width, height);
  }

  /**
   * Check if all session page elements are within viewport bounds
   */
  async checkResponsiveBounds(): Promise<ResponsiveCheckSummary> {
    const headerElements = this.getResponsiveElements();
    const cardElements = await this.getSessionCardElements();
    const allElements = [...headerElements, ...cardElements];
    
    const results = await this.responsiveHelper.checkMultipleElementsBounds(allElements);
    const hasScroll = await this.responsiveHelper.hasHorizontalScroll();
    return this.responsiveHelper.generateSummary('Sessions Page', results, hasScroll);
  }

  /**
   * Check session card buttons against their parent card bounds
   */
  async checkButtonsWithinCards(): Promise<{ button: string; overflow: number; card: number }[]> {
    const overflows: { button: string; overflow: number; card: number }[] = [];
    const cards = this.getSessionCards();
    const cardCount = await cards.count();

    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      const buttons = card.getByRole('button');
      const buttonCount = await buttons.count();

      for (let j = 0; j < buttonCount; j++) {
        const button = buttons.nth(j);
        const result = await this.responsiveHelper.isElementWithinContainer(button, card);
        
        if (!result.isWithinBounds && result.overflow.right > 0) {
          const buttonText = await button.textContent() || `Button ${j}`;
          overflows.push({
            button: buttonText.trim(),
            overflow: result.overflow.right,
            card: i + 1
          });
        }
      }
    }

    return overflows;
  }

  /**
   * Run responsive checks across multiple viewports
   */
  async runResponsiveChecks(viewports: ViewportConfig[] = STANDARD_VIEWPORTS): Promise<ResponsiveCheckSummary[]> {
    const summaries: ResponsiveCheckSummary[] = [];

    for (const viewport of viewports) {
      await this.responsiveHelper.setViewportConfig(viewport);
      await this.page.waitForLoadState('domcontentloaded');
      
      const summary = await this.checkResponsiveBounds();
      summary.resolution = `${viewport.width}x${viewport.height} (${viewport.name})`;
      summaries.push(summary);
    }

    return summaries;
  }

  /**
   * Assert all elements are within bounds at current viewport
   */
  async assertAllElementsWithinBounds(): Promise<void> {
    const headerElements = this.getResponsiveElements();
    const cardElements = await this.getSessionCardElements();
    const allElements = [...headerElements, ...cardElements];

    for (const { locator, name } of allElements) {
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
    return await this.responsiveHelper.takeScreenshot('sessions-page', width, height);
  }

  /**
   * Print responsive check summary to console
   */
  printResponsiveReport(summaries: ResponsiveCheckSummary[]): void {
    this.responsiveHelper.printReport(summaries);
  }
}

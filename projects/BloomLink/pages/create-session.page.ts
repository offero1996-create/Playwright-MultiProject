import { Page, Locator } from '@playwright/test';
import { PageHelper } from '../../../utils/page-helper';
import { testConfig } from '../../../config/testConfig';
import { logger } from '../../../utils/logger';
import { ResponsiveHelper, ResponsiveCheckSummary, ViewportConfig, STANDARD_VIEWPORTS } from '../../../utils/responsive-helper';

export class CreateSessionPage extends PageHelper {
  readonly responsiveHelper: ResponsiveHelper;
  // Page heading
  readonly pageHeading: Locator;
  readonly requiredFieldsText: Locator;

  // Session type radio buttons
  readonly oneToOneRadio: Locator;
  readonly groupSessionRadio: Locator;

  // Form fields
  readonly channelDropdown: Locator;
  readonly channelInput: Locator;
  readonly elementDropdown: Locator;
  readonly elementInput: Locator;
  readonly dateInput: Locator;
  readonly startTimeInput: Locator;
  readonly endTimeInput: Locator;
  readonly teamMemberInput: Locator;
  readonly additionalSummaryTextarea: Locator;
  readonly uploadFilesButton: Locator;

  // Action buttons
  readonly cancelButton: Locator;
  readonly createButton: Locator;

  constructor(page: Page) {
    super(page);
    this.responsiveHelper = new ResponsiveHelper(page);

    // Page heading
    this.pageHeading = page.getByRole('heading', { name: 'Create Session' });
    this.requiredFieldsText = page.getByText(/indicates required fields/i);

    // Session type radio buttons
    this.oneToOneRadio = page.getByRole('radio').first();
    this.groupSessionRadio = page.getByRole('radio').last();

    // Form fields - using react-select compatible locators
    // Use the specific container #subject for channel dropdown
    this.channelDropdown = page.locator('#subject');
    this.channelInput = page.locator('#react-select-2-input');
    
    // Use the specific container #subcategory for element dropdown
    this.elementDropdown = page.locator('#subcategory');
    this.elementInput = page.locator('#react-select-3-input');
    
    this.dateInput = page.getByRole('textbox', { name: 'Select Date' });
    this.startTimeInput = page.locator('#react-select-4-input');
    this.endTimeInput = page.locator('#react-select-5-input');
    this.teamMemberInput = page.locator('#react-select-6-input');  // one-to-one; group uses .last() dynamically
    this.additionalSummaryTextarea = page.getByRole('textbox', { name: /Summary can be added/ });
    this.uploadFilesButton = page.getByRole('button', { name: /Upload images or pdf/ });

    // Action buttons
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.createButton = page.getByRole('button', { name: 'Create' }).last();
  }

  async selectSessionType(type: 'one-to-one' | 'group') {
    if (type === 'one-to-one') {
      await this.oneToOneRadio.check();
    } else {
      await this.groupSessionRadio.check();
    }
  }

  async selectChannel(channelName: string) {
    await this.channelDropdown.click({ force: true });
    await this.channelInput.fill(channelName);
    await this.page.waitForTimeout(testConfig.reactSelect.optionLoadDelay);
    await this.channelInput.press('Enter');
    await this.page.waitForTimeout(testConfig.reactSelect.postSelectDelay);
    await this.verifyDropdownSelected('#subject', channelName, 'Select Channel Name');
  }

  async selectElement(elementName: string) {
    await this.elementDropdown.click({ force: true });
    await this.elementInput.fill(elementName);
    await this.page.waitForTimeout(testConfig.reactSelect.optionLoadDelay);
    await this.elementInput.press('Enter');
    await this.page.waitForTimeout(testConfig.reactSelect.postSelectDelay);
    await this.verifyDropdownSelected('#subcategory', elementName, 'Select Element');
  }

  async selectDate(date: string) {
    await this.dateInput.click();
    await this.dateInput.fill(date);
    await this.dateInput.press('Enter');
    await this.page.waitForTimeout(testConfig.reactSelect.postSelectDelay);
    const dateValue = await this.dateInput.inputValue();
    if (!dateValue || dateValue === '') {
      throw new Error(`Date selection failed - expected ${date} but got empty value`);
    }
  }

  private async fillTimeDropdown(input: import('@playwright/test').Locator, time: string, label: string) {
    await input.click({ force: true });
    await this.page.waitForTimeout(testConfig.reactSelect.preTypeDelay);
    await input.fill(time);
    await this.page.waitForTimeout(testConfig.reactSelect.optionLoadDelay);
    await input.press('Enter');
    await this.page.waitForTimeout(testConfig.reactSelect.postSelectDelay);
    // Verify the time was actually selected (input clears when option is picked)
    const remaining = await input.inputValue();
    if (remaining !== '') {
      throw new Error(`${label} selection failed — input still has value "${remaining}". Option may not have appeared.`);
    }
  }

  async selectStartTime(time: string) {
    await this.fillTimeDropdown(this.startTimeInput, time, 'Start Time');
  }

  async selectEndTime(time: string) {
    await this.fillTimeDropdown(this.endTimeInput, time, 'End Time');
  }

  // Group session — same IDs as one-to-one (no title field shift)
  async selectGroupStartTime(time: string) {
    await this.fillTimeDropdown(this.startTimeInput, time, 'Group Start Time');
  }

  async selectGroupEndTime(time: string) {
    await this.fillTimeDropdown(this.endTimeInput, time, 'Group End Time');
  }

  async selectTeamMember(memberName: string) {
    await this.teamMemberInput.click({ force: true });
    await this.page.waitForTimeout(testConfig.reactSelect.preTypeDelay);
    await this.teamMemberInput.fill(memberName);
    await this.page.waitForTimeout(testConfig.reactSelect.optionLoadDelay);
    await this.teamMemberInput.press('Enter');
    await this.page.waitForTimeout(testConfig.reactSelect.postSelectDelay);
  }

  async selectMultipleTeamMembers(memberNames: string[]) {
    // Use .last() — team member is always the last react-select regardless of form type
    const input = this.page.locator('input[id^="react-select-"][id$="-input"]').last();
    for (const name of memberNames) {
      await input.click({ force: true });
      await this.page.waitForTimeout(testConfig.reactSelect.preTypeDelay);
      await input.fill(name);
      await this.page.waitForTimeout(testConfig.reactSelect.optionLoadDelay);
      await input.press('Enter');
      await this.page.waitForTimeout(testConfig.reactSelect.postSelectDelay);
    }
  }

  private async verifyDropdownSelected(containerSelector: string, expectedValue: string, placeholderText: string) {
    const container = this.page.locator(containerSelector);
    const containerText = await container.textContent();
    
    // Check if placeholder is still showing (selection failed)
    if (containerText?.includes(placeholderText)) {
      throw new Error(`Dropdown selection failed - placeholder "${placeholderText}" still visible. Expected "${expectedValue}"`);
    }
    
    // Check if selected value is visible
    if (!containerText?.includes(expectedValue)) {
      throw new Error(`Dropdown selection verification failed - expected "${expectedValue}" but got "${containerText}"`);
    }
  }

  async enterAdditionalSummary(summary: string) {
    await this.additionalSummaryTextarea.fill(summary);
  }

  /**
   * Upload a file during session creation using the hidden file input.
   * @param filePath - Absolute path to the file to upload
   */
  async uploadFile(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(testConfig.reactSelect.postSelectDelay);
    console.log(`Uploaded file: ${filePath.split(/[\\/]/).pop()}`);
  }

  async clickCreate() {
    await this.createButton.click();
    
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  /**
   * Reusable method to create a one-to-one session with all required fields
   */
  async createOneToOneSession(
    channelName: string,
    elementName: string,
    date: string,
    startTime: string,
    endTime: string,
    teamMember: string,
    summary?: string,
    filePath?: string
  ) {
    await this.selectSessionType('one-to-one');
    await this.selectChannel(channelName);
    await this.selectElement(elementName);
    await this.selectDate(date);
    await this.selectStartTime(startTime);
    await this.selectEndTime(endTime);
    await this.selectTeamMember(teamMember);

    if (summary) {
      await this.enterAdditionalSummary(summary);
    }

    if (filePath) {
      await this.uploadFile(filePath);
    }

    await this.clickCreate();
  }

  /**
   * Reusable method to create a group session with all required fields
   */
  async createGroupSession(
    channelName: string,
    elementName: string,
    date: string,
    startTime: string,
    endTime: string,
    teamMembers: string[],
    summary?: string
  ) {
    await this.selectSessionType('group');
    await this.selectChannel(channelName);
    await this.selectElement(elementName);
    await this.selectDate(date);
    await this.selectGroupStartTime(startTime);
    await this.selectGroupEndTime(endTime);
    await this.selectMultipleTeamMembers(teamMembers);

    if (summary) {
      await this.enterAdditionalSummary(summary);
    }

    await this.clickCreate();
  }

  /**
   * Helper method to get current date in MM/DD/YYYY format.
   * Automatically returns tomorrow's date if the nearest time slot rolled over midnight.
   */
  getCurrentDate(): string {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    const slotTime = new Date(now);
    slotTime.setMinutes(roundedMinutes, 0, 0);

    const target = (slotTime.getHours() >= 22 && slotTime.getMinutes() >= 30)
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      : slotTime;

    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    const year = target.getFullYear();
    return `${month}/${day}/${year}`;
  }

  /**
   * Helper method to get nearest available time slot (rounded to next 15 min).
   * If the slot is past 10:30 PM (leaving no room for a 30-min session same day),
   * rolls over to 08:00 AM the next day.
   */
  getNearestTimeSlot(): string {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);

    // If past 10:30 PM, use 08:00 AM tomorrow
    if (now.getHours() >= 22 && now.getMinutes() >= 30) {
      now.setDate(now.getDate() + 1);
      now.setHours(8, 0, 0, 0);
    }

    const hours = now.getHours();
    const mins = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = String(mins).padStart(2, '0');

    return `${String(displayHours).padStart(2, '0')}:${displayMinutes} ${ampm}`;
  }

  /**
   * Helper method to get end time (start time + duration in minutes)
   */
  getEndTime(startTime: string, durationMinutes: number = 30): string {
    const [time, period] = startTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let totalMinutes = (hours % 12) * 60 + minutes + (period === 'PM' ? 720 : 0) + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    const endPeriod = endHours >= 12 ? 'PM' : 'AM';
    const displayEndHours = endHours % 12 || 12;
    
    return `${String(displayEndHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')} ${endPeriod}`;
  }

  /**
   * High-level wrapper to create a one-to-one session with automatic date/time calculation and logging.
   * Encapsulates all the session creation logic without exposing intermediate variables to the test.
   */
  async createOneToOneSessionWithDefaults(
    teamMember: string,
    userId: string = 'User1',
    summary?: string,
    uploadFilePath?: string
  ) {
    const currentDate = this.getCurrentDate();
    const startTime = this.getNearestTimeSlot();
    const endTime = this.getEndTime(startTime, 30);

    logger.user(`Creating 1:1 session with: ${teamMember}`, userId);
    logger.user(`Session: ${currentDate} ${startTime} - ${endTime}`, userId);

    await this.createOneToOneSession(
      'TestChannel1',
      'Element 1',
      currentDate,
      startTime,
      endTime,
      teamMember,
      summary,
      uploadFilePath
    );

    return { currentDate, startTime, endTime };
  }

  /**
   * High-level wrapper to create a group session with automatic date/time calculation and logging.
   * Encapsulates all the session creation logic without exposing intermediate variables to the test.
   */
  async createGroupSessionWithDefaults(teamMembers: string[], userId: string = 'User1') {
    const currentDate = this.getCurrentDate();
    const startTime = this.getNearestTimeSlot();
    const endTime = this.getEndTime(startTime, 30);
    
    logger.user(`Creating GROUP session with: ${teamMembers.join(', ')}`, userId);
    logger.user(`Group Session: ${currentDate} ${startTime} - ${endTime}`, userId);
    
    await this.createGroupSession(
      'TestChannel1',
      'Element 1',
      currentDate,
      startTime,
      endTime,
      teamMembers
    );

    return { currentDate, startTime, endTime };
  }

  // ═══════════════════════════════════════════════════════════════
  // RESPONSIVE TESTING METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all critical elements for responsive testing
   */
  getResponsiveElements(): { locator: Locator; name: string }[] {
    return [
      { locator: this.pageHeading, name: 'Create Session Heading' },
      { locator: this.requiredFieldsText, name: 'Required Fields Text' },
      { locator: this.oneToOneRadio, name: 'One to One Radio' },
      { locator: this.groupSessionRadio, name: 'Group Session Radio' },
      { locator: this.channelDropdown, name: 'Channel Dropdown' },
      { locator: this.elementDropdown, name: 'Element Dropdown' },
      { locator: this.dateInput, name: 'Date Input' },
      { locator: this.page.locator('text=Start Time').first(), name: 'Start Time Label' },
      { locator: this.page.locator('text=End Time').first(), name: 'End Time Label' },
      { locator: this.additionalSummaryTextarea, name: 'Summary Textarea' },
      { locator: this.cancelButton, name: 'Cancel Button' },
      { locator: this.createButton, name: 'Create Button' },
    ];
  }

  /**
   * Get form container for bounds checking
   */
  getFormContainer(): Locator {
    return this.page.locator('form, [class*="form"], [class*="create-session"]').first();
  }

  /**
   * Set viewport size for responsive testing
   */
  async setViewport(width: number, height: number): Promise<void> {
    await this.responsiveHelper.setViewport(width, height);
  }

  /**
   * Check if all form elements are within viewport bounds
   */
  async checkResponsiveBounds(): Promise<ResponsiveCheckSummary> {
    const elements = this.getResponsiveElements();
    const results = await this.responsiveHelper.checkMultipleElementsBounds(elements);
    const hasScroll = await this.responsiveHelper.hasHorizontalScroll();
    return this.responsiveHelper.generateSummary('Create Session Form', results, hasScroll);
  }

  /**
   * Run responsive checks across multiple viewports
   */
  async runResponsiveChecks(viewports: ViewportConfig[] = STANDARD_VIEWPORTS): Promise<ResponsiveCheckSummary[]> {
    const elements = this.getResponsiveElements();
    return await this.responsiveHelper.runResponsiveChecks('Create Session Form', elements, viewports);
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
    return await this.responsiveHelper.takeScreenshot('create-session-form', width, height);
  }

  /**
   * Helper method to get tomorrow's date in MM/DD/YYYY format.
   */
  getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const year = tomorrow.getFullYear();
    return `${month}/${day}/${year}`;
  }

  /**
   * Create a session for tomorrow (for testing Scheduled/Cancel buttons)
   */
  async createSessionForTomorrow(
    teamMember: string,
    userId: string = 'User1',
    summary?: string
  ) {
    const tomorrowDate = this.getTomorrowDate();
    const startTime = '12:00 PM';
    const endTime = '12:30 PM';

    logger.user(`Creating session for TOMORROW: ${tomorrowDate}`, userId);
    logger.user(`Session: ${tomorrowDate} ${startTime} - ${endTime}`, userId);

    await this.createOneToOneSession(
      'TestChannel1',
      'Element 1',
      tomorrowDate,
      startTime,
      endTime,
      teamMember,
      summary
    );

    return { date: tomorrowDate, startTime, endTime };
  }
}

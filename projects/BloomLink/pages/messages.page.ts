import { Page, Locator } from '@playwright/test';
import { PageHelper } from '../../../utils/page-helper';
import { testConfig } from '../../../config/testConfig';

/**
 * MessagesPage - Page Object for BloomLink Messages/Chat functionality.
 * Locators captured from live DOM inspection of the BloomLink Messages page.
 */
export class MessagesPage extends PageHelper {
  // ── Sidebar navigation ──
  readonly messagesLink: Locator;

  // ── Search and filters ──
  readonly searchInput: Locator;
  readonly searchIcon: Locator;
  readonly allFilterButton: Locator;
  readonly notReadFilterButton: Locator;

  // ── Conversation list (left panel: bg-card w-[100%] md:w-[30%]) ──
  readonly conversationListContainer: Locator;
  readonly conversationItems: Locator;

  // ── Chat panel (right panel: md:w-[70%]) ──
  readonly chatPanel: Locator;
  readonly chatHeaderName: Locator;
  readonly chatHeaderAvatar: Locator;
  readonly chatHeaderAttachIcon: Locator;
  readonly chatBody: Locator;
  readonly messageInput: Locator;
  readonly attachmentButton: Locator;
  readonly sendButton: Locator;
  readonly fileInput: Locator;

  // ── New conversation (react-select dropdown) ──
  readonly selectRecipientDropdown: Locator;
  readonly recipientSearchInput: Locator;

  // ── Message elements ──
  readonly incomingMessages: Locator;
  readonly outgoingMessages: Locator;
  readonly messageBubbles: Locator;

  // ── Tick mark (delivered/read receipt) — svg[width="18"][height="12"] ──
  readonly tickMarkSvg: Locator;

  // ── File attachment elements ──
  readonly fileAttachmentPreview: Locator;
  readonly downloadButton: Locator;

  // ── Notification bell ──
  readonly notificationBell: Locator;

  constructor(page: Page) {
    super(page);

    // Sidebar — Messages link with envelope SVG icon
    this.messagesLink = page.getByRole('link', { name: /Messages/ });

    // Search — input with placeholder="Search" inside header > div
    this.searchInput = page.locator('input[placeholder="Search"]');
    this.searchIcon = page.locator('i.fas.fa-search');

    // Filter buttons — "All" and "Not Read" inside bg-[#181B22] container
    this.allFilterButton = page.getByRole('button', { name: 'All' });
    this.notReadFilterButton = page.getByRole('button', { name: 'Not Read' });

    // Conversation list — scrollable container in left panel
    this.conversationListContainer = page.locator('div.overflow-y-auto').first();
    // Each conversation item: div.relative.flex.items-center.cursor-pointer
    this.conversationItems = page.locator('div.relative.flex.items-center.cursor-pointer');

    // Chat panel — right side: md:w-[70%]
    this.chatPanel = page.locator('div.flex.flex-col.bg-card.rounded-lg').last();
    // Chat header — h1 with recipient full name
    this.chatHeaderName = page.locator('h1.font-semibold.text-white');
    // Chat header avatar — initials circle
    this.chatHeaderAvatar = this.chatPanel.locator('header div.rounded-full.bg-black').first();
    // Attachment icon in chat header
    this.chatHeaderAttachIcon = this.chatPanel.locator('header div.cursor-pointer svg');

    // Chat body — scrollable message area
    this.chatBody = page.locator('div.flex-1.overflow-y-auto.bg-collaboratortable');

    // Message input — textarea with placeholder "Write a message"
    this.messageInput = page.locator('textarea[placeholder="Write a message"]');

    // Attachment button — button with paperclip SVG (bg-collaboratortable)
    this.attachmentButton = page.locator('button.bg-collaboratortable').last();

    // Send button — purple button (bg-[#755FDC]) with send arrow SVG
    this.sendButton = page.locator('button.bg-\\[\\#755FDC\\]');

    // Hidden file input for attachments (accepts all file types)
    this.fileInput = page.locator('input[type="file"]');

    // New conversation — react-select dropdown
    this.selectRecipientDropdown = page.locator('div.css-64wwsw-control, div.css-2b097c-container').first();
    this.recipientSearchInput = page.locator('#react-select-2-input');

    // Incoming messages — left-aligned (no justify-end)
    // Structure: div.flex.mb-4 > div.rounded-full.bg-black (avatar) + div.flex.flex-col
    this.incomingMessages = this.chatBody.locator('div.flex.mb-4:not(.justify-end)');

    // Outgoing messages — right-aligned with justify-end
    // Structure: div.flex.mb-4.justify-end > div.flex.flex-col
    this.outgoingMessages = this.chatBody.locator('div.flex.mb-4.justify-end');

    // All message bubbles (both sent and received)
    this.messageBubbles = this.chatBody.locator('div.rounded-md.p-2');

    // Tick mark SVG — double checkmark (18x12) next to timestamp on sent messages
    // Gray (#B9B9B9) = delivered, Blue = read
    this.tickMarkSvg = this.chatBody.locator('svg[width="18"][height="12"]');

    // File attachment preview — document/file icon with filename
    this.fileAttachmentPreview = this.chatBody.locator('a[download], div[class*="file"], div[class*="attachment"]');

    // Download button — typically a link with download attribute or button with download icon
    this.downloadButton = this.chatBody.locator('a[download]');

    // Notification bell
    this.notificationBell = page.locator('button#headlessui-menu-button-3');
  }

  // ═══════════════════════════════════════════════════════════
  //  SIDEBAR UNREAD BADGE
  // ═══════════════════════════════════════════════════════════

  /**
   * Get the unread message count from the sidebar Messages link badge.
   * The badge is a small colored circle with a number overlaid on the Messages icon.
   * @returns The badge count number, or 0 if no badge is visible
   */
  async getSidebarUnreadBadgeCount(): Promise<number> {
    // The badge is typically a span/div with a number inside the Messages link area
    // Try multiple selectors to find the badge count
    const badgeSelectors = [
      // MUI-style badge
      this.messagesLink.locator('.MuiBadge-badge:not(.MuiBadge-invisible)'),
      // Generic small circle badge near Messages link
      this.messagesLink.locator('span.rounded-full, div.rounded-full').filter({ hasNotText: /Messages/ }),
      // Any numeric badge inside or adjacent to the link
      this.messagesLink.locator('span, div').filter({ hasText: /^\d+$/ }),
    ];

    for (const badge of badgeSelectors) {
      const visible = await badge.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (visible) {
        const text = await badge.first().textContent();
        const num = parseInt(text?.trim() || '0', 10);
        if (!isNaN(num) && num > 0) return num;
      }
    }

    // Fallback: check for badge in the sidebar nav area near Messages
    const sidebarBadge = this.page.locator('a:has-text("Messages") span, a:has-text("Messages") div')
      .filter({ hasText: /^\d+$/ });
    const fallbackVisible = await sidebarBadge.first().isVisible({ timeout: 2000 }).catch(() => false);
    if (fallbackVisible) {
      const text = await sidebarBadge.first().textContent();
      const num = parseInt(text?.trim() || '0', 10);
      if (!isNaN(num) && num > 0) return num;
    }

    return 0;
  }

  /**
   * Check if the sidebar Messages link has an unread badge visible.
   */
  async hasSidebarUnreadBadge(): Promise<boolean> {
    const count = await this.getSidebarUnreadBadgeCount();
    return count > 0;
  }

  /**
   * Wait for the sidebar unread badge to update (appear or change).
   * Useful after sending a message to wait for the recipient's badge to appear.
   * @param expectedMinCount - Minimum expected badge count
   * @param timeout - Maximum wait time in ms
   */
  async waitForSidebarBadgeCount(expectedMinCount: number, timeout = 30000): Promise<number> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const count = await this.getSidebarUnreadBadgeCount();
      if (count >= expectedMinCount) return count;
      await this.page.waitForTimeout(2000);
    }
    return await this.getSidebarUnreadBadgeCount();
  }

  // ═══════════════════════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════════════════════

  async navigateToMessages() {
    await this.messagesLink.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForMessagesPageReady();
  }

  async waitForMessagesPageReady() {
    await this.searchInput.or(this.messageInput).waitFor({
      state: 'visible',
      timeout: testConfig.timeouts.pageLoad,
    }).catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  // ═══════════════════════════════════════════════════════════
  //  CONVERSATION LIST
  // ═══════════════════════════════════════════════════════════

  async filterConversations(filter: 'All' | 'Not Read') {
    const btn = filter === 'All' ? this.allFilterButton : this.notReadFilterButton;
    await btn.click();
    await this.page.waitForTimeout(500);
  }

  async searchConversation(name: string) {
    await this.searchInput.fill(name);
    await this.searchInput.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  async selectConversation(userName: string) {
    // Conversation items have h2 with title attr containing the full name.
    // Be careful to match exact name when needed (e.g., "Offero Bosco" vs "OfferoAdmin")
    const firstName = userName.split(' ')[0];
    const lastName = userName.split(' ').slice(1).join(' ');

    // Method 1: Try exact full name match first
    const exactMatch = this.conversationItems.filter({
      has: this.page.locator(`h2[title="${userName}"], h2[title="${userName} "]`),
    }).first();

    if (await exactMatch.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exactMatch.click();
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(1000);
      return;
    }

    // Method 2: Try partial match but exclude similar names (e.g., match "Offero B" for "Offero Bosco")
    if (lastName) {
      const partialMatch = this.conversationItems.filter({
        has: this.page.locator(`h2[title*="${firstName} ${lastName.charAt(0)}"]`),
      }).first();

      if (await partialMatch.isVisible({ timeout: 3000 }).catch(() => false)) {
        await partialMatch.click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(1000);
        return;
      }
    }

    // Method 3: Try first name match but verify it's not a different user
    const firstNameMatches = this.conversationItems.filter({
      has: this.page.locator(`h2[title*="${firstName}"]`),
    });

    const matchCount = await firstNameMatches.count();
    for (let i = 0; i < matchCount; i++) {
      const item = firstNameMatches.nth(i);
      const title = await item.locator('h2[title]').getAttribute('title');
      // Check if this matches our target (not a different user like "OfferoAdmin")
      if (title && (title.includes(userName) || (lastName && title.includes(lastName)))) {
        await item.click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(1000);
        return;
      }
    }

    // Method 4: Fallback - click first match containing first name
    const fallback = this.page.getByText(firstName, { exact: false }).first();
    await fallback.click({ timeout: 10000 });
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
  }

  async startNewConversation(recipientName: string) {
    // Click the react-select dropdown container to focus it
    await this.selectRecipientDropdown.click({ force: true });
    await this.page.waitForTimeout(500);

    // Type in the react-select input (use first name for better matching)
    const firstName = recipientName.split(' ')[0];
    await this.recipientSearchInput.fill(firstName);
    await this.page.waitForTimeout(1000);

    // Select from dropdown options
    const option = this.page.locator('[class*="option"]').filter({ hasText: recipientName }).first();
    if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
      await option.click();
    } else {
      // Fallback: press Enter to select first matching option
      await this.recipientSearchInput.press('Enter');
    }
    await this.page.waitForTimeout(1000);
  }

  async getConversationCount(): Promise<number> {
    return await this.conversationItems.count();
  }

  async getConversationPreview(userName: string): Promise<string> {
    const item = this.conversationItems.filter({
      has: this.page.locator(`h2[title*="${userName}"]`),
    }).first();
    const preview = item.locator('span.truncate');
    return await preview.textContent() || '';
  }

  async hasUnreadMessages(userName: string): Promise<boolean> {
    const item = this.conversationItems.filter({
      has: this.page.locator(`h2[title*="${userName}"]`),
    }).first();
    const badge = item.locator('.MuiBadge-badge:not(.MuiBadge-invisible)');
    return await badge.isVisible().catch(() => false);
  }

  // ═══════════════════════════════════════════════════════════
  //  SENDING MESSAGES
  // ═══════════════════════════════════════════════════════════

  async sendMessage(message: string) {
    await this.messageInput.fill(message);
    // Use the send button (purple bg-[#755FDC]) — more reliable across browsers
    // than pressing Enter on a textarea
    await this.sendButton.click();
    await this.page.waitForTimeout(1500);
  }

  async sendMessageWithEnter(message: string) {
    await this.messageInput.fill(message);
    await this.messageInput.press('Enter');
    await this.page.waitForTimeout(1500);
  }

  async sendAttachment(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(2000);
  }

  // ═══════════════════════════════════════════════════════════
  //  READING MESSAGES
  // ═══════════════════════════════════════════════════════════

  async getLastMessageText(): Promise<string> {
    const lastBubble = this.messageBubbles.last();
    const text = await lastBubble.locator('p.text-sm').textContent();
    return text?.trim() || '';
  }

  async getAllMessages(): Promise<string[]> {
    const bubbles = this.messageBubbles;
    const count = await bubbles.count();
    const texts: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await bubbles.nth(i).locator('p.text-sm').textContent();
      if (text) texts.push(text.trim());
    }
    return texts;
  }

  async hasMessage(messageText: string): Promise<boolean> {
    return await this.page.getByText(messageText, { exact: false }).isVisible().catch(() => false);
  }

  async waitForMessage(messageText: string, timeout = 30000): Promise<boolean> {
    // Use polling to check page text content directly,
    // since the message text may span multiple child elements
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const bodyText = await this.page.locator('body').textContent().catch(() => '');
      if (bodyText?.includes(messageText)) return true;
      await this.page.waitForTimeout(1000);
    }
    return false;
  }

  /**
   * Wait for a message with retry — re-selects conversation between attempts to refresh messages.
   */
  async waitForMessageWithRetry(
    messageText: string,
    conversationName: string,
    maxRetries: number = 3,
    waitPerAttempt: number = 10000,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const found = await this.waitForMessage(messageText, waitPerAttempt);
      if (found) return true;

      console.log(`[Retry ${attempt}/${maxRetries}] Message not found, refreshing and re-selecting conversation...`);
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
      await this.navigateToMessages();
      await this.selectConversation(conversationName);
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════
  //  CHAT HEADER
  // ═══════════════════════════════════════════════════════════

  async getChatRecipientName(): Promise<string> {
    return (await this.chatHeaderName.textContent())?.trim() || '';
  }

  // ═══════════════════════════════════════════════════════════
  //  BLUE TICK / READ RECEIPT VERIFICATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Check if the tick mark SVG is visible on the last sent (outgoing) message.
   * The tick is an svg[width="18"][height="12"] with a double-checkmark path,
   * placed next to the timestamp in justify-end message rows.
   *
   * Stroke colors:
   *   - #B9B9B9 = delivered (gray tick)
   *   - blue variant = read (blue tick)
   */
  async isTickVisible(): Promise<boolean> {
    const lastSent = this.outgoingMessages.last();
    const tick = lastSent.locator('svg[width="18"][height="12"]');
    return await tick.isVisible({ timeout: 10000 }).catch(() => false);
  }

  /**
   * Get the tick stroke color for the last sent message.
   * @returns stroke color string (e.g., "#B9B9B9" for gray, or a blue hex for read)
   */
  async getTickColor(): Promise<string> {
    const lastSent = this.outgoingMessages.last();
    const tickPath = lastSent.locator('svg[width="18"][height="12"] path');
    return await tickPath.getAttribute('stroke') || '';
  }

  /**
   * Check if the tick is blue (message was read).
   */
  async isBlueTickVisible(): Promise<boolean> {
    const color = await this.getTickColor();
    // Gray = #B9B9B9, Blue = anything else (e.g., #4FC3F7, #29B6F6, etc.)
    return color !== '' && color !== '#B9B9B9';
  }

  /**
   * Check if the tick (gray or blue) is present for a specific sent message.
   * @param messageText - The message text to check
   */
  async hasTickForMessage(messageText: string): Promise<boolean> {
    // Find the outgoing message row containing this text
    const msgRow = this.outgoingMessages.filter({ hasText: messageText });
    const tick = msgRow.locator('svg[width="18"][height="12"]');
    return await tick.isVisible({ timeout: 10000 }).catch(() => false);
  }

  /**
   * Get tick stroke color for a specific message.
   */
  async getTickColorForMessage(messageText: string): Promise<string> {
    const msgRow = this.outgoingMessages.filter({ hasText: messageText });
    const tickPath = msgRow.locator('svg[width="18"][height="12"] path');
    return await tickPath.getAttribute('stroke') || '';
  }

  /**
   * Wait for the tick mark to appear on the last sent message.
   * @param timeout - Maximum wait time in ms
   */
  async waitForTick(timeout = 30000): Promise<boolean> {
    try {
      const lastSent = this.outgoingMessages.last();
      await lastSent.locator('svg[width="18"][height="12"]').waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  VERIFY SENT MESSAGE
  // ═══════════════════════════════════════════════════════════

  async verifySentMessage(messageText: string): Promise<boolean> {
    // Sent messages live in justify-end rows with bg-[#34373E] bubbles
    const sentBubble = this.outgoingMessages.filter({ hasText: messageText });
    const visible = await sentBubble.isVisible().catch(() => false);
    console.log(visible ? `Message sent: "${messageText}"` : `Message NOT found: "${messageText}"`);
    return visible;
  }

  async sendAndVerifyMessage(message: string): Promise<boolean> {
    await this.sendMessage(message);
    return await this.verifySentMessage(message);
  }

  /**
   * Send a message, verify it appears, and verify the tick mark is displayed.
   */
  async sendAndVerifyWithTick(message: string): Promise<{ sent: boolean; tick: boolean; tickColor: string }> {
    await this.sendMessage(message);
    const sent = await this.verifySentMessage(message);
    const tick = await this.waitForTick(15000);
    const tickColor = tick ? await this.getTickColorForMessage(message) : '';
    return { sent, tick, tickColor };
  }

  // ═══════════════════════════════════════════════════════════
  //  FILE UPLOAD / DOWNLOAD
  // ═══════════════════════════════════════════════════════════

  /**
   * Upload a file attachment in the chat.
   * @param filePath - Absolute path to the file to upload
   */
  async uploadFile(filePath: string): Promise<void> {
    // Directly set the file on the hidden input WITHOUT clicking the attachment button
    // Clicking the button opens a native OS file dialog which Playwright can't interact with
    await this.fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(2000);

    // Click send button to send the file
    await this.sendButton.click();
    await this.page.waitForTimeout(3000);
  }

  /**
   * Check if a file attachment is visible in the chat or conversation preview.
   * @param fileName - Name of the file (optional)
   */
  async isFileAttachmentVisible(fileName?: string): Promise<boolean> {
    // Method 1: Check conversation preview shows "File"
    const previewShowsFile = await this.page
      .locator('span.truncate:has-text("File")')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (previewShowsFile) {
      return true;
    }

    // Method 2: Check for file icon SVG in outgoing messages
    // The file icon appears as a white document with folded corner
    const fileIconInChat = await this.outgoingMessages
      .last()
      .locator('svg, img')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (fileIconInChat) {
      return true;
    }

    // Method 3: Check for filename text if provided
    if (fileName) {
      const fileNameVisible = await this.chatBody
        .getByText(fileName, { exact: false })
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      if (fileNameVisible) {
        return true;
      }
    }

    return false;
  }

  /**
   * Wait for a file attachment to appear in the chat.
   * @param fileName - Name of the file (optional)
   * @param timeout - Maximum wait time in ms
   */
  async waitForFileAttachment(fileName?: string, timeout = 30000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await this.isFileAttachmentVisible(fileName)) {
        return true;
      }
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  /**
   * Download a file attachment from the chat.
   * Handles: direct download, new tab opening, preview modals.
   * @param fileName - Name of the file (used for identifying)
   * @param downloadDir - Directory to save the downloaded file
   * @returns Path to the downloaded file
   */
  async downloadFile(fileName: string, downloadDir: string): Promise<string> {
    // Wait for chat body to be rendered
    await this.chatBody.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(2000);

    // For incoming messages (receiver's view), look for file icons in incoming messages
    // Also try outgoing messages as fallback
    const incomingFiles = this.incomingMessages.locator('svg, img, div:has(svg)');
    const outgoingFiles = this.outgoingMessages.locator('svg, img, div:has(svg)');
    const allFileIcons = this.chatBody.locator('svg');
    // Fallback: search entire page for file elements
    const pageFileIcons = this.page.locator('div.flex.mb-4 svg, div.flex.mb-4 img');

    const incomingCount = await incomingFiles.count();
    const outgoingCount = await outgoingFiles.count();
    const allCount = await allFileIcons.count();
    const pageCount = allCount === 0 ? await pageFileIcons.count() : 0;
    console.log(`Found files - incoming: ${incomingCount}, outgoing: ${outgoingCount}, all SVGs: ${allCount}, page fallback: ${pageCount}`);

    // Determine which file element to click
    let fileElement;
    if (incomingCount > 0) {
      fileElement = incomingFiles.last();
      console.log('Clicking incoming file attachment...');
    } else if (outgoingCount > 0) {
      fileElement = outgoingFiles.last();
      console.log('Clicking outgoing file attachment...');
    } else if (allCount > 0) {
      fileElement = allFileIcons.last();
      console.log('Clicking file SVG...');
    } else if (pageCount > 0) {
      fileElement = pageFileIcons.last();
      console.log('Clicking file from page fallback...');
    } else {
      throw new Error('No file attachments found in chat');
    }

    // Listen for download or new page
    const context = this.page.context();
    const downloadPromise = this.page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    const newPagePromise = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);

    // Click the file element
    await fileElement.click({ timeout: 10000 });
    await this.page.waitForTimeout(2000);

    // Check for direct download
    let download = await downloadPromise;
    if (download) {
      const suggestedName = download.suggestedFilename() || fileName;
      const downloadPath = `${downloadDir}/${suggestedName}`;
      await download.saveAs(downloadPath);
      console.log(`File downloaded directly to: ${downloadPath}`);
      return downloadPath;
    }

    // Check for new page/tab
    const newPage = await newPagePromise;
    if (newPage) {
      console.log('New tab opened...');
      await newPage.waitForLoadState('load');
      const url = newPage.url();
      console.log(`New page URL: ${url}`);

      // Try download button or fetch URL
      const downloadBtn = newPage.locator('button:has-text("Download"), a:has-text("Download"), a[download]').first();
      if (await downloadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        const dlPromise = newPage.waitForEvent('download', { timeout: 15000 });
        await downloadBtn.click();
        download = await dlPromise;
        if (download) {
          const suggestedName = download.suggestedFilename() || fileName;
          const downloadPath = `${downloadDir}/${suggestedName}`;
          await download.saveAs(downloadPath);
          await newPage.close();
          return downloadPath;
        }
      }

      // Fetch URL content
      if (url.includes('blob:') || url.includes('.pdf')) {
        const downloadPath = `${downloadDir}/${fileName}`;
        const response = await newPage.request.get(url);
        const buffer = await response.body();
        const fs = await import('fs');
        fs.writeFileSync(downloadPath, buffer);
        await newPage.close();
        return downloadPath;
      }
      await newPage.close();
    }

    // Try double-clicking
    console.log('Trying double-click...');
    const downloadPromise2 = this.page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    await fileElement.dblclick();
    await this.page.waitForTimeout(2000);

    download = await downloadPromise2;
    if (download) {
      const suggestedName = download.suggestedFilename() || fileName;
      const downloadPath = `${downloadDir}/${suggestedName}`;
      await download.saveAs(downloadPath);
      return downloadPath;
    }

    // Save debug screenshot
    console.log('Download mechanism not found. Taking a screenshot for debugging...');
    await this.page.screenshot({ path: `${downloadDir}/debug_screenshot.png` });

    throw new Error('Could not download file - no download mechanism found. Screenshot saved for debugging.');
  }

  /**
   * Upload multiple files sequentially, verifying each appears in the chat.
   * @param filePaths - Array of absolute paths to files
   * @returns Array of results: { fileName, uploaded } for each file
   */
  async uploadMultipleFiles(filePaths: string[]): Promise<{ fileName: string; uploaded: boolean }[]> {
    const results: { fileName: string; uploaded: boolean }[] = [];
    for (const filePath of filePaths) {
      const fileName = filePath.split(/[/\\]/).pop() || '';
      await this.uploadFile(filePath);
      const uploaded = await this.waitForFileAttachment(fileName, 15000);
      results.push({ fileName, uploaded });
      console.log(`Uploaded "${fileName}": ${uploaded ? 'OK' : 'FAILED'}`);
    }
    return results;
  }

  /**
   * Download a file attachment by its position relative to the end of the chat.
   * Use this when multiple files exist in the chat and you need a specific one.
   * @param reverseIndex - 0-based index from the end (0 = last file, 1 = second-to-last, etc.)
   * @param fileName - Expected filename (used as fallback for save path)
   * @param downloadDir - Directory to save the downloaded file
   * @returns Path to the downloaded file
   */
  async downloadFileByIndex(reverseIndex: number, fileName: string, downloadDir: string): Promise<string> {
    // Wait for chat body to be rendered
    await this.chatBody.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(2000);

    // File attachment bubbles contain either an <img alt="Uploaded"> (images)
    // or an <a target="_blank"> wrapping a file preview (PDFs/documents).
    // Use page-level search as fallback if chatBody doesn't contain messages
    let allFileBubbles = this.chatBody.locator('div.flex.mb-4').filter({
      has: this.page.locator('img[alt="Uploaded"], a[target="_blank"]'),
    });
    let count = await allFileBubbles.count();

    // Fallback: search entire page if chatBody selector doesn't match
    if (count === 0) {
      console.log('chatBody did not match, falling back to page-level search...');
      allFileBubbles = this.page.locator('div.flex.mb-4').filter({
        has: this.page.locator('img[alt="Uploaded"], a[target="_blank"]'),
      });
      count = await allFileBubbles.count();
    }
    const actualIndex = count - 1 - reverseIndex;
    console.log(`Found ${count} file bubbles, downloading reverse index ${reverseIndex} (actual: ${actualIndex})...`);

    if (actualIndex < 0 || actualIndex >= count) {
      throw new Error(`File reverse index ${reverseIndex} out of range (${count} file bubbles found)`);
    }

    // Click the file preview element (image or link) inside the bubble
    const bubble = allFileBubbles.nth(actualIndex);
    const fileElement = bubble.locator('img[alt="Uploaded"], a[target="_blank"] img, a[target="_blank"]').first();

    // Listen for download or new page
    const context = this.page.context();
    const downloadPromise = this.page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    const newPagePromise = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);

    await fileElement.click({ timeout: 10000 });
    await this.page.waitForTimeout(2000);

    // Check for direct download
    let download = await downloadPromise;
    if (download) {
      const suggestedName = download.suggestedFilename() || fileName;
      const downloadPath = `${downloadDir}/${suggestedName}`;
      await download.saveAs(downloadPath);
      console.log(`File downloaded directly to: ${downloadPath}`);
      return downloadPath;
    }

    // Check for new page/tab (PDF preview etc.)
    const newPage = await newPagePromise;
    if (newPage) {
      console.log('New tab opened for file preview...');
      await newPage.waitForLoadState('load');
      const url = newPage.url();

      const downloadBtn = newPage.locator('button:has-text("Download"), a:has-text("Download"), a[download]').first();
      if (await downloadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        const dlPromise = newPage.waitForEvent('download', { timeout: 15000 });
        await downloadBtn.click();
        download = await dlPromise;
        if (download) {
          const suggestedName = download.suggestedFilename() || fileName;
          const downloadPath = `${downloadDir}/${suggestedName}`;
          await download.saveAs(downloadPath);
          await newPage.close();
          return downloadPath;
        }
      }

      if (url.includes('blob:') || url.includes('.pdf')) {
        const downloadPath = `${downloadDir}/${fileName}`;
        const response = await newPage.request.get(url);
        const buffer = await response.body();
        const fs = await import('fs');
        fs.writeFileSync(downloadPath, buffer);
        await newPage.close();
        return downloadPath;
      }
      await newPage.close();
    }

    throw new Error(`Could not download file at reverse index ${reverseIndex} ("${fileName}")`);
  }

  // ═══════════════════════════════════════════════════════════
  //  SEARCH RESULTS
  // ═══════════════════════════════════════════════════════════

  /**
   * Check if a conversation matching the given name is visible in the list.
   * @param name - Name (or partial name) to look for in conversation h2 titles
   */
  async isConversationVisible(name: string): Promise<boolean> {
    return await this.page
      .locator(`h2[title*="${name}"]`)
      .first()
      .isVisible()
      .catch(() => false);
  }

  // ═══════════════════════════════════════════════════════════
  //  DOUBLE CHECKMARK VERIFICATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Verify the double-checkmark SVG path data on a specific outgoing message.
   * @param messageText - The message text to locate
   * @returns The 'd' attribute of the SVG path element
   */
  async getDoubleCheckmarkPath(messageText: string): Promise<string> {
    const tickPath = this.outgoingMessages
      .filter({ hasText: messageText })
      .locator('svg[width="18"][height="12"] path');
    return (await tickPath.getAttribute('d')) || '';
  }

  // ═══════════════════════════════════════════════════════════
  //  RECEIVED MESSAGE TEXT
  // ═══════════════════════════════════════════════════════════

  /**
   * Get the text content of a specific incoming (received) message bubble.
   * @param messageText - The message text to filter on
   * @returns Trimmed text content of the message bubble
   */
  async getReceivedMessageText(messageText: string): Promise<string> {
    const receivedBubble = this.incomingMessages
      .filter({ hasText: messageText })
      .locator('p.text-sm');
    return (await receivedBubble.textContent())?.trim() || '';
  }

  // ═══════════════════════════════════════════════════════════
  //  FILE UPLOAD / DOWNLOAD
  // ═══════════════════════════════════════════════════════════

  /**
   * Upload a file and verify it appears in the chat.
   * @param filePath - Absolute path to the file to upload
   * @returns True if file appears in chat after upload
   */
  async uploadAndVerifyFile(filePath: string): Promise<boolean> {
    const fileName = filePath.split(/[/\\]/).pop() || '';
    await this.uploadFile(filePath);

    // Wait for file to appear in chat (check for file icon or filename)
    const fileAppeared = await this.waitForFileAttachment(fileName, 15000);

    // Also verify the conversation preview shows "File"
    const previewShowsFile = await this.page.getByText('You: File', { exact: false }).isVisible().catch(() => false);

    return fileAppeared || previewShowsFile;
  }
}

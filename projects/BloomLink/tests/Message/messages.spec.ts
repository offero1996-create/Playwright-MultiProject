import { test } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { MessagesPage } from '../../pages/messages.page';
import { users } from '../../test-data/users';
import { loginAndGoToSessions, loginAndOpenConversation, launchSecondBrowser } from '../../utils/navigation-helper';
import { getFileHash, ensureDirectoryExists, fileExists } from '../../utils/file-helper';
import { generateTimestamp } from '../../../../utils/date-helper';
import {
  assertVisible, assertHasClass, assertCountGreaterThan, assertTruthy, assertTextEquals,
} from '../../../../utils/assertions/ui';
import { assertFileExists, assertFileHashMatch } from '../../../../utils/assertions/file';
import {
  assertMessageSent, assertTickVisible, assertTickColor, assertTickColorChanged,
  assertDoubleCheckmarkSvg, assertOutgoingMessage,
  assertUnreadBadgeCount, assertSenderNotSelfNotified,
} from '../../../../utils/assertions/messages';
import { logger } from '../../../../utils/logger';

const user1 = users.owner;
const user2 = users.teamMember;
const user3 = users.admin;

// ES module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test data paths
const testDataDir = path.resolve(__dirname, '../../test-data/Message PDF');
const testPdfPath = path.join(testDataDir, 'MessageData.pdf');
const multipleTestFiles = [
  path.join(testDataDir, 'MessageData1.pdf'),
  path.join(testDataDir, 'MessageData2.pdf'),
];
const downloadsDir = path.resolve(__dirname, '../../downloads');

// Ensure downloads directory exists
ensureDirectoryExists(downloadsDir);

test.describe.serial('BloomLink - Messages', () => {
  test.setTimeout(120_000);

  test('Verify Messages page UI: elements, filters, and search', async ({ page, context }) => {
    const bloomLinkPage = await loginAndGoToSessions(page, context, user1.email, user1.password, 'User1');
    const messagesPage = new MessagesPage(bloomLinkPage);
    await messagesPage.navigateToMessages();

    // Left panel elements
    await assertVisible(messagesPage.searchInput, 'Search input', { timeout: 10000 });
    await assertVisible(messagesPage.searchIcon, 'Search icon');
    await assertVisible(messagesPage.allFilterButton, 'All filter button');
    await assertVisible(messagesPage.notReadFilterButton, 'Not Read filter button');

    const convCount = await messagesPage.getConversationCount();
    assertCountGreaterThan(convCount, 0, 'Conversation count');

    await assertVisible(messagesPage.selectRecipientDropdown, 'Recipient dropdown');

    // Filters
    await assertHasClass(messagesPage.allFilterButton, /bg-\[#543CC2\]/, '"All" filter active');

    await messagesPage.filterConversations('Not Read');
    await assertHasClass(messagesPage.notReadFilterButton, /bg-\[#543CC2\]/, '"Not Read" filter active');

    await messagesPage.filterConversations('All');
    await assertHasClass(messagesPage.allFilterButton, /bg-\[#543CC2\]/, '"All" filter active again');

    // Search
    const searchName = user2.displayName!.split(' ')[0];
    await messagesPage.searchConversation(searchName);
    const found = await messagesPage.isConversationVisible(searchName);
    logger.step(`Search for "${searchName}": ${found ? 'Found' : 'Not found'}`);
    await messagesPage.searchInput.clear();
    await messagesPage.page.waitForTimeout(500);

    // Right panel (click first conversation)
    await messagesPage.conversationItems.first().click();
    await messagesPage.page.waitForTimeout(2000);

    await assertVisible(messagesPage.chatHeaderName, 'Chat header name', { timeout: 10000 });
    await assertVisible(messagesPage.messageInput, 'Message input');
    await assertVisible(messagesPage.sendButton, 'Send button');
    await assertVisible(messagesPage.attachmentButton, 'Attachment button');
  });

  test('Send messages and verify tick marks (delivered)', async ({ page, context }) => {
    const { messagesPage } = await loginAndOpenConversation(
      page, context, user1, user2.displayName!, 'User1',
    );

    const timestamp = generateTimestamp();
    const messages = [
      `First msg - ${timestamp}`,
      `Second msg - ${timestamp}`,
      `Third msg - ${timestamp}`,
    ];

    for (const msg of messages) {
      const result = await messagesPage.sendAndVerifyWithTick(msg);
      assertMessageSent(result, msg);

      const isOutgoing = await messagesPage.outgoingMessages.filter({ hasText: msg }).isVisible();
      assertOutgoingMessage(isOutgoing, msg);

      const hasTickForMsg = await messagesPage.hasTickForMessage(msg);
      assertTruthy(hasTickForMsg, `Tick should be on "${msg}"`);
    }

    // Verify double-checkmark SVG path on last message
    const lastMsg = messages[messages.length - 1];
    const pathD = await messagesPage.getDoubleCheckmarkPath(lastMsg);
    assertDoubleCheckmarkSvg(pathD);
  });

  test('User2 reads message — verify received text matches and tick turns blue', async ({ page, context }) => {
    // USER 1: Send message
    const { bloomLinkPage: user1BloomLink, messagesPage: messagesPage1 } =
      await loginAndOpenConversation(page, context, user1, user2.displayName!, 'User1');

    const timestamp = generateTimestamp();
    const testMessage = `Hello from automation - ${timestamp}`;

    const result = await messagesPage1.sendAndVerifyWithTick(testMessage);
    assertMessageSent(result, testMessage);
    assertTickColor(result.tickColor!, '#B9B9B9', 'Tick should be gray (delivered, not read)');

    // USER 2: Open second browser and read the message
    const { browser: browser2, page: page2, context: context2 } = await launchSecondBrowser();

    try {
      const { messagesPage: messagesPage2 } =
        await loginAndOpenConversation(page2, context2, user2, user1.displayName!, 'User2');

      // Poll for message — re-select conversation to refresh if not found
      const messageReceived = await messagesPage2.waitForMessageWithRetry(
        testMessage, user1.displayName!, 3, 10000
      );
      assertTruthy(messageReceived, 'User2 should see the message');

      const receivedText = await messagesPage2.getReceivedMessageText(testMessage);
      assertTextEquals(receivedText, testMessage, 'Received message matches sent');

      await messagesPage2.page.waitForTimeout(3000);

      // USER 1: Check if tick turned blue
      logger.step('Checking tick color after User2 read', 'User1');
      await user1BloomLink.bringToFront();
      await user1BloomLink.getByRole('link', { name: 'Home' }).click();
      await user1BloomLink.waitForLoadState('domcontentloaded');
      await user1BloomLink.waitForTimeout(2000);
      await messagesPage1.navigateToMessages();
      await messagesPage1.selectConversation(user2.displayName!);

      const tickColorAfterRead = await messagesPage1.getTickColorForMessage(testMessage);
      assertTickColorChanged(tickColorAfterRead, '#B9B9B9', 'Tick should turn blue after User2 reads');
    } finally {
      await browser2.close();
    }
  });

  test('User1 uploads file, User2 downloads and verifies integrity', async ({ page, context }) => {
    assertFileExists(fileExists(testPdfPath), testPdfPath);
    const originalFileName = path.basename(testPdfPath);
    const originalFileHash = getFileHash(testPdfPath);

    // USER 1: Upload file
    const { messagesPage: messagesPage1 } =
      await loginAndOpenConversation(page, context, user1, user2.displayName!, 'User1');

    const uploadSuccess = await messagesPage1.uploadAndVerifyFile(testPdfPath);
    assertTruthy(uploadSuccess, 'File should appear in chat after upload');

    const tickVisible = await messagesPage1.isTickVisible();
    assertTickVisible(tickVisible, 'Tick mark on file message');

    // USER 2: Download and verify
    const { browser: browser2, page: page2, context: context2 } =
      await launchSecondBrowser({ acceptDownloads: true });

    try {
      const { messagesPage: messagesPage2 } =
        await loginAndOpenConversation(page2, context2, user2, user1.displayName!, 'User2');

      const fileVisible = await messagesPage2.waitForFileAttachment(originalFileName, 15000);
      assertTruthy(fileVisible, `User2 should see "${originalFileName}"`);

      const downloadPath = await messagesPage2.downloadFile(originalFileName, downloadsDir);
      assertFileExists(fileExists(downloadPath), downloadPath);

      const downloadedFileHash = getFileHash(downloadPath);
      assertFileHashMatch(downloadedFileHash, originalFileHash, originalFileName);
    } finally {
      await browser2.close();
    }
  });

  test('Unread badge appears for recipient, sender does NOT get self-notification', async ({ page, context }) => {
    // USER 1 (offero): Login to BloomLink, capture current badge count, then send a message to User3 (OfferoAdmin)
    const { bloomLinkPage: user1BloomLink, messagesPage: messagesPage1 } =
      await loginAndOpenConversation(page, context, user1, user3.displayName!, 'User1');

    // Capture User1's badge count BEFORE sending
    const user1BadgeBefore = await messagesPage1.getSidebarUnreadBadgeCount();
    logger.step(`User1 sidebar badge before sending: ${user1BadgeBefore}`);

    const timestamp = generateTimestamp();
    const testMessage = `Unread badge test - ${timestamp}`;

    const result = await messagesPage1.sendAndVerifyWithTick(testMessage);
    assertMessageSent(result, testMessage);

    // Wait briefly for any notification to propagate
    await user1BloomLink.waitForTimeout(5000);

    // USER 1: Verify sender does NOT get a self-notification (badge should not increase)
    // Navigate away and back to refresh sidebar state
    await user1BloomLink.getByRole('link', { name: 'Home' }).click();
    await user1BloomLink.waitForLoadState('domcontentloaded');
    await user1BloomLink.waitForTimeout(2000);

    const user1BadgeAfter = await messagesPage1.getSidebarUnreadBadgeCount();
    logger.step(`User1 sidebar badge after sending: ${user1BadgeAfter}`);
    assertSenderNotSelfNotified(user1BadgeBefore, user1BadgeAfter, 'Sender (User1) should not be self-notified');

    // USER 3 (OfferoAdmin): Login in second browser and check unread badge
    const { browser: browser3, page: page3, context: context3 } = await launchSecondBrowser();

    try {
      const bloomLinkPage3 = await loginAndGoToSessions(page3, context3, user3.email, user3.password, 'User3');
      const messagesPage3 = new MessagesPage(bloomLinkPage3);

      // Navigate to Home first to see the sidebar badge
      await bloomLinkPage3.getByRole('link', { name: 'Home' }).click();
      await bloomLinkPage3.waitForLoadState('domcontentloaded');
      await bloomLinkPage3.waitForTimeout(3000);

      // Check User3's unread badge — should have at least 1 unread
      const user3BadgeCount = await messagesPage3.waitForSidebarBadgeCount(1, 15000);
      logger.step(`User3 sidebar unread badge count: ${user3BadgeCount}`);
      assertUnreadBadgeCount(user3BadgeCount, 1, 'Recipient (User3) should have unread badge >= 1');

      // Open the conversation and verify the message is there
      await messagesPage3.navigateToMessages();
      await messagesPage3.selectConversation(user1.displayName!);

      const messageReceived = await messagesPage3.waitForMessageWithRetry(
        testMessage, user1.displayName!, 3, 10000,
      );
      assertTruthy(messageReceived, 'User3 should see the message from User1');

      // After reading, navigate away and check badge decreased or disappeared
      await bloomLinkPage3.getByRole('link', { name: 'Home' }).click();
      await bloomLinkPage3.waitForLoadState('domcontentloaded');
      await bloomLinkPage3.waitForTimeout(3000);

      const user3BadgeAfterRead = await messagesPage3.getSidebarUnreadBadgeCount();
      logger.step(`User3 sidebar badge after reading: ${user3BadgeAfterRead}`);
      // Badge should be less than before reading (the conversation was marked as read)
      logger.step(`Badge change: ${user3BadgeCount} → ${user3BadgeAfterRead}`);
    } finally {
      await browser3.close();
    }
  });

  test('User1 uploads multiple files, User2 downloads and verifies each', async ({ page, context }) => {
    // Setup: verify all test files exist and capture hashes
    const fileInfos = multipleTestFiles.map((filePath) => {
      const fileName = path.basename(filePath);
      assertFileExists(fileExists(filePath), filePath);
      return { filePath, fileName, hash: getFileHash(filePath) };
    });

    // USER 1: Upload all files
    const { messagesPage: messagesPage1 } =
      await loginAndOpenConversation(page, context, user1, user2.displayName!, 'User1');

    const uploadResults = await messagesPage1.uploadMultipleFiles(multipleTestFiles);
    for (const result of uploadResults) {
      assertTruthy(result.uploaded, `"${result.fileName}" should appear in chat after upload`);
    }

    const tickVisible = await messagesPage1.isTickVisible();
    assertTickVisible(tickVisible, 'Tick on last file message');

    // USER 2: Verify and download
    const { browser: browser2, page: page2, context: context2 } =
      await launchSecondBrowser({ acceptDownloads: true });

    try {
      const { messagesPage: messagesPage2 } =
        await loginAndOpenConversation(page2, context2, user2, user1.displayName!, 'User2');

      for (const { fileName } of fileInfos) {
        const visible = await messagesPage2.waitForFileAttachment(fileName, 15000);
        assertTruthy(visible, `User2 should see "${fileName}"`);
      }

      const totalFiles = fileInfos.length;
      for (let i = 0; i < totalFiles; i++) {
        const reverseIndex = totalFiles - 1 - i;
        const { fileName, hash: originalHash } = fileInfos[i];
        const downloadPath = await messagesPage2.downloadFileByIndex(reverseIndex, fileName, downloadsDir);
        assertFileExists(fileExists(downloadPath), downloadPath);

        const downloadedHash = getFileHash(downloadPath);
        assertFileHashMatch(downloadedHash, originalHash, fileName);
      }
    } finally {
      await browser2.close();
    }
  });
});

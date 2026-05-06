/**
 * BloomLink Session helpers — shared utilities for multi-user session tests.
 */

import { expect, chromium, Browser, Page } from '@playwright/test';
import path from 'path';

import { MeetingPage } from '../pages/meeting.page';
import { SessionsPage } from '../pages/sessions.page';
import { urls } from '../test-data/urls';
import { loginAndGoToSessions } from './navigation-helper';
import { logger } from '../../../utils/logger';

const audioFixturePath = path.resolve(process.cwd(), urls.audioFixturePath);
const isHeadless = process.env.HEADLESS === 'true';

export const fakeMediaArgs = [
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  `--use-file-for-fake-audio-capture=${audioFixturePath}`,
];

export interface UserSession {
  browser: Browser;
  bloomLinkPage: Page;
  sessionsPage: SessionsPage;
  meetingPage: MeetingPage;
}

/**
 * Launch a new browser, login, go to sessions, and join the meeting.
 * Used for secondary/tertiary users in multi-user session tests.
 */
export async function launchUserAndJoin(
  email: string,
  password: string,
  label: string,
): Promise<UserSession> {
  logger.step(`Launching browser...`, label);
  
  const browser = await chromium.launch({
    headless: isHeadless,
    args: [
      ...(isHeadless ? [] : ['--start-maximized']),
      ...fakeMediaArgs,
    ],
  });
  const context = await browser.newContext({
    permissions: ['camera', 'microphone'],
    viewport: isHeadless ? { width: 1920, height: 1080 } : null,
  });
  const page = await context.newPage();

  const bloomLinkPage = await loginAndGoToSessions(page, context, email, password, label);
  const sessionsPage = new SessionsPage(bloomLinkPage);

  const joined = await sessionsPage.waitAndClickJoin(label);
  expect(joined, `${label} should find Join button`).toBeTruthy();

  const meetingPage = new MeetingPage(bloomLinkPage);
  await meetingPage.waitForMeetingUi();
  await meetingPage.unmuteMic();

  return { browser, bloomLinkPage, sessionsPage, meetingPage };
}

/**
 * Returns Playwright test.use() options for session tests with fake media.
 */
export function getSessionTestOptions() {
  return {
    permissions: ['camera', 'microphone'] as string[],
    viewport: isHeadless ? { width: 1920, height: 1080 } : null,
    launchOptions: {
      args: [
        ...(isHeadless ? [] : ['--start-maximized']),
        ...fakeMediaArgs,
      ],
    },
  };
}

/**
 * Close a user session (browser) with logging.
 */
export async function closeUserSession(session: UserSession, label: string) {
  await session.browser.close();
}

/**
 * Close multiple user sessions safely.
 */
export async function closeUserSessions(sessions: UserSession[], labels: string[]) {
  for (let i = 0; i < sessions.length; i++) {
    try {
      await closeUserSession(sessions[i], labels[i]);
    } catch (error) {
      logger.warn(`Failed to close ${labels[i]} session: ${error}`);
    }
  }
}

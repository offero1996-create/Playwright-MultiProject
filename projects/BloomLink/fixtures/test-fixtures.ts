import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { BloomLinkHomePage } from '../pages/bloomlink-home.page';
import { SessionsPage } from '../pages/sessions.page';
import { CreateSessionPage } from '../pages/create-session.page';
import { MeetingPage } from '../pages/meeting.page';

/**
 * BloomLink Test Fixtures
 * Provides pre-configured page objects for all BloomLink pages.
 */

type BloomLinkFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  bloomLinkHomePage: BloomLinkHomePage;
  sessionsPage: SessionsPage;
  createSessionPage: CreateSessionPage;
  meetingPage: MeetingPage;
};

export const test = base.extend<BloomLinkFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  bloomLinkHomePage: async ({ page }, use) => {
    const bloomLinkHomePage = new BloomLinkHomePage(page);
    await use(bloomLinkHomePage);
  },

  sessionsPage: async ({ page }, use) => {
    const sessionsPage = new SessionsPage(page);
    await use(sessionsPage);
  },

  createSessionPage: async ({ page }, use) => {
    const createSessionPage = new CreateSessionPage(page);
    await use(createSessionPage);
  },

  meetingPage: async ({ page }, use) => {
    const meetingPage = new MeetingPage(page);
    await use(meetingPage);
  },
});

export { expect } from '@playwright/test';

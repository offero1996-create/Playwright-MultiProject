import { Page, Locator } from '@playwright/test';
import { testConfig } from '../config/testConfig';

/**
 * PageHelper - Universal utility class for common Playwright page operations.
 * Extend this class in your Page Objects for shared functionality.
 */
export class PageHelper {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(url: string) {
    await this.page.goto(url);
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async getUrl(): Promise<string> {
    return this.page.url();
  }

  async click(locator: string) {
    await this.page.click(locator);
  }

  /**
   * Click a locator using real mouse move + click actions (bypasses JS click issues on SPA routes).
   * Waits for the element to be visible, scrolls it into view, then moves the mouse to its
   * centre coordinates and dispatches a real left-click.
   */
  async mouseClick(locator: Locator, timeout = testConfig.timeouts.pageLoad) {
    await locator.waitFor({ state: 'visible', timeout });
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error('mouseClick: element has no bounding box');
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }

  async fill(locator: string, text: string) {
    await this.page.fill(locator, text);
  }

  async getText(locator: string): Promise<string> {
    return await this.page.locator(locator).textContent() || '';
  }

  async isVisible(locator: string): Promise<boolean> {
    return await this.page.locator(locator).isVisible();
  }

  async waitForSelector(locator: string) {
    await this.page.waitForSelector(locator);
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  getLocator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * Wait for a specified amount of time.
   * @param ms - Time to wait in milliseconds
   */
  async waitFor(ms: number) {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Close any cookie consent dialog and ad popup overlays.
   * Call after navigating to any page for eager dismissal.
   */
  async closeOverlays() {
    const denyBtn = this.page.locator('#CybotCookiebotDialogBodyButtonDecline, button:has-text("Deny")').first();
    if (await denyBtn.isVisible({ timeout: testConfig.timeouts.medium }).catch(() => false)) {
      await denyBtn.click().catch(() => {});
    }

    const adModal = this.page.locator('[aria-labelledby="ev-show-title"]');
    if (await adModal.isVisible({ timeout: testConfig.timeouts.navigation }).catch(() => false)) {
      await adModal.evaluate(el => el.remove()).catch(() => {});
    }
  }

  /** @deprecated Use closeOverlays() instead */
  async handleAllPopups() {
    await this.closeOverlays();
  }
}

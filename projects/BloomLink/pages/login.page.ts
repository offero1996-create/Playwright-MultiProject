import { Page, Locator } from '@playwright/test';
import { PageHelper } from '../../../utils/page-helper';
import { testConfig } from '../../../config/testConfig';

export class LoginPage extends PageHelper {
  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly pageHeading: Locator;
  readonly passwordToggleButton: Locator;
  readonly loginIllustration: Locator;

  constructor(page: Page) {
    super(page);
    
    // Login form locators
    this.emailInput = page.getByRole('textbox', { name: 'Email' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Log In' });
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot your password?' });
    this.pageHeading = page.getByRole('heading', { name: 'Login to your account' });
    this.passwordToggleButton = page.locator('button').filter({ has: page.locator('img') }).first();
    this.loginIllustration = page.getByAltText('Login illustration');
  }

  async navigateToLogin() {
    await this.goto('/login');
  }

  async enterEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async enterPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickLogin() {
    await this.loginButton.waitFor({ state: 'visible' });
    await this.loginButton.click();
    // Wait for navigation to complete after login
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.emailInput.waitFor({ state: 'visible' });
    await this.enterEmail(email);
    await this.page.waitForTimeout(testConfig.timeouts.tiny);
    await this.enterPassword(password);
    await this.page.waitForTimeout(testConfig.timeouts.tiny);
    await this.clickLogin();
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async isLoginButtonEnabled(): Promise<boolean> {
    return await this.loginButton.isEnabled();
  }

  async getPageHeadingText(): Promise<string> {
    return await this.pageHeading.textContent() || '';
  }

  async isLoginPageDisplayed(): Promise<boolean> {
    return await this.pageHeading.isVisible();
  }
}

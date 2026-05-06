/**
 * DOM Inspector Script — sends a message and captures the sent message HTML + blue tick.
 * Run: npx tsx scripts/inspect-messages-page.ts
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://app-corestage.platform.bloomifai.com';
const EMAIL = 'offero.Bosco@concertidc.com';
const PASSWORD = 'Ccare@123';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  // === Login ===
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.waitForLoadState('networkidle');

  // === Open BloomLink ===
  const navLastDiv = page.locator('nav').locator('div').last();
  await navLastDiv.click();
  await page.waitForTimeout(1000);
  const bloomLinkPagePromise = context.waitForEvent('page', { timeout: 15000 });
  await page.getByText('BloomLink').click();
  const tp = await bloomLinkPagePromise;
  await tp.waitForLoadState('domcontentloaded');
  await tp.bringToFront();

  // === Navigate to Messages ===
  await tp.getByRole('link', { name: /Messages/i }).click();
  await tp.waitForLoadState('domcontentloaded');
  await tp.waitForTimeout(3000);
  console.log('On Messages page:', tp.url());

  // === Click Ashwin conversation ===
  await tp.getByText('Ashwin').first().click();
  await tp.waitForTimeout(2000);

  // === Send a test message ===
  const testMsg = 'Automation inspect test';
  const textarea = tp.locator('textarea[placeholder="Write a message"]');
  await textarea.fill(testMsg);
  await textarea.press('Enter');
  await tp.waitForTimeout(3000);
  console.log(`Sent message: "${testMsg}"`);

  // === Take screenshot ===
  await tp.screenshot({ path: 'screenshots/messages-after-send.png' });

  // === Dump all message elements in chat area ===
  const chatMessages = await tp.evaluate(() => {
    // The chat body: div.flex.flex-col.flex-1.overflow-y-auto.bg-collaboratortable
    const chatBody = document.querySelector('.bg-collaboratortable.overflow-y-auto');
    if (!chatBody) return 'NO CHAT BODY FOUND';
    return chatBody.innerHTML;
  });
  console.log('\n=== CHAT BODY FULL HTML ===');
  console.log(chatMessages);

  // === Find "You" elements after sending ===
  const youElements = await tp.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const youEls = all.filter(el =>
      el.textContent?.trim() === 'You' && el.children.length === 0
    );
    return youEls.map((el, i) => {
      let row: HTMLElement | null = el as HTMLElement;
      for (let j = 0; j < 6; j++) row = row?.parentElement || null;
      return `["You" #${i}] tag=${el.tagName} class="${el.className}"\n  6-parent: ${row?.outerHTML?.substring(0, 3000) || 'N/A'}`;
    }).join('\n\n') || 'NO "You" ELEMENTS';
  });
  console.log('\n=== "You" ELEMENTS AFTER SEND ===');
  console.log(youElements);

  // === Find ALL SVGs in chat body ===
  const chatSVGs = await tp.evaluate(() => {
    const chatBody = document.querySelector('.bg-collaboratortable.overflow-y-auto');
    if (!chatBody) return 'NO CHAT BODY';
    const svgs = Array.from(chatBody.querySelectorAll('svg'));
    return svgs.map((s, i) => `[SVG #${i}] ${s.outerHTML}`).join('\n\n') || 'NO SVGS IN CHAT BODY';
  });
  console.log('\n=== SVGs IN CHAT BODY (tick marks) ===');
  console.log(chatSVGs);

  // === Check for any image/icon near sent messages ===
  const sentMsgArea = await tp.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    // Find elements with justify-end (right-aligned = sent messages)
    const rightAligned = all.filter(el => {
      const cls = el.className || '';
      return cls.includes('justify-end') && el.textContent && el.textContent.length < 500;
    });
    return rightAligned.map((el, i) => `[RIGHT #${i}] class="${el.className}" html=${el.outerHTML.substring(0, 2000)}`).join('\n\n') || 'NO RIGHT ALIGNED ELEMENTS';
  });
  console.log('\n=== RIGHT-ALIGNED (SENT) MESSAGES ===');
  console.log(sentMsgArea);

  await browser.close();
  console.log('\nDone.');
})();

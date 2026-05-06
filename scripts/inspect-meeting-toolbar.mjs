/**
 * Inspection script: Login → create 1:1 session → join → dump toolbar button HTML.
 * Run: node scripts/inspect-meeting-toolbar.mjs
 */

import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const PLATFORM_LOGIN = 'https://app-corestage.platform.bloomifai.com/login';
const BLOOMLINK_ORIGIN = 'https://corestage-app.bloomlink.bloomifai.com';
const EMAIL    = 'offero.Bosco@concertidc.com';
const PASSWORD = 'Ccare@123';
const TEAM_MEMBER = 'OfferoAdmin';

const audioFixturePath = path.join(rootDir, 'projects/BloomLink/test-data/audio/conversation.wav');

// ─── helpers ────────────────────────────────────────────────────────────────
function getNearestTimeSlot() {
  // Use a time 5 minutes ago — so the Join window is already open
  const now = new Date();
  now.setMinutes(now.getMinutes() - 5, 0, 0);
  // Round down to nearest 15 min
  const roundedMins = Math.floor(now.getMinutes() / 15) * 15;
  now.setMinutes(roundedMins, 0, 0);
  const h = now.getHours(), m = now.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${String(h % 12 || 12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
}
function getEndTime(start, dur = 30) {
  const [time, period] = start.split(' ');
  const [h, m] = time.split(':').map(Number);
  let total = (h % 12) * 60 + m + (period === 'PM' ? 720 : 0) + dur;
  const eh = Math.floor(total / 60) % 24, em = total % 60;
  const ep = eh >= 12 ? 'PM' : 'AM';
  return `${String(eh % 12 || 12).padStart(2,'0')}:${String(em).padStart(2,'0')} ${ep}`;
}
function getCurrentDate() {
  const d = new Date();
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`;
}
async function fillReactSelect(page, inputLocator, value) {
  await inputLocator.click({ force: true });
  await page.waitForTimeout(500);
  await inputLocator.fill(value);
  await page.waitForTimeout(1000);
  await inputLocator.press('Enter');
  await page.waitForTimeout(1000);
}

// ─── launch browser ──────────────────────────────────────────────────────────
const browser = await chromium.launch({
  headless: false,
  args: [
    '--start-maximized',
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    `--use-file-for-fake-audio-capture=${audioFixturePath}`,
  ],
});
const context = await browser.newContext({ viewport: null, permissions: ['camera', 'microphone'] });
await context.grantPermissions(['camera', 'microphone'], { origin: BLOOMLINK_ORIGIN });
const page = await context.newPage();

// ─── login ───────────────────────────────────────────────────────────────────
console.log('Logging in...');
await page.goto(PLATFORM_LOGIN);
await page.getByRole('textbox', { name: 'Email' }).waitFor({ state: 'visible', timeout: 30000 });
await page.getByRole('textbox', { name: 'Email' }).fill(EMAIL);
await page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
await page.getByRole('button', { name: 'Log In' }).click();
await page.getByRole('heading', { name: /Welcome,/ }).waitFor({ state: 'visible', timeout: 30000 });
console.log('Logged in.');

// ─── open BloomLink ───────────────────────────────────────────────────────────
const newPagePromise = context.waitForEvent('page');
await page.locator('nav').locator('div').last().click();
await page.getByText('BloomLink').click();
const bp = await newPagePromise;
await bp.waitForLoadState('domcontentloaded');
await bp.getByText('Please wait').waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});

// ─── navigate to Sessions ─────────────────────────────────────────────────────
await bp.getByRole('link', { name: 'Sessions' }).waitFor({ state: 'visible', timeout: 30000 });
await bp.getByRole('link', { name: 'Sessions' }).click();
await bp.waitForLoadState('domcontentloaded');
console.log('On Sessions page.');

// ─── cancel/end any stale sessions ───────────────────────────────────────────
// End In Call sessions first
let inCallBtns = await bp.getByRole('button', { name: 'In Call' }).count();
while (inCallBtns > 0) {
  console.log('Ending in-call session...');
  await bp.getByRole('button', { name: 'In Call' }).first().click({ force: true });
  await bp.waitForTimeout(3000);
  // look for hangup button and end meeting
  const hangup = bp.locator('button').filter({ has: bp.locator('svg') }).first();
  if (await hangup.isVisible({ timeout: 5000 }).catch(() => false)) {
    await hangup.click({ force: true });
    const endBtn = bp.getByRole('button', { name: 'End Session' });
    if (await endBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await endBtn.click();
    }
  }
  await bp.waitForLoadState('domcontentloaded').catch(() => {});
  await bp.waitForTimeout(2000);
  await bp.getByRole('link', { name: 'Sessions' }).click().catch(() => {});
  await bp.waitForLoadState('domcontentloaded').catch(() => {});
  inCallBtns = await bp.getByRole('button', { name: 'In Call' }).count();
}

let cancelBtns = await bp.getByRole('button', { name: 'Cancel Session' }).count();
while (cancelBtns > 0) {
  console.log('Cancelling stale session...');
  await bp.getByRole('button', { name: 'Cancel Session' }).first().click();
  const textarea = bp.getByPlaceholder(/Reason can be added/i);
  if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
    await textarea.fill('Automated test cleanup');
    await bp.getByRole('button', { name: 'Save' }).click();
  }
  await bp.waitForTimeout(2000);
  cancelBtns = await bp.getByRole('button', { name: 'Cancel Session' }).count();
}

// ─── create session ───────────────────────────────────────────────────────────
console.log('Creating session...');
await bp.getByRole('button', { name: 'Create Session' }).click();
await bp.waitForLoadState('domcontentloaded');
await bp.getByRole('heading', { name: 'Create Session' }).waitFor({ state: 'visible', timeout: 15000 });

const startTime = getNearestTimeSlot();
const endTime   = getEndTime(startTime, 30);
const date      = getCurrentDate();
console.log(`Session: ${date} ${startTime} → ${endTime}`);

// one-to-one radio
await bp.getByRole('radio').first().check();

// channel
await bp.locator('#subject').click({ force: true });
await bp.locator('#react-select-2-input').fill('TestChannel1');
await bp.waitForTimeout(1000);
await bp.locator('#react-select-2-input').press('Enter');
await bp.waitForTimeout(1000);

// element
await bp.locator('#subcategory').click({ force: true });
await bp.locator('#react-select-3-input').fill('Element 1');
await bp.waitForTimeout(1000);
await bp.locator('#react-select-3-input').press('Enter');
await bp.waitForTimeout(1000);

// date
await bp.getByRole('textbox', { name: 'Select Date' }).click();
await bp.getByRole('textbox', { name: 'Select Date' }).fill(date);
await bp.getByRole('textbox', { name: 'Select Date' }).press('Enter');
await bp.waitForTimeout(500);

// start time
await fillReactSelect(bp, bp.locator('#react-select-4-input'), startTime);

// end time
await fillReactSelect(bp, bp.locator('#react-select-5-input'), endTime);

// team member
await fillReactSelect(bp, bp.locator('#react-select-6-input'), TEAM_MEMBER);

// create
await bp.getByRole('button', { name: 'Create' }).last().click();
await bp.waitForLoadState('domcontentloaded');
await bp.waitForTimeout(3000);
console.log('Session created. URL:', bp.url());

// ─── navigate to Sessions via sidebar ────────────────────────────────────────
await bp.getByRole('link', { name: 'Sessions' }).waitFor({ state: 'visible', timeout: 15000 });
await bp.getByRole('link', { name: 'Sessions' }).click();
await bp.waitForLoadState('domcontentloaded');
await bp.waitForTimeout(2000);
console.log('On Sessions page. URL:', bp.url());

// ─── click the session row to go to appointment page ─────────────────────────
// The session row has the time we just created — click anything that looks like the session
const sessionRow = bp.getByRole('row').filter({ hasText: startTime }).first();
const rowVisible = await sessionRow.isVisible({ timeout: 5000 }).catch(() => false);
if (rowVisible) {
  await sessionRow.click();
  await bp.waitForLoadState('domcontentloaded');
  await bp.waitForTimeout(2000);
  console.log('Clicked session row. URL:', bp.url());
}

// Poll for Join button
let joined = false;
for (let i = 0; i < 30; i++) {
  const btn = bp.getByRole('button', { name: /^(Join|In Call)$/i }).first();
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Join button found — clicking...');
    await btn.click({ force: true });
    joined = true;
    break;
  }
  console.log(`Attempt ${i+1}: no Join button yet, waiting 10s...`);
  await bp.waitForTimeout(10000);
  await bp.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await bp.getByRole('link', { name: 'Sessions' }).click().catch(() => {});
  await bp.waitForLoadState('domcontentloaded').catch(() => {});
}
if (!joined) {
  console.log('Could not find Join button. Keeping browser open...');
  await bp.waitForTimeout(300_000);
  await browser.close();
  process.exit(1);
}

// ─── wait for meeting UI ──────────────────────────────────────────────────────
console.log('Waiting for meeting to load (up to 3 min)...');
const loadingText = bp.getByText('Your call is getting initiated');
// Wait for loading to appear then disappear
await loadingText.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
// Wait up to 3 minutes for loading to go away
let loadingGone = false;
for (let i = 0; i < 18; i++) {
  const stillVisible = await loadingText.isVisible().catch(() => false);
  if (!stillVisible) { loadingGone = true; break; }
  console.log(`  Still loading... (${(i+1)*10}s)`);
  await bp.waitForTimeout(10000);
  // refresh every 60s if still stuck
  if ((i+1) % 6 === 0) {
    console.log('  Refreshing page...');
    await bp.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await bp.waitForTimeout(3000);
  }
}
if (!loadingGone) console.log('Loading screen still showing after 3 min.');

await bp.getByText('Recording on').waitFor({ state: 'visible', timeout: 30000 }).catch(() => {
  console.log('Recording indicator not found.');
});
// extra wait to let all UI elements render
await bp.waitForTimeout(3000);
console.log('In meeting! Taking screenshot...');

// ─── screenshot ───────────────────────────────────────────────────────────────
fs.mkdirSync(path.join(rootDir, 'reports'), { recursive: true });
await bp.screenshot({ path: path.join(rootDir, 'reports/inspect-meeting-toolbar.png'), fullPage: false });
console.log('Screenshot saved: reports/inspect-meeting-toolbar.png');

// ─── dump ALL buttons with full outerHTML ─────────────────────────────────────
console.log('\n═══ ALL BUTTONS (with innerHTML) ═══');
const allBtns = await bp.locator('button').all();
for (let i = 0; i < allBtns.length; i++) {
  const cls     = (await allBtns[i].getAttribute('class').catch(() => '')) || '';
  const text    = ((await allBtns[i].textContent().catch(() => '')) || '').trim().substring(0, 60);
  const visible = await allBtns[i].isVisible().catch(() => false);
  const inner   = await allBtns[i].innerHTML().catch(() => '');
  console.log(`[${i}] vis=${visible} | text="${text}" | cls="${cls.substring(0,120)}"`);
  console.log(`      innerHTML: ${inner.substring(0, 300)}`);
}

// ─── top-right mic button area ────────────────────────────────────────────────
console.log('\n═══ TOP RIGHT MIC BUTTON ═══');
const topRightBtn = bp.locator('div').filter({ hasText: '' }).locator('button').last();
const topHtml = await topRightBtn.evaluate(e => e.outerHTML).catch(() => '');
console.log(topHtml.substring(0, 500));

// Find any green-coloured element (mic active indicator)
console.log('\n═══ GREEN / ACTIVE ELEMENTS ═══');
for (const sel of ['[class*="green"]', '[class*="active"]', '[class*="OT_"]', '[style*="green"]']) {
  const n = await bp.locator(sel).count();
  if (n > 0) {
    console.log(`\n${sel} — ${n} matches:`);
    for (let i = 0; i < Math.min(n, 5); i++) {
      const html = await bp.locator(sel).nth(i).evaluate(e => e.outerHTML).catch(() => '');
      console.log(`  [${i}]: ${html.substring(0, 400)}`);
    }
  }
}

console.log('\nBrowser open for 3 min — use F12 to inspect further.');
await bp.waitForTimeout(180_000);
await browser.close();

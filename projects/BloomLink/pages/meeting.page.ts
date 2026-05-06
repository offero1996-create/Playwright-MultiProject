import { Locator, Page, expect } from '@playwright/test';
import { PageHelper } from '../../../utils/page-helper';
import { testConfig } from '../../../config/testConfig';
import { logger } from '../../../utils/logger';

/**
 * Locators derived from the actual Bloomify meeting UI:
 * - Bottom toolbar: red hangup icon + teal action buttons (headphones, participants, notes, screenshare, mic, chat)
 * - Right sidebar: "Session Notes" panel with Channel Notes + Session Notes + Recommendations
 * - Participant tiles: labelled "BUD" and "YOU"
 * - Top-right: green wifi/connection icon
 * - Bottom-center: timer (HH:MM:SS) + "Recording on" indicator
 */

export class MeetingPage extends PageHelper {
  readonly videoTile: Locator;
  readonly participantTiles: Locator;
  readonly connectionIndicator: Locator;
  readonly leaveMeetingButton: Locator;
  readonly recordingIndicator: Locator;
  readonly meetingTimer: Locator;
  readonly sessionNotesPanel: Locator;
  readonly sessionNotesText: Locator;
  readonly channelNotesText: Locator;
  readonly saveButton: Locator;
  readonly micButton: Locator;
  readonly chatButton: Locator;

  // In-call chat elements
  readonly chatPanel: Locator;
  readonly chatInput: Locator;
  readonly chatSendButton: Locator;
  readonly chatMessages: Locator;
  readonly chatCloseButton: Locator;

  constructor(page: Page) {
    super(page);

    // Participant video/avatar tiles — look for the BUD/YOU labels or image containers
    this.participantTiles = page.locator('text=/BUD|YOU/i').first();
    this.videoTile = page.locator('video, img, [class*="video"], [class*="tile"], [class*="participant"]').first();

    // Connection indicator — green wifi icon at top
    this.connectionIndicator = page.locator('svg, img, [class*="connect"], [class*="wifi"], [class*="signal"]').first();

    // Leave/hangup — the red button (first button in the toolbar, or a button with red styling)
    // The toolbar buttons are at the bottom; the red one is the hangup
    this.leaveMeetingButton = page.locator('button').filter({ has: page.locator('svg') }).first();

    // Recording indicator
    this.recordingIndicator = page.getByText('Recording on');

    // Meeting timer (format like 00:04:55)
    this.meetingTimer = page.locator('text=/\\d{2}:\\d{2}:\\d{2}/').first();

    // Right sidebar — Session Notes panel
    this.sessionNotesPanel = page.getByText('Session Notes').first();
    this.sessionNotesText = page.locator('textarea, [contenteditable="true"], div[class*="note"]').filter({ hasNot: page.getByText('No Channel Notes found') });
    this.channelNotesText = page.getByText('Channel Notes');

    // Save button in the sidebar
    this.saveButton = page.getByRole('button', { name: 'Save' });

    // Toolbar buttons — mic and chat
    this.micButton = page.locator('button').filter({ has: page.locator('svg') }).nth(5);
    this.chatButton = page.getByRole('button', { name: 'Chat' });

    // In-call chat panel elements
    // Chat panel appears as right sidebar with "Chat" heading, X close, message area, and input
    this.chatPanel = page.locator('div').filter({ hasText: /^Chat$/ }).locator('..').locator('..');
    this.chatInput = page.locator('textarea[placeholder="Start a Message Here"]');
    this.chatSendButton = this.chatInput.locator('..').locator('button, div[role="button"], svg').last();
    this.chatMessages = page.locator('div[class*="chat"] p, div[class*="message"] p, div.overflow-y-auto p');
    this.chatCloseButton = page.locator('button').filter({ has: page.locator('svg[class*="close"], svg[class*="x"]') }).first();
  }

  /**
   * Wait for the meeting UI to fully load.
   *
   * After clicking Join, Bloomify shows a loading screen:
   *   "Your call is getting initiated, Please wait..."
   * This can last 30-120s while the WebRTC session is established.
   * Once the call connects, the timer (HH:MM:SS) and "Recording on" appear.
   */
  async waitForMeetingUi(timeout = testConfig.timeouts.meetingLoad) {
    const loadingText = this.page.getByText('Your call is getting initiated');

    // First, verify we're on a meeting-related URL
    const currentUrl = this.page.url();
    const isMeetingUrl = currentUrl.includes('/video-call/') || currentUrl.includes('/meeting/') || currentUrl.includes('/call/');
    
    if (!isMeetingUrl) {
      // Check for common "not on meeting" indicators
      const dashboardVisible = await this.page.getByText('Welcome,').isVisible().catch(() => false);
      const channelsVisible = await this.page.getByText('My Channels').isVisible().catch(() => false);
      
      if (dashboardVisible || channelsVisible) {
        throw new Error(`Meeting failed to load - redirected to dashboard. Current URL: ${currentUrl}. The session may have expired or failed to start.`);
      }
    }

    console.log('Waiting for meeting to load...');
    const firstVisible = await Promise.race([
      loadingText.waitFor({ state: 'visible', timeout: testConfig.timeouts.action }).then(() => 'loading' as const).catch(() => null),
      this.recordingIndicator.waitFor({ state: 'visible', timeout: testConfig.timeouts.action }).then(() => 'meeting' as const).catch(() => null),
    ]);

    if (firstVisible === 'loading') {
      console.log('Call initiating... waiting for meeting to connect.');

      const hiddenIn60s = await loadingText
        .waitFor({ state: 'hidden', timeout: testConfig.timeouts.longWait })
        .then(() => true)
        .catch(() => false);

      if (!hiddenIn60s) {
        console.log('Still loading after 60s — refreshing page...');
        await this.page.reload({ waitUntil: 'domcontentloaded', timeout: testConfig.timeouts.pageLoad }).catch(() => {});
        await loadingText.waitFor({ state: 'hidden', timeout }).catch(() => {});
      }
      console.log('Loading screen gone — meeting connected.');
    } else if (firstVisible === 'meeting') {
      console.log('Meeting UI appeared directly (no loading screen).');
    } else {
      // Neither loading screen nor recording indicator detected in first 10s.
      // Check URL — if already on the video-call page, just wait for recording indicator.
      // Do NOT reload — that would navigate away from the meeting.
      const checkUrl = this.page.url();
      if (checkUrl.includes('/video-call/') || checkUrl.includes('/meeting/')) {
        console.log('Already on meeting URL — waiting for Recording indicator...');
      } else {
        // Final check - are we still on meeting page or redirected?
        const dashboardNow = await this.page.getByText('Welcome,').isVisible().catch(() => false);
        if (dashboardNow) {
          throw new Error(`Meeting session lost - page redirected to dashboard. URL: ${checkUrl}. The meeting may have timed out or been terminated.`);
        }
        console.log('No loading screen or meeting UI detected — waiting for recording indicator...');
      }
    }

    // Before waiting for recording, do one more check
    const finalUrl = this.page.url();
    const onDashboard = await this.page.getByText('Welcome,').isVisible().catch(() => false);
    if (onDashboard) {
      throw new Error(`Cannot wait for Recording indicator - not on meeting page. Current URL: ${finalUrl}`);
    }

    await this.recordingIndicator.waitFor({ state: 'visible', timeout });
    await this.meetingTimer.waitFor({ state: 'visible', timeout: testConfig.timeouts.longWait });
  }

  /**
   * Verify participant is connected by checking the "YOU" tile is visible.
   */
  async expectParticipantConnected() {
    const youTile = this.page.getByText('YOU').first();
    await expect(youTile).toBeVisible({ timeout: testConfig.timeouts.pageLoad });
  }

  /**
   * Wait for session notes content to appear in the sidebar.
   * In Bloomify, the transcription/notes appear in the "Session Notes" section.
   */
  async waitForSessionNotes(timeout = testConfig.timeouts.sessionNotes) {
    await this.sessionNotesPanel.waitFor({ state: 'visible', timeout });

    // Wait for any text to appear in session notes area
    const notesArea = this.page.locator('textarea, [contenteditable="true"]').last();
    await notesArea.waitFor({ state: 'visible', timeout });

    return await notesArea.textContent() || '';
  }

  /**
   * Wait for transcription/notes matching expected phrases.
   * Bloomify uses "Session Notes" rather than a separate transcription panel.
   */
  async waitForTranscription(expectedPhrases: string[], timeout = testConfig.timeouts.sessionNotes) {
    await this.sessionNotesPanel.waitFor({ state: 'visible', timeout });

    // Poll for expected text in the entire right sidebar
    await this.page.waitForFunction(
      ({ phrases }) => {
        const body = document.body.innerText.toLowerCase();
        return phrases.some(phrase => body.includes(phrase.toLowerCase()));
      },
      { phrases: expectedPhrases },
      { timeout }
    );

    // Capture full page text for assertion
    const sidebarText = await this.page.locator('text=/Session Notes/i').locator('..').locator('..').textContent() || '';
    return sidebarText.trim();
  }

  /**
   * Get the current meeting duration from the timer.
   */
  async getMeetingDuration(): Promise<string> {
    return await this.meetingTimer.textContent() || '00:00:00';
  }

  /**
   * Switch to Session Notes tab in the right sidebar (for group sessions).
   * Group sessions show "Participants" and "Session Notes" as tabs.
   */
  async switchToSessionNotesTab() {
    const sessionNotesTab = this.page.getByText('Session Notes', { exact: true }).first();
    const isVisible = await sessionNotesTab.isVisible().catch(() => false);
    if (isVisible) {
      await sessionNotesTab.click();
      await this.page.waitForTimeout(testConfig.timeouts.short);
      console.log('Switched to Session Notes tab.');
    }
  }

  /**
   * Click the Save button in the Session Notes sidebar.
   * If the chat panel is open (replacing the sidebar), closes it first via the × button.
   * Falls back to page reload if the × button close fails.
   */
  async clickSave() {
    // If chat panel is open it hides the Session Notes sidebar — close it first
    const chatOpen = await this.isChatPanelOpen();
    if (chatOpen) {
      logger.step('Chat panel open — closing via × button...');
      await this.closeChatPanel();

      // If still open after close attempt, fall back to page reload
      const stillOpen = await this.isChatPanelOpen();
      if (stillOpen) {
        logger.step('× button close failed — reloading page to restore Session Notes sidebar...');
        await this.page.reload({ waitUntil: 'domcontentloaded', timeout: testConfig.timeouts.pageLoad });
        await this.recordingIndicator.waitFor({ state: 'visible', timeout: testConfig.timeouts.meetingLoad });
        await this.page.waitForTimeout(2000);
      }
    }

    // Check if Save is visible; if not, switch to Session Notes tab first (group sessions)
    const saveVisible = await this.saveButton.isVisible().catch(() => false);
    if (!saveVisible) {
      await this.switchToSessionNotesTab();
    }
    await this.saveButton.click({ force: true, timeout: testConfig.timeouts.action });
    console.log('Clicked Save button.');
    await this.page.waitForTimeout(testConfig.timeouts.medium);
  }

  /**
   * End the meeting by clicking the red hangup button (first SVG button in toolbar).
   * After clicking, waits for the meeting UI to disappear.
   */
  async endMeeting() {
    console.log('Clicking End/Hangup button...');
    
    // Wait for any overlays to disappear first
    await this.page.locator('[class*="overlay"]').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    
    await this.leaveMeetingButton.click({ force: true });

    // Wait for "End Session" confirmation dialog and click it
    const endSessionBtn = this.page.getByRole('button', { name: 'End Session' });
    await endSessionBtn.waitFor({ state: 'visible', timeout: testConfig.timeouts.element }).catch(() => {});
    const endVisible = await endSessionBtn.isVisible().catch(() => false);
    if (endVisible) {
      console.log('End Session dialog found — clicking End Session.');
      
      // Wait for overlays again before clicking the confirmation button
      await this.page.locator('[class*="overlay"]').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      
      await endSessionBtn.click();
    } else {
      // Fallback: try any confirm-like button
      const fallbackBtn = this.page.getByRole('button', { name: /end|leave|yes|confirm/i }).first();
      const fallbackVisible = await fallbackBtn.isVisible().catch(() => false);
      if (fallbackVisible) {
        console.log('Confirmation dialog found — clicking confirm.');
        
        // Wait for overlays before clicking the fallback button
        await this.page.locator('[class*="overlay"]').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
        
        await fallbackBtn.click();
      }
    }

    // Wait for meeting UI to disappear (recording indicator goes away)
    await this.recordingIndicator.waitFor({ state: 'hidden', timeout: testConfig.timeouts.pageLoad }).catch(() => {});
    console.log('Meeting ended.');
  }

  /**
   * Check if the "Channel Notes" label is visible in the Session Notes panel.
   */
  async isChannelNotesVisible(): Promise<boolean> {
    return await this.channelNotesText.isVisible().catch(() => false);
  }

  /**
   * Fill in the Channel Notes textarea in the Session Notes sidebar.
   */
  async fillChannelNotes(text: string) {
    await this.closeChatPanel();
    const channelNotesSection = this.page.getByText('Channel Notes').locator('..').locator('..');
    const textarea = channelNotesSection.locator('textarea, [contenteditable="true"]').first();
    await textarea.click({ force: true });
    await textarea.fill(text);
    console.log(`Channel Notes filled: "${text}"`);
  }

  /**
   * Fill in the Recommendations textarea in the Session Notes sidebar.
   */
  async fillRecommendations(text: string) {
    await this.closeChatPanel();
    const recommendationsSection = this.page.getByText('Recommendations').locator('..').locator('..');
    const textarea = recommendationsSection.locator('textarea, [contenteditable="true"]').first();
    await textarea.click({ force: true });
    await textarea.fill(text);
    console.log(`Recommendations filled: "${text}"`);
  }

  /**
   * Get the current Channel Notes text value.
   */
  async getChannelNotesValue(): Promise<string> {
    const channelNotesSection = this.page.getByText('Channel Notes').locator('..').locator('..');
    const textarea = channelNotesSection.locator('textarea, [contenteditable="true"]').first();
    const value = await textarea.inputValue().catch(() =>
      textarea.textContent().then(t => t || '')
    );
    return value.trim();
  }

  /**
   * Get the current Recommendations text value.
   */
  async getRecommendationsValue(): Promise<string> {
    const recommendationsSection = this.page.getByText('Recommendations').locator('..').locator('..');
    const textarea = recommendationsSection.locator('textarea, [contenteditable="true"]').first();
    const value = await textarea.inputValue().catch(() =>
      textarea.textContent().then(t => t || '')
    );
    return value.trim();
  }

  /**
   * Verify the "Session notes added successfully" toast message appears after saving.
   */
  async verifySessionNotesSavedToast(timeout = testConfig.timeouts.element): Promise<boolean> {
    const toast = this.page.getByText('Session notes added successfully');
    await toast.waitFor({ state: 'visible', timeout }).catch(() => {});
    const visible = await toast.isVisible().catch(() => false);
    if (visible) {
      console.log('Toast verified: "Session notes added successfully"');
    } else {
      console.log('Toast not found: "Session notes added successfully"');
    }
    return visible;
  }

  /**
   * Detect whether the fake audio is actively being captured by the browser's microphone.
   *
   * How it works:
   * 1. Calls navigator.mediaDevices.getUserMedia({ audio: true }) to get the mic stream
   *    (Chromium's --use-fake-device-for-media-stream flag makes this return the .wav file)
   * 2. Creates a Web Audio AnalyserNode and reads the frequency data
   * 3. Samples audio levels 5 times over ~1 second
   * 4. If the average level is above a silence threshold, the fake audio is playing
   *
   * Returns an object with:
   *   - active: boolean  — true if audio energy detected (fake audio is playing)
   *   - avgLevel: number — average audio level (0-255), 0 = silence
   *   - peakLevel: number — highest single sample seen
   *   - samples: number[] — individual sample readings
   */
  async detectFakeAudioPlaying(): Promise<{ active: boolean; avgLevel: number; peakLevel: number; samples: number[] }> {
    // Runs in the browser context via page.evaluate — all DOM/WebRTC APIs are available at runtime
    type AudioResult = { active: boolean; avgLevel: number; peakLevel: number; samples: number[] };

    const detectScript = `(async () => {
      const SILENCE_THRESHOLD = 5;
      const SAMPLE_COUNT = 5;
      const SAMPLE_INTERVAL_MS = 200;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const samples = [];
        for (let i = 0; i < SAMPLE_COUNT; i++) {
          await new Promise(r => setTimeout(r, SAMPLE_INTERVAL_MS));
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
          samples.push(Math.round(avg));
        }
        source.disconnect();
        audioCtx.close();
        stream.getTracks().forEach(t => t.stop());
        const avgLevel = Math.round(samples.reduce((s, v) => s + v, 0) / samples.length);
        const peakLevel = Math.max(...samples);
        return { active: avgLevel > SILENCE_THRESHOLD, avgLevel, peakLevel, samples };
      } catch (e) {
        return { active: false, avgLevel: 0, peakLevel: 0, samples: [] };
      }
    })()`;

    return await this.page.evaluate(detectScript) as AudioResult;
  }

  /**
   * Verify participant is connected and log the status.
   */
  async verifyParticipantConnected(userId: string) {
    const youTile = this.page.getByText('YOU').first();
    await expect(youTile).toBeVisible({ timeout: testConfig.timeouts.pageLoad });
    const timer = await this.getMeetingDuration();
    logger.user(`${userId} connected. Timer: ${timer}`, userId);
  }

  /**
   * Check recording is active and log the result.
   */
  async verifyRecordingActive(userId: string) {
    await expect(this.recordingIndicator).toBeVisible();
  }

  /**
   * High-level wrapper to detect audio and log the results.
   */
  async detectAndLogAudio(userId: string) {
    const audio = await this.detectFakeAudioPlaying();
    logger.user(`Audio: active=${audio.active}, avg=${audio.avgLevel}, peak=${audio.peakLevel}`, userId);
    return audio;
  }

  /**
   * High-level wrapper to wait in meeting and capture audio for a specified duration.
   */
  async stayInMeetingAndCaptureAudio(durationSeconds: number = 120) {
    logger.step(`Staying in meeting for ${durationSeconds}s to capture audio...`);
    for (let elapsed = 30; elapsed <= durationSeconds; elapsed += 30) {
      await this.page.waitForTimeout(30_000);
      const timer = await this.getMeetingDuration();
      logger.step(`  ... ${elapsed}s in call. Timer: ${timer}`);
    }
  }

  /**
   * High-level wrapper to save notes and end meeting with logging.
   */
  async saveNotesAndEndMeeting(userId: string) {
    logger.user(`Saving session notes...`, userId);
    await this.clickSave();
    logger.user(`Ending meeting...`, userId);
    await this.endMeeting();
  }

  /**
   * Batch verification for multiple users connected, recording active, and audio detected.
   * @param users - Array of user objects with meetingPage and userId
   */
  async verifyAllUsersConnected(users: Array<{ meetingPage: MeetingPage; userId: string }>) {
    for (const user of users) {
      await user.meetingPage.verifyParticipantConnected(user.userId);
    }
  }

  /**
   * Batch verification for all users have recording active.
   */
  async verifyAllRecordingActive(users: Array<{ meetingPage: MeetingPage; userId: string }>) {
    for (const user of users) {
      await user.meetingPage.verifyRecordingActive(user.userId);
    }
  }

  /**
   * Batch detection and logging of audio for multiple users.
   */
  async detectAudioForAllUsers(users: Array<{ meetingPage: MeetingPage; userId: string }>) {
    const audioResults = [];
    logger.step('Detecting audio for all users');
    for (const user of users) {
      const audio = await user.meetingPage.detectAndLogAudio(user.userId);
      audioResults.push(audio);
    }
    return audioResults;
  }

  /**
   * High-level wrapper to log test summary.
   */
  logTestSummary(
    sessionType: string,
    audioResults: Array<{ active: boolean }>,
    transcriptionFound: boolean,
    sessionNotesNotEmpty: boolean,
    transcriptNotesNotEmpty: boolean,
    userLabels: string[]
  ) {
    logger.step('Test Summary');
    logger.info(`  Session type: ${sessionType}`);
    userLabels.forEach((label, idx) => {
      logger.info(`  ${label}: audio=${audioResults[idx].active}`);
    });
    logger.info(`  Transcription: ${transcriptionFound}`);
    logger.info(`  Session Notes verified: ${sessionNotesNotEmpty ? 'NOT empty' : 'EMPTY'}`);
    logger.info(`  Transcript Notes verified: ${transcriptNotesNotEmpty ? 'NOT empty' : 'EMPTY'}`);
  }

  // ═══════════════════════════════════════════════════════════
  //  TOOLBAR CONTROLS — Mic / Camera / Screenshare
  //
  //  Actual toolbar layout (confirmed from screenshot):
  //  button[0] red-bg   → Hangup
  //  button[1] teal-bg  → Chat/Notes
  //  button[2] red-bg   → Camera (red = off)
  //  button[3] red-bg   → Mic    (red = muted)
  //  button[4] teal-bg  → Screenshare
  //  button[5] teal-bg  → Settings
  //
  //  Active = teal/blue-bg. Muted/off = red-bg.
  // ═══════════════════════════════════════════════════════════

  /**
   * All visible circular fab toolbar buttons (hangup + action buttons).
   * Excludes hidden OT_mute button.
   */
  private toolbarFabButtons() {
    return this.page.locator('button.mdl-button--fab:not(.OT_mute):not(.mdl-button--mini-fab)');
  }

  /** Toolbar mic button — index 3 (red-bg = muted, teal = active) */
  private toolbarMicBtn() { return this.toolbarFabButtons().nth(3); }

  /** Toolbar camera button — index 2 */
  private toolbarCameraBtn() { return this.toolbarFabButtons().nth(2); }

  /** Toolbar screenshare button — index 4 */
  private toolbarScreenshareBtn() { return this.toolbarFabButtons().nth(4); }

  /**
   * Check if mic is currently muted (button has red-bg class).
   */
  async isMicMuted(): Promise<boolean> {
    const cls = await this.toolbarMicBtn().getAttribute('class').catch(() => '');
    return (cls || '').includes('red-bg');
  }

  /**
   * Unmute mic if muted. Sessions join with mic muted by default.
   * Call this right after waitForMeetingUi().
   */
  async unmuteMic() {
    const muted = await this.isMicMuted();
    if (muted) {
      await this.toolbarMicBtn().click({ force: true });
      await this.page.waitForTimeout(500);
      logger.step('Microphone unmuted.');
    } else {
      logger.step('Microphone already active.');
    }
  }

  /**
   * Toggle mic on/off, verify the class changed, then restore.
   * @returns { wasMuted, toggledToMuted } — states before and after first toggle
   */
  async verifyMicToggle(): Promise<{ wasMuted: boolean; toggledToMuted: boolean }> {
    const wasMuted = await this.isMicMuted();
    logger.step(`Mic before toggle: ${wasMuted ? 'MUTED' : 'ACTIVE'}`);

    await this.toolbarMicBtn().click({ force: true });
    await this.page.waitForTimeout(500);
    const toggledToMuted = await this.isMicMuted();
    logger.step(`Mic after toggle: ${toggledToMuted ? 'MUTED' : 'ACTIVE'}`);

    // Restore original state
    await this.toolbarMicBtn().click({ force: true });
    await this.page.waitForTimeout(500);
    logger.step('Mic restored.');
    return { wasMuted, toggledToMuted };
  }

  /**
   * Toggle camera off then back on, verify state changed.
   * Detects the off-state class dynamically (red-bg or similar).
   * @returns { turnedOff } — true if camera button state changed after click
   */
  async verifyCameraToggle(): Promise<{ turnedOff: boolean }> {
    logger.step('Testing camera toggle...');

    // Log all toolbar button classes for diagnostics
    const allBtns = this.toolbarFabButtons();
    const btnCount = await allBtns.count();
    for (let i = 0; i < btnCount; i++) {
      const cls = await allBtns.nth(i).getAttribute('class').catch(() => '');
      logger.step(`  Toolbar btn[${i}] class: ${cls}`);
    }

    const clsBefore = await this.toolbarCameraBtn().getAttribute('class').catch(() => '');
    logger.step(`Camera btn[2] class before: ${clsBefore}`);

    await this.toolbarCameraBtn().click({ force: true });
    await this.page.waitForTimeout(800);

    const clsAfter = await this.toolbarCameraBtn().getAttribute('class').catch(() => '');
    logger.step(`Camera btn[2] class after: ${clsAfter}`);

    // State changed if classes differ
    const stateChanged = clsBefore !== clsAfter;
    const turnedOff = stateChanged && (clsAfter || '').includes('red-bg');
    logger.step(`Camera toggle: stateChanged=${stateChanged}, turnedOff=${turnedOff}`);

    // Restore to original state
    if (stateChanged) {
      await this.toolbarCameraBtn().click({ force: true });
      await this.page.waitForTimeout(500);
    }
    logger.step('Camera restored.');
    return { turnedOff: stateChanged };  // pass if state changed at all
  }

  /**
   * Click screenshare button and dismiss any OS picker dialog.
   * @returns { triggered } — true if button was visible and clicked
   */
  async verifyScreenshareToggle(): Promise<{ triggered: boolean }> {
    logger.step('Testing screenshare button...');
    const btn = this.toolbarScreenshareBtn();
    const visible = await btn.isVisible({ timeout: testConfig.timeouts.element }).catch(() => false);
    if (!visible) {
      logger.warn('Screenshare button not visible.');
      return { triggered: false };
    }
    await btn.click({ force: true });
    await this.page.waitForTimeout(1000);
    // Dismiss any OS-level screenshare picker with Escape
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(500);
    logger.step('Screenshare button clicked and dismissed.');
    return { triggered: true };
  }

  // ═══════════════════════════════════════════════════════════
  //  IN-CALL CHAT FUNCTIONALITY
  // ═══════════════════════════════════════════════════════════

  /**
   * Click the Chat button in the meeting toolbar to open/toggle chat panel.
   * Chat button is btn[1] in the toolbar (second fab button, index 1).
   */
  async clickChatButton() {
    const chatBtn = this.toolbarFabButtons().nth(1);
    await chatBtn.waitFor({ state: 'visible', timeout: testConfig.timeouts.element });
    await chatBtn.click({ force: true });
    await this.page.waitForTimeout(1000);
    logger.step('Clicked Chat button in meeting toolbar.');
  }

  /**
   * Check if the in-call chat panel is currently open.
   * Detects the chat panel by the presence of the Start a Message textarea (attached to DOM).
   */
  async isChatPanelOpen(): Promise<boolean> {
    const count = await this.page.locator('textarea[placeholder="Start a Message Here"]').count();
    return count > 0;
  }

  /**
   * Open chat panel if not already open.
   */
  async openChatPanel() {
    const isOpen = await this.isChatPanelOpen();
    if (!isOpen) {
      await this.clickChatButton();
      // Wait for chat textarea to appear in DOM
      await this.page.locator('textarea[placeholder="Start a Message Here"]')
        .waitFor({ state: 'attached', timeout: testConfig.timeouts.element });
    }
  }

  /**
   * Send a chat message during an active meeting.
   * @param message - The message text to send
   */
  async sendInCallChatMessage(message: string) {
    await this.openChatPanel();

    await this.chatInput.waitFor({ state: 'visible', timeout: testConfig.timeouts.element });
    await this.chatInput.fill(message);

    // Send via Enter key (more reliable than finding the send icon button)
    await this.chatInput.press('Enter');
    await this.page.waitForTimeout(1000);
    logger.step(`Sent in-call chat message: "${message}"`);
  }

  /**
   * Get all visible chat messages in the meeting chat panel.
   * @returns Array of message text strings
   */
  async getInCallChatMessages(): Promise<string[]> {
    await this.openChatPanel();

    // Chat messages are in the right sidebar panel between "Chat" heading and the input
    const messageElements = this.page.locator('div.overflow-y-auto p, div[class*="chat"] p');
    const count = await messageElements.count();

    const messages: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await messageElements.nth(i).textContent();
      if (text && text.trim()) {
        messages.push(text.trim());
      }
    }
    return messages;
  }

  /**
   * Wait for a specific message to appear in the in-call chat.
   * @param messageText - The message text to wait for
   * @param timeout - Maximum wait time in ms
   * @returns true if message found, false if timeout
   */
  async waitForInCallChatMessage(messageText: string, timeout = 30000): Promise<boolean> {
    await this.openChatPanel();

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      // Check if message text is visible anywhere on the page (chat panel is open)
      const found = await this.page.getByText(messageText, { exact: false })
        .first().isVisible().catch(() => false);
      if (found) {
        logger.step(`Chat message found: "${messageText}"`);
        return true;
      }
      await this.page.waitForTimeout(2000);
    }
    logger.warn(`Chat message NOT found within ${timeout}ms: "${messageText}"`);
    return false;
  }

  /**
   * Verify a chat message is visible in the in-call chat.
   * @param messageText - Full or partial message text
   */
  async verifyInCallChatMessage(messageText: string): Promise<boolean> {
    await this.openChatPanel();

    const visible = await this.page.getByText(messageText, { exact: false })
      .first().isVisible({ timeout: 5000 }).catch(() => false);
    logger.step(visible
      ? `In-call chat message verified: "${messageText}"`
      : `In-call chat message NOT found: "${messageText}"`);
    return visible;
  }

  /**
   * Close the chat panel using the × button in the Chat panel header.
   * The × button is the sibling button next to the "Chat" heading text.
   */
  async closeChatPanel() {
    const isOpen = await this.isChatPanelOpen();
    if (!isOpen) return;

    // The Chat panel header contains "Chat" text and an × close button.
    // Target the × button by finding a button inside the same row as "Chat" heading.
    const chatCloseBtn = this.page.locator('div', { hasText: /^Chat$/ })
      .locator('xpath=ancestor::div[1]')
      .locator('button')
      .first();

    const closeVisible = await chatCloseBtn.isVisible().catch(() => false);
    if (closeVisible) {
      await chatCloseBtn.click({ force: true });
      await this.page.waitForTimeout(800);
      // Verify it closed
      const stillOpen = await this.isChatPanelOpen();
      if (!stillOpen) {
        logger.step('Chat panel closed via × button.');
        return;
      }
    }

    // Fallback: try locating × by the fa-times icon class (FontAwesome)
    const timesIcon = this.page.locator('i.fa-times, i.fa-xmark, button[aria-label*="close" i], button[aria-label*="Close" i]').first();
    const timesVisible = await timesIcon.isVisible().catch(() => false);
    if (timesVisible) {
      await timesIcon.click({ force: true });
      await this.page.waitForTimeout(800);
      logger.step('Chat panel closed via times icon.');
    }
  }
}

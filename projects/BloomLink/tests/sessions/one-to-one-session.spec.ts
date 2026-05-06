import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

import { CreateSessionPage } from '../../pages/create-session.page';
import { MeetingPage } from '../../pages/meeting.page';
import { SessionsPage } from '../../pages/sessions.page';
import { users } from '../../test-data/users';
import { urls } from '../../test-data/urls';
import { loginAndGoToSessions } from '../../utils/navigation-helper';
import { launchUserAndJoin, getSessionTestOptions, closeUserSession } from '../../utils/session-helper';
import { assertVisible, assertChecked, assertNotChecked, assertHasValue, assertTruthy } from '../../../../utils/assertions/ui';
import { assertRedirectedToAppointment } from '../../../../utils/assertions/navigation';
import { assertAudioActive, assertMicToggled, assertCameraToggled, assertScreenshareTriggered, assertInCallChatReceived } from '../../../../utils/assertions/meeting';
import { assertSessionNotesPanel, assertNoteSectionNotEmpty, assertNoteSectionContent } from '../../../../utils/assertions/notes';
import { assertSessionNotesSavedToast } from '../../../../utils/assertions/toast';
import { assertSessionNotesValid } from '../../../../utils/assertions/session-notes';
import { logger } from '../../../../utils/logger';

const audioFixturePath = path.resolve(process.cwd(), urls.audioFixturePath);
const uploadFilePath = path.resolve(process.cwd(), 'projects/BloomLink/test-data/Message PDF/MessageData1.pdf');

const user1 = users.owner;
const user2 = users.teamMember;

const audioFixtureMissing = !fs.existsSync(audioFixturePath);
const uploadFileMissing = !fs.existsSync(uploadFilePath);

test.use(getSessionTestOptions());

test.describe('BloomLink - One-to-One Session', () => {
  test.setTimeout(600_000);

  test.skip(audioFixtureMissing, `Audio fixture missing at ${audioFixturePath}`);

  test('One-to-One session: full validation (form, join, audio, toolbar, chat, notes, transcription)', async ({ page, context }) => {

    /* ══════════════════════════════════════════════════════════════
       USER 1 — Login, cleanup, navigate to Create Session
       ══════════════════════════════════════════════════════════════ */
    const user1BloomLink = await loginAndGoToSessions(page, context, user1.email, user1.password, 'User1');
    logger.user(`BloomLink URL after login: ${user1BloomLink.url()}`, 'User1');
    const sessionsPage1 = new SessionsPage(user1BloomLink);
    await sessionsPage1.cleanupStaleSessions('User1');

    await sessionsPage1.navigateViaSidebar();
    await sessionsPage1.clickCreateSessionViaMouse();

    const createSessionPage = new CreateSessionPage(user1BloomLink);
    await assertVisible(createSessionPage.pageHeading, 'Create Session heading', { timeout: 30000 });

    /* ══════════════════════════════════════════════════════════════
       FORM VALIDATION — Verify all form elements and defaults
       ══════════════════════════════════════════════════════════════ */
    await test.step('Verify Create Session form elements and defaults', async () => {
      await assertVisible(createSessionPage.oneToOneRadio, 'One-to-One radio button');
      await assertVisible(createSessionPage.groupSessionRadio, 'Group Session radio button');
      await assertVisible(createSessionPage.createButton, 'Create button');
      await assertVisible(createSessionPage.cancelButton, 'Cancel button');
      await assertVisible(createSessionPage.requiredFieldsText, 'Required fields text');
      await assertChecked(createSessionPage.oneToOneRadio, 'One-to-One radio (default selected)');
      await assertNotChecked(createSessionPage.groupSessionRadio, 'Group Session radio (default unchecked)');

      // Verify date input accepts a value
      const currentDate = createSessionPage.getCurrentDate();
      await createSessionPage.selectDate(currentDate);
      await assertHasValue(createSessionPage.dateInput, currentDate, 'Date input');
      logger.step('Create Session form elements verified.');
    });

    /* ══════════════════════════════════════════════════════════════
       CREATE SESSION — With summary and file upload
       ══════════════════════════════════════════════════════════════ */
    const sessionTimeInfo = await createSessionPage.createOneToOneSessionWithDefaults(
      user2.displayName!,
      'User1',
      'Automated test - verifying notes, upload, and transcription',
      uploadFileMissing ? undefined : uploadFilePath
    );

    await user1BloomLink.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    await sessionsPage1.waitFor(3000);
    assertRedirectedToAppointment(user1BloomLink);

    /* ══════════════════════════════════════════════════════════════
       USER 1 — Wait for join window and join
       ══════════════════════════════════════════════════════════════ */
    const meetingPage1 = new MeetingPage(user1BloomLink);

    const user1Joined = await sessionsPage1.waitForJoinWindowAndJoinSession(sessionTimeInfo.startTime, 'User1');
    assertTruthy(user1Joined, 'User1 should find Join button');

    await meetingPage1.waitForMeetingUi();
    await meetingPage1.unmuteMic();
    logger.user('In meeting. Waiting for User2...', 'User1');

    /* ══════════════════════════════════════════════════════════════
       USER 2 — Launch second browser, login & join
       ══════════════════════════════════════════════════════════════ */
    const user2Session = await launchUserAndJoin(user2.email, user2.password, 'User2');

    try {
      const { meetingPage: meetingPage2 } = user2Session;

      /* ══════════════════════════════════════════════════════════════
         BOTH USERS IN CALL — Connected, recording, audio
         ══════════════════════════════════════════════════════════════ */
      const allUsers = [
        { meetingPage: meetingPage1, userId: 'User1' },
        { meetingPage: meetingPage2, userId: 'User2' },
      ];

      await test.step('Verify both users connected and recording active', async () => {
        await meetingPage1.verifyAllUsersConnected(allUsers);
        await meetingPage1.verifyAllRecordingActive(allUsers);
        logger.step('Both users connected and recording verified.');
      });

      const audioResults = await test.step('Detect fake audio for both users', async () => {
        const results = await meetingPage1.detectAudioForAllUsers(allUsers);
        assertAudioActive(results);
        return results;
      });

      /* ══════════════════════════════════════════════════════════════
         SESSION NOTES PANEL — Visible, Channel Notes label present
         ══════════════════════════════════════════════════════════════ */
      await test.step('Verify Session Notes panel is visible', async () => {
        await assertSessionNotesPanel(meetingPage1.sessionNotesPanel);
        assertTruthy(await meetingPage1.isChannelNotesVisible(), 'Channel Notes label visible');
        logger.step('Session Notes panel verified.');
      });

      /* ══════════════════════════════════════════════════════════════
         TOOLBAR CONTROLS — Mic / Camera / Screenshare
         (done before chat so Session Notes sidebar stays visible)
         ══════════════════════════════════════════════════════════════ */
      await test.step('Validate toolbar controls: mic toggle', async () => {
        const micResult = await meetingPage1.verifyMicToggle();
        assertMicToggled(micResult.wasMuted, micResult.toggledToMuted, 'User1');
      });

      await test.step('Validate toolbar controls: camera toggle', async () => {
        const cameraResult = await meetingPage1.verifyCameraToggle();
        assertCameraToggled(cameraResult.turnedOff, 'User1');
      });

      await test.step('Validate toolbar controls: screenshare button', async () => {
        const screenshareResult = await meetingPage1.verifyScreenshareToggle();
        assertScreenshareTriggered(screenshareResult.triggered, 'User1');
      });

      /* ══════════════════════════════════════════════════════════════
         CHANNEL NOTES & RECOMMENDATIONS — Fill, save, update, verify
         (must happen BEFORE in-call chat — chat panel replaces sidebar)
         ══════════════════════════════════════════════════════════════ */
      await test.step('Fill Channel Notes and Recommendations, save, verify toast', async () => {
        const initialChannelNotes = 'Initial channel notes - first entry';
        const initialRecommendations = 'Initial recommendation - first entry';

        await meetingPage1.fillChannelNotes(initialChannelNotes);
        await meetingPage1.fillRecommendations(initialRecommendations);
        await meetingPage1.clickSave();
        await assertSessionNotesSavedToast(user1BloomLink, { timeout: 15000 });

        await user1BloomLink.waitForTimeout(3000);
        logger.step('Initial notes saved successfully.');
      });

      await test.step('Update Channel Notes and Recommendations, save, verify updated values', async () => {
        const updatedChannelNotes = 'Updated channel notes - modified during live call';
        const updatedRecommendations = 'Updated recommendation - revised during live session';

        await meetingPage1.fillChannelNotes(updatedChannelNotes);
        await meetingPage1.fillRecommendations(updatedRecommendations);
        await meetingPage1.clickSave();
        await assertSessionNotesSavedToast(user1BloomLink, { timeout: 15000 });

        await user1BloomLink.waitForTimeout(3000);

        const currentChannelNotes = await meetingPage1.getChannelNotesValue();
        const currentRecommendations = await meetingPage1.getRecommendationsValue();
        assertNoteSectionContent(currentChannelNotes, updatedChannelNotes, 'Channel Notes');
        assertNoteSectionContent(currentRecommendations, updatedRecommendations, 'Recommendations');
        logger.step('Updated notes verified successfully.');
      });

      /* ══════════════════════════════════════════════════════════════
         IN-CALL CHAT — User1 sends, User2 receives and replies
         (after notes — chat panel replaces sidebar, that's fine now)
         ══════════════════════════════════════════════════════════════ */
      await test.step('In-call chat: User1 sends → User2 receives', async () => {
        const message = `Hello from User1 - ${Date.now()}`;
        await meetingPage1.sendInCallChatMessage(message);
        const received = await meetingPage2.waitForInCallChatMessage(message, 15000);
        assertInCallChatReceived(received, message, 'User2');
      });

      await test.step('In-call chat: User2 replies → User1 receives (bidirectional)', async () => {
        const reply = `Reply from User2 - ${Date.now()}`;
        await meetingPage2.sendInCallChatMessage(reply);
        const received = await meetingPage1.waitForInCallChatMessage(reply, 15000);
        assertInCallChatReceived(received, reply, 'User1');
      });

      /* ══════════════════════════════════════════════════════════════
         STAY IN MEETING — Capture ~2 minutes of audio
         ══════════════════════════════════════════════════════════════ */
      await meetingPage1.stayInMeetingAndCaptureAudio(120);

      /* ══════════════════════════════════════════════════════════════
         SAVE NOTES & END MEETING
         ══════════════════════════════════════════════════════════════ */
      logger.step('Saving notes and ending meeting');
      await meetingPage1.saveNotesAndEndMeeting('User1');

      logger.step('Closing User2 browser');
      await closeUserSession(user2Session, 'User2');

      /* ══════════════════════════════════════════════════════════════
         POST-MEETING — Navigate back and check transcription
         ══════════════════════════════════════════════════════════════ */
      await sessionsPage1.navigateAndFindCompletedSession('User1');

      const transcriptionResult = await sessionsPage1.waitForTranscription(300, 10);
      sessionsPage1.logTranscriptionResult(transcriptionResult);

      /* ══════════════════════════════════════════════════════════════
         VERIFICATION — Session Notes & Transcript Notes must not be empty
         ══════════════════════════════════════════════════════════════ */
      let notesVerification: Awaited<ReturnType<typeof sessionsPage1.verifyAllNotesNotEmpty>>;
      await test.step('Verify Session Notes and Transcript Notes are not empty', async () => {
        notesVerification = await sessionsPage1.verifyAllNotesNotEmpty('User1');
        assertNoteSectionNotEmpty(notesVerification.sessionNotesEmpty, 'Session Notes');
        assertNoteSectionNotEmpty(notesVerification.transcriptEmpty, 'Transcript Notes');
        assertTruthy(transcriptionResult.found, 'Transcription content detected during polling');
        assertSessionNotesValid(notesVerification.sessionNotesContent || transcriptionResult.text);
      });

      /* ══════════════════════════════════════════════════════════════
         LOG TEST SUMMARY
         ══════════════════════════════════════════════════════════════ */
      meetingPage1.logTestSummary(
        '1:1',
        audioResults,
        transcriptionResult.found,
        !notesVerification!.sessionNotesEmpty,
        !notesVerification!.transcriptEmpty,
        ['User1 (offero)', 'User2 (alphyas)']
      );

    } finally {
      await user2Session.browser.close().catch(() => {});
    }
  });
});

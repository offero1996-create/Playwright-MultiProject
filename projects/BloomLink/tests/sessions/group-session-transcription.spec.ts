import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

import { CreateSessionPage } from '../../pages/create-session.page';
import { MeetingPage } from '../../pages/meeting.page';
import { SessionsPage } from '../../pages/sessions.page';
import { users } from '../../test-data/users';
import { urls } from '../../test-data/urls';
import { loginAndGoToSessions } from '../../utils/navigation-helper';
import { launchUserAndJoin, getSessionTestOptions, closeUserSession, closeUserSessions } from '../../utils/session-helper';
import { assertVisible, assertTruthy } from '../../../../utils/assertions/ui';
import { assertRedirectedToAppointment } from '../../../../utils/assertions/navigation';
import { assertAudioActive, assertMicToggled, assertCameraToggled, assertScreenshareTriggered, assertInCallChatReceived } from '../../../../utils/assertions/meeting';
import { assertSessionNotesPanel, assertNoteSectionNotEmpty, assertNoteSectionContent } from '../../../../utils/assertions/notes';
import { assertSessionNotesSavedToast } from '../../../../utils/assertions/toast';
import { assertSessionNotesValid } from '../../../../utils/assertions/session-notes';
import { logger } from '../../../../utils/logger';

const audioFixturePath = path.resolve(process.cwd(), urls.audioFixturePath);
const audioFixtureMissing = !fs.existsSync(audioFixturePath);

test.use(getSessionTestOptions());

test.describe('BloomLink - Group Session', () => {
  test.setTimeout(600_000);

  test.skip(audioFixtureMissing, `Audio fixture missing at ${audioFixturePath}`);

  test('Group session (3 users): full validation (join, audio, toolbar, chat, notes, transcription)', async ({ page, context }) => {
    const user1 = users.owner;
    const user2 = users.teamMember;
    const user3 = users.admin;

    /* ══════════════════════════════════════════════════════════════
       USER 1 — Login, cleanup, create GROUP session, join
       ══════════════════════════════════════════════════════════════ */
    const user1BloomLink = await loginAndGoToSessions(page, context, user1.email, user1.password, 'User1');
    logger.user(`BloomLink URL after login: ${user1BloomLink.url()}`, 'User1');
    const sessionsPage1 = new SessionsPage(user1BloomLink);
    await sessionsPage1.cleanupStaleSessions('User1');

    await sessionsPage1.navigateViaSidebar();
    await sessionsPage1.clickCreateSessionViaMouse();

    const createSessionPage = new CreateSessionPage(user1BloomLink);
    await assertVisible(createSessionPage.pageHeading, 'Create Session heading', { timeout: 30000 });

    const sessionTimeInfo = await createSessionPage.createGroupSessionWithDefaults(
      [user2.displayName!, user3.displayName!], 'User1'
    );

    await user1BloomLink.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    await sessionsPage1.waitFor(3000);
    assertRedirectedToAppointment(user1BloomLink);

    const meetingPage1 = new MeetingPage(user1BloomLink);

    const user1Joined = await sessionsPage1.waitForJoinWindowAndJoinSession(sessionTimeInfo.startTime, 'User1');
    assertTruthy(user1Joined, 'User1 should find Join button');

    await meetingPage1.waitForMeetingUi();
    await meetingPage1.unmuteMic();
    logger.user('In group meeting. Waiting for User2 and User3...', 'User1');

    /* ══════════════════════════════════════════════════════════════
       USER 2 & USER 3 — Launch browsers, login & join
       ══════════════════════════════════════════════════════════════ */
    const user2Session = await launchUserAndJoin(user2.email, user2.password, 'User2');
    const user3Session = await launchUserAndJoin(user3.email, user3.password, 'User3');

    try {
      const allUsers = [
        { meetingPage: meetingPage1, userId: 'User1' },
        { meetingPage: user2Session.meetingPage, userId: 'User2' },
        { meetingPage: user3Session.meetingPage, userId: 'User3' },
      ];

      /* ══════════════════════════════════════════════════════════════
         ALL 3 USERS IN CALL — Connected, recording, audio
         ══════════════════════════════════════════════════════════════ */
      await test.step('Verify all 3 users connected and recording active', async () => {
        await meetingPage1.verifyAllUsersConnected(allUsers);
        await meetingPage1.verifyAllRecordingActive(allUsers);
        logger.step('All 3 users connected and recording verified.');
      });

      const audioResults = await test.step('Detect fake audio for all users', async () => {
        const results = await meetingPage1.detectAudioForAllUsers(allUsers);
        assertAudioActive(results);
        return results;
      });

      /* ══════════════════════════════════════════════════════════════
         SESSION NOTES PANEL — Group has tab, switch to it
         ══════════════════════════════════════════════════════════════ */
      await test.step('Verify Session Notes panel/tab is visible', async () => {
        await assertSessionNotesPanel(meetingPage1.sessionNotesPanel);
        await meetingPage1.switchToSessionNotesTab();
        logger.step('Session Notes tab switched and verified.');
      });

      /* ══════════════════════════════════════════════════════════════
         TOOLBAR CONTROLS — Mic / Camera / Screenshare
         (before chat so Session Notes sidebar stays visible)
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
        await meetingPage1.switchToSessionNotesTab();
        const initialChannelNotes = 'Initial channel notes - group session first entry';
        const initialRecommendations = 'Initial recommendation - group session first entry';

        await meetingPage1.fillChannelNotes(initialChannelNotes);
        await meetingPage1.fillRecommendations(initialRecommendations);
        await meetingPage1.clickSave();
        await assertSessionNotesSavedToast(user1BloomLink, { timeout: 15000 });

        await user1BloomLink.waitForTimeout(3000);
        logger.step('Initial group notes saved successfully.');
      });

      await test.step('Update Channel Notes and Recommendations, save, verify updated values', async () => {
        const updatedChannelNotes = 'Updated channel notes - group session modified during call';
        const updatedRecommendations = 'Updated recommendation - group session revised during call';

        await meetingPage1.fillChannelNotes(updatedChannelNotes);
        await meetingPage1.fillRecommendations(updatedRecommendations);
        await meetingPage1.clickSave();
        await assertSessionNotesSavedToast(user1BloomLink, { timeout: 15000 });

        await user1BloomLink.waitForTimeout(3000);

        const currentChannelNotes = await meetingPage1.getChannelNotesValue();
        const currentRecommendations = await meetingPage1.getRecommendationsValue();
        assertNoteSectionContent(currentChannelNotes, updatedChannelNotes, 'Channel Notes');
        assertNoteSectionContent(currentRecommendations, updatedRecommendations, 'Recommendations');
        logger.step('Updated group notes verified successfully.');
      });

      /* ══════════════════════════════════════════════════════════════
         IN-CALL CHAT — All 3 users exchange messages
         (after notes — chat panel replaces sidebar, that's fine now)
         ══════════════════════════════════════════════════════════════ */
      await test.step('In-call chat: User1 sends → User2 and User3 receive', async () => {
        const message = `Hello group from User1 - ${Date.now()}`;
        await meetingPage1.sendInCallChatMessage(message);
        const [u2Received, u3Received] = await Promise.all([
          user2Session.meetingPage.waitForInCallChatMessage(message, 15000),
          user3Session.meetingPage.waitForInCallChatMessage(message, 15000),
        ]);
        assertInCallChatReceived(u2Received, message, 'User2');
        assertInCallChatReceived(u3Received, message, 'User3');
      });

      await test.step('In-call chat: User2 sends → User1 and User3 receive', async () => {
        const message = `Reply from User2 - ${Date.now()}`;
        await user2Session.meetingPage.sendInCallChatMessage(message);
        const [u1Received, u3Received] = await Promise.all([
          meetingPage1.waitForInCallChatMessage(message, 15000),
          user3Session.meetingPage.waitForInCallChatMessage(message, 15000),
        ]);
        assertInCallChatReceived(u1Received, message, 'User1');
        assertInCallChatReceived(u3Received, message, 'User3');
      });

      await test.step('In-call chat: User3 sends → User1 and User2 receive', async () => {
        const message = `Message from User3 - ${Date.now()}`;
        await user3Session.meetingPage.sendInCallChatMessage(message);
        const [u1Received, u2Received] = await Promise.all([
          meetingPage1.waitForInCallChatMessage(message, 15000),
          user2Session.meetingPage.waitForInCallChatMessage(message, 15000),
        ]);
        assertInCallChatReceived(u1Received, message, 'User1');
        assertInCallChatReceived(u2Received, message, 'User2');
      });

      /* ══════════════════════════════════════════════════════════════
         STAY IN MEETING — Capture ~2 minutes of audio
         ══════════════════════════════════════════════════════════════ */
      await meetingPage1.stayInMeetingAndCaptureAudio(120);

      /* ══════════════════════════════════════════════════════════════
         SAVE NOTES & END MEETING
         ══════════════════════════════════════════════════════════════ */
      logger.step('Saving notes and ending group meeting');
      await meetingPage1.saveNotesAndEndMeeting('User1');

      logger.step('Closing User2 and User3 browsers');
      await closeUserSession(user2Session, 'User2');
      await closeUserSession(user3Session, 'User3');

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
        'GROUP',
        audioResults,
        transcriptionResult.found,
        !notesVerification!.sessionNotesEmpty,
        !notesVerification!.transcriptEmpty,
        ['User1 (offero)', 'User2 (alphyas)', 'User3 (OfferoAdmin)']
      );

    } finally {
      await closeUserSessions([user2Session, user3Session], ['User2', 'User3']);
    }
  });
});

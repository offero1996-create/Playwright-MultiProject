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
import { assertVisible, assertTruthy } from '../../../../utils/assertions/ui';
import { assertRedirectedToAppointment } from '../../../../utils/assertions/navigation';
import { assertSessionNotesSavedToast } from '../../../../utils/assertions/toast';
import { assertAudioActive } from '../../../../utils/assertions/meeting';
import { assertSessionNotesPanel, assertNoteSectionContent } from '../../../../utils/assertions/notes';
import { assertSessionNotesValid } from '../../../../utils/assertions/session-notes';
import { logger } from '../../../../utils/logger';

const audioFixturePath = path.resolve(process.cwd(), urls.audioFixturePath);
const uploadFilePath = path.resolve(process.cwd(), 'projects/BloomLink/test-data/Message PDF/MessageData1.pdf');

const user1 = users.owner;
const user3 = users.admin;

const audioFixtureMissing = !fs.existsSync(audioFixturePath);
const uploadFileMissing = !fs.existsSync(uploadFilePath);

test.use(getSessionTestOptions());

test.describe('BloomLink - Session with Summary, File Upload, Notes & Transcription', () => {
  test.setTimeout(600_000);

  test.skip(audioFixtureMissing, `Audio fixture missing at ${audioFixturePath}`);
  test.skip(uploadFileMissing, `Upload file missing at ${uploadFilePath}`);

  test('Two users join, conversation generates session notes, update channel notes & recommendations, verify changes', async ({ page, context }) => {

    /* ══════════════════════════════════════════════════════════════
       USER 1 (Owner) — Create session with summary + file upload
       ══════════════════════════════════════════════════════════════ */
    const user1BloomLink = await loginAndGoToSessions(page, context, user1.email, user1.password, 'User1');
    const sessionsPage = new SessionsPage(user1BloomLink);
    await sessionsPage.cleanupStaleSessions('User1');

    await sessionsPage.clickCreateSession();
    await sessionsPage.waitForSessionsToLoad();

    const createSessionPage = new CreateSessionPage(user1BloomLink);
    await assertVisible(createSessionPage.pageHeading, 'Create Session heading', { timeout: 10000 });

    const sessionTimeInfo = await createSessionPage.createOneToOneSessionWithDefaults(
      user3.displayName!,
      'User1',
      'Automated test - verifying notes update and transcription',
      uploadFilePath
    );

    await user1BloomLink.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    await sessionsPage.waitFor(3000);
    assertRedirectedToAppointment(user1BloomLink);

    /* ══════════════════════════════════════════════════════════════
       Wait for join window, navigate, and join
       ══════════════════════════════════════════════════════════════ */
    const meetingPage1 = new MeetingPage(user1BloomLink);

    const user1Joined = await sessionsPage.waitForJoinWindowAndJoinSession(sessionTimeInfo.startTime, 'User1');
    assertTruthy(user1Joined, 'User1 should find Join button');

    await meetingPage1.waitForMeetingUi();
    await meetingPage1.unmuteMic();
    logger.user('In meeting. Waiting for User3...', 'User1');

    /* ══════════════════════════════════════════════════════════════
       USER 3 (OfferoAdmin) — Launch second browser, join meeting
       ══════════════════════════════════════════════════════════════ */
    const user3Session = await launchUserAndJoin(user3.email, user3.password, 'User3');

    try {
      const { meetingPage: meetingPage3 } = user3Session;

      /* ══════════════════════════════════════════════════════════════
         BOTH USERS IN CALL — Verify connection
         ══════════════════════════════════════════════════════════════ */
      const allUsers = [
        { meetingPage: meetingPage1, userId: 'User1' },
        { meetingPage: meetingPage3, userId: 'User3' },
      ];

      logger.step('Verifying all users connected and recording');
      await meetingPage1.verifyAllUsersConnected(allUsers);
      await meetingPage1.verifyAllRecordingActive(allUsers);

      logger.step('Detecting audio for all users');
      const audioResults = await meetingPage1.detectAudioForAllUsers(allUsers);
      assertAudioActive(audioResults);

      /* ══════════════════════════════════════════════════════════════
         STAY IN CALL — 2 minutes for audio capture & session notes
         ══════════════════════════════════════════════════════════════ */
      await meetingPage1.stayInMeetingAndCaptureAudio(120);

      /* ══════════════════════════════════════════════════════════════
         USER 1 — Add initial Channel Notes & Recommendations, Save
         ══════════════════════════════════════════════════════════════ */
      await assertSessionNotesPanel(meetingPage1.sessionNotesPanel);

      const initialChannelNotes = 'Initial channel notes - first entry';
      const initialRecommendations = 'Initial recommendation - first entry';

      await meetingPage1.fillChannelNotes(initialChannelNotes);
      await meetingPage1.fillRecommendations(initialRecommendations);

      await meetingPage1.clickSave();
      await assertSessionNotesSavedToast(user1BloomLink, { timeout: 15000 });

      await user1BloomLink.waitForTimeout(3000);

      /* ══════════════════════════════════════════════════════════════
         USER 1 — Update Channel Notes & Recommendations with new values
         ══════════════════════════════════════════════════════════════ */
      const updatedChannelNotes = 'Updated channel notes - modified during live call';
      const updatedRecommendations = 'Updated recommendation - revised during live session';

      await meetingPage1.fillChannelNotes(updatedChannelNotes);
      await meetingPage1.fillRecommendations(updatedRecommendations);

      await meetingPage1.clickSave();
      await assertSessionNotesSavedToast(user1BloomLink, { timeout: 15000 });

      await user1BloomLink.waitForTimeout(3000);

      /* ══════════════════════════════════════════════════════════════
         VERIFY — Updated values are displayed correctly
         ══════════════════════════════════════════════════════════════ */
      const currentChannelNotes = await meetingPage1.getChannelNotesValue();
      const currentRecommendations = await meetingPage1.getRecommendationsValue();

      assertNoteSectionContent(currentChannelNotes, updatedChannelNotes, 'Channel Notes');
      assertNoteSectionContent(currentRecommendations, updatedRecommendations, 'Recommendations');

      /* ══════════════════════════════════════════════════════════════
         END MEETING
         ══════════════════════════════════════════════════════════════ */
      await meetingPage1.endMeeting();
      await closeUserSession(user3Session, 'User3');

      /* ══════════════════════════════════════════════════════════════
         POST-MEETING — Check Session Notes (AI-generated, not transcript)
         ══════════════════════════════════════════════════════════════ */
      await sessionsPage.navigateAndFindCompletedSession('User1');

      const sessionNotesResult = await sessionsPage.waitForSessionNotesGenerated(300, 10);
      sessionsPage.logTranscriptionResult(sessionNotesResult);

      /* ══════════════════════════════════════════════════════════════
         VERIFY SESSION NOTES — Structure & Themes (not exact text)
         ══════════════════════════════════════════════════════════════ */
      // Verify session notes were generated
      assertTruthy(
        sessionNotesResult.found,
        'AI-generated session notes should be present'
      );

      // Validate AI-generated session notes: structure (sections) + keyword themes
      assertSessionNotesValid(sessionNotesResult.text, {
        validateStructure: true,
        label: 'AI-Generated Session Notes',
      });

    } finally {
      await user3Session.browser.close().catch(() => {});
    }
  });
});

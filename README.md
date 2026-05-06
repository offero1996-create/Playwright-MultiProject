# Playwright Automation Framework - BloomLink & Bloomifai

A professional Playwright automation framework for testing BloomLink and Bloomifai applications.

## Folder Structure

```
BloomLinkPlayWright/
├── projects/                       # Project-specific tests and pages
│   ├── BloomLink/                  # BloomLink application
│   │   ├── fixtures/               # BloomLink test fixtures
│   │   ├── pages/                  # Page Object Models
│   │   │   ├── login.page.ts
│   │   │   ├── dashboard.page.ts
│   │   │   ├── bloomlink-home.page.ts
│   │   │   ├── sessions.page.ts
│   │   │   ├── create-session.page.ts
│   │   │   ├── meeting.page.ts
│   │   │   ├── messages.page.ts
│   │   │   └── index.ts
│   │   ├── test-data/              # Test data (users, URLs, audio files)
│   │   │   ├── users.ts            # User credentials (env var backed)
│   │   │   ├── urls.ts             # URLs and origins
│   │   │   └── audio/              # Fake audio fixture for meetings
│   │   ├── tests/                  # Test spec files
│   │   │   ├── BloomLink-Homepage/
│   │   │   │   └── bloomlink.spec.ts
│   │   │   ├── Message/
│   │   │   │   └── messages.spec.ts
│   │   │   └── sessions/
│   │   │       ├── create-session.spec.ts
│   │   │       ├── one-to-one-session.spec.ts
│   │   │       └── group-session-transcription.spec.ts
│   │   └── utils/                  # BloomLink-specific utilities
│   │       ├── navigation-helper.ts   # Login & navigation flows
│   │       └── session-helper.ts      # Multi-user session launcher
│   │
│   └── Bloomifai/                  # Bloomifai application
│       ├── fixtures/               # Bloomifai test fixtures
│       ├── pages/                  # Page Object Models
│       │   ├── login.page.ts
│       │   ├── dashboard.page.ts
│       │   └── index.ts
│       ├── test-data/              # Test data
│       └── tests/                  # Test spec files
│           └── bloomifai.spec.ts
│
├── config/                         # Shared configuration
│   └── testConfig.ts               # Test configuration (timeouts, settings)
│
├── utils/                          # Shared utilities
│   ├── page-helper.ts              # Base page class (extended by all pages)
│   ├── date-helper.ts              # Date/time utilities
│   └── logger.ts                   # Logging utility
│
├── scripts/                        # Helper scripts
│   └── generate-meeting-audio.mjs  # Audio file generator
│
├── playwright.config.ts            # Multi-project Playwright configuration
├── show-latest-report.js           # Opens the latest HTML report
├── tsconfig.json                   # TypeScript configuration
├── .eslintrc.json                  # ESLint configuration, to find static errors
├── .env                            # Environment variables
├── package.json                    # Dependencies and scripts
└── README.md
```

## Installation

```bash
npm install
npx playwright install
```

## Configuration

Configure test execution via `.env` file:

```env
# URLs
BASE_URL=https://app-corestage.platform.bloomifai.com/login

# User credentials (owner)
LOGIN_EMAIL=your-email@example.com
LOGIN_PASSWORD=your-password

# Team member credentials
TEAM_MEMBER_EMAIL=team-member@example.com
TEAM_MEMBER_PASSWORD=team-password

# Browser
HEADLESS=false    # true = headless, false = visible browser
```

Test data is centralized in `projects/<project>/test-data/` and reads from environment variables with fallback defaults.

## Running Tests

### By Project
```bash
# Run BloomLink tests (Chromium)
npm run test:bloomlink

# Run Bloomifai tests
npm run test:bloomifai

# Run all tests
npm test
```

### Specific Test Files
```bash
# Run a specific test file
npx playwright test projects/BloomLink/tests/Message/messages.spec.ts

# Run session tests only
npx playwright test projects/BloomLink/tests/sessions/
```

### Modes
```bash
# Headed mode (visible browser)
npx playwright test --headed

# Headless mode
HEADLESS=true npx playwright test

# Debug mode (step through)
npm run test:debug

# Playwright UI mode
npm run test:ui
```

## Test Reports

Reports are generated per run with IST timestamps at:

```
projects/<project>/reports/<timestamp>/
├── index.html          # Interactive HTML report
└── artifacts/          # Screenshots, videos, traces
```

```bash
npm run test:report    # Opens the latest HTML report
```

## Test Suites

### BloomLink Homepage (1 test)
| Test | Description |
|------|-------------|
| Navigate and verify homepage | Title, URL, welcome message, sidebar navigation |

### Messages (3 tests)
| Test | Description |
|------|-------------|
| Verify Messages page UI | Elements, filters (All/Not Read), search, right panel |
| Send messages and verify tick marks | Send 3 messages, verify outgoing alignment, tick SVG |
| Two-user read receipt | User1 sends, User2 reads, verify text match + blue tick |

### Sessions (4 tests)
| Test | Description |
|------|-------------|
| Verify Create Session form | Form elements, default radio, dropdowns, date/time |
| Create one-to-one session | Fill form and verify redirect to /appointment |
| One-to-one session with transcription | 2 users join, fake audio, save notes, verify transcription |
| Group session with transcription | 3 users join, fake audio, save notes, verify transcription |

### Bloomifai (1 test)
| Test | Description |
|------|-------------|
| Bloomifai application tests | Platform-level tests |

## Architecture

- **Page Object Model** - All pages extend `PageHelper` base class
- **Multi-project config** - Tests run across Chromium, Firefox, and WebKit
- **Shared utilities** - `navigation-helper.ts` and `session-helper.ts` for reusable flows
- **Data-driven** - Credentials via env vars, test data in dedicated files
- **Multi-user tests** - Launches separate browser instances for concurrent user simulation

## Page Objects

### BloomLink
| Page Object | Description |
|-------------|-------------|
| `LoginPage` | Login form actions |
| `DashboardPage` | Dashboard navigation, BloomLink launcher |
| `BloomLinkHomePage` | Home page verification |
| `SessionsPage` | Sessions list, join, completed sessions |
| `CreateSessionPage` | Session creation form (1:1 and group) |
| `MeetingPage` | In-call UI, recording, audio, session notes |
| `MessagesPage` | Chat, messaging, tick marks, read receipts |

### Bloomifai
| Page Object | Description |
|-------------|-------------|
| `LoginPage` | Login form actions |
| `DashboardPage` | Dashboard navigation |

## Generate Audio Fixture

For session transcription tests:

```bash
npm run generate:audio
```

Creates `projects/BloomLink/test-data/audio/conversation.wav` used by Chrome's `--use-file-for-fake-audio-capture` flag.

## Code Quality

```bash
npm run lint       # ESLint
npm run format     # Prettier
```

## Supported Browsers

| Browser | Project Name |
|---------|-------------|
| Chromium | `bloomlink-chromium` / `bloomifai-chromium` |
| Firefox | `bloomlink-firefox` / `bloomifai-firefox` |
| WebKit | `bloomlink-webkit` / `bloomifai-webkit` |

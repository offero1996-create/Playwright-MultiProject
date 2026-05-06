/**
 * BloomLink - Centralized test user credentials.
 * Values are read from environment variables with fallback defaults.
 */

export interface TestUser {
  email: string;
  password: string;
  displayName?: string;
}

export const users = {
  /** Session owner - creates sessions */
  owner: {
    email: process.env.LOGIN_EMAIL || 'offero.Bosco@concertidc.com',
    password: process.env.LOGIN_PASSWORD || 'Ccare@123',
    displayName: 'Offero Bosco',
  } as TestUser,

  /** Team member 2 - Alphyas */
  teamMember: {
    email: process.env.TEAM_MEMBER_EMAIL || 'alphyas.suriyan@concertidc.com',
    password: process.env.TEAM_MEMBER_PASSWORD || 'Ccare@123',
    displayName: 'Alphyas Suriyan J',
  } as TestUser,

  /** Team member 3 - OfferoAdmin */
  admin: {
    email: process.env.TEAM_MEMBER3_EMAIL || 'offero.bosco+admin@concertidc.com',
    password: process.env.TEAM_MEMBER3_PASSWORD || 'Ccare@123',
    displayName: 'OfferoAdmin',
  } as TestUser,

  /** Alternative test user */
  alternate: {
    email: process.env.ALT_LOGIN_EMAIL || 'offero.bosco+admin2@concertidc.com',
    password: process.env.ALT_LOGIN_PASSWORD || 'Ccare@123',
    displayName: 'OfferoAdmin2',
  } as TestUser,

  /** Ashwin - Message test user */
  ashwin: {
    email: process.env.ASHWIN_EMAIL || 'ashwin@concertidc.com',
    password: process.env.ASHWIN_PASSWORD || 'Ccare@123',
    displayName: 'Ashwin',
  } as TestUser,
};

export default users;

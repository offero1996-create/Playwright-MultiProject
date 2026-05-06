/**
 * Bloomifai - Centralized test user credentials.
 * Values are read from environment variables with fallback defaults.
 */

export interface TestUser {
  email: string;
  password: string;
  displayName?: string;
}

export const users = {
  /** Primary test user */
  primary: {
    email: process.env.LOGIN_EMAIL || 'offero.Bosco@concertidc.com',
    password: process.env.LOGIN_PASSWORD || 'Ccare@123',
    displayName: 'Offero Bosco',
  } as TestUser,

  /** Secondary test user */
  secondary: {
    email: process.env.ALT_LOGIN_EMAIL || 'alphyas.suriyan@concertidc.com',
    password: process.env.ALT_LOGIN_PASSWORD || 'Ccare@123',
    displayName: 'Alphyas Suriyan J',
  } as TestUser,

  /** Admin user */
  admin: {
    email: process.env.ADMIN_EMAIL || 'offero.bosco+admin@concertidc.com',
    password: process.env.ADMIN_PASSWORD || 'Ccare@123',
    displayName: 'OfferoAdmin',
  } as TestUser,
};

export default users;

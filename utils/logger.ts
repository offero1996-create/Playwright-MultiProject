export const logger = {
  info: (message: string) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
  },
  error: (message: string) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
  },
  warn: (message: string) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
  },
  debug: (message: string) => {
    console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`);
  },
  step: (message: string, user?: string) => {
    if (user) {
      console.log(`\n[${user}] ${message}`);
    } else {
      console.log(`\n${message}`);
    }
  },
  user: (message: string, user: string) => {
    console.log(`[${user}] ${message}`);
  },
};
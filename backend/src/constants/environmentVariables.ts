import dotenv from 'dotenv';
dotenv.config();

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;

  if (value === undefined) {
    throw Error(`Missing String environment variable for ${key}`);
  }

  return value;
}
/*
 * GENERAL ENVIROMENT VARIABLES
 */
export const NODE_ENV = getEnv('NODE_ENV', 'development');
export const PORT = getEnv('PORT', '3000');

/*
 * FIREBASE ENVIROMENT VARIABLES
 * In test mode (Vitest), use dummy values since tests use mock auth
 */
const isTestEnv = process.env.VITEST === 'true';

export const FIREBASE_TYPE = getEnv(
  'FIREBASE_TYPE',
  isTestEnv ? 'service_account' : undefined
);
export const FIREBASE_PROJECT_ID = getEnv(
  'FIREBASE_PROJECT_ID',
  isTestEnv ? 'test-project' : undefined
);
export const FIREBASE_PRIVATE_KEY_ID = getEnv(
  'FIREBASE_PRIVATE_KEY_ID',
  isTestEnv ? 'test-key-id' : undefined
);
export const FIREBASE_PRIVATE_KEY = (
  getEnv('FIREBASE_PRIVATE_KEY', isTestEnv ? 'test-key' : undefined) || ''
).replace(/\\n/g, '\n');
export const FIREBASE_CLIENT_EMAIL = getEnv(
  'FIREBASE_CLIENT_EMAIL',
  isTestEnv ? 'test@test.com' : undefined
);
export const FIREBASE_CLIENT_ID = getEnv(
  'FIREBASE_CLIENT_ID',
  isTestEnv ? 'test-client-id' : undefined
);
export const FIREBASE_AUTH_URI = getEnv(
  'FIREBASE_AUTH_URI',
  isTestEnv ? 'https://test.auth.uri' : undefined
);
export const FIREBASE_TOKEN_URI = getEnv(
  'FIREBASE_TOKEN_URI',
  isTestEnv ? 'https://test.token.uri' : undefined
);
export const FIREBASE_AUTH_PROVIDER_X509_CERT_URL = getEnv(
  'FIREBASE_AUTH_PROVIDER_X509_CERT_URL',
  isTestEnv ? 'https://test.cert.url' : undefined
);
export const FIREBASE_CLIENT_X509_CERT_URL = getEnv(
  'FIREBASE_CLIENT_X509_CERT_URL',
  isTestEnv ? 'https://test.client.cert.url' : undefined
);
export const FIREBASE_UNIVERSE_DOMAIN = getEnv(
  'FIREBASE_UNIVERSE_DOMAIN',
  isTestEnv ? 'googleapis.com' : undefined
);
export const FIREBASE_WEB_API_KEY = getEnv('FIREBASE_WEB_API_KEY', '');

/*
 * MONGODB ENVIROMENT VARIABLES
 */
export const MONGO_URI = getEnv('MONGO_URI');

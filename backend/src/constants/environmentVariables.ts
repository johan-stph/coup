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
 */
export const FIREBASE_TYPE = getEnv('FIREBASE_TYPE');
export const FIREBASE_PROJECT_ID = getEnv('FIREBASE_PROJECT_ID');
export const FIREBASE_PRIVATE_KEY_ID = getEnv('FIREBASE_PRIVATE_KEY_ID');
export const FIREBASE_PRIVATE_KEY = getEnv('FIREBASE_PRIVATE_KEY').replace(
  /\\n/g,
  '\n'
);
export const FIREBASE_CLIENT_EMAIL = getEnv('FIREBASE_CLIENT_EMAIL');
export const FIREBASE_CLIENT_ID = getEnv('FIREBASE_CLIENT_ID');
export const FIREBASE_AUTH_URI = getEnv('FIREBASE_AUTH_URI');
export const FIREBASE_TOKEN_URI = getEnv('FIREBASE_TOKEN_URI');
export const FIREBASE_AUTH_PROVIDER_X509_CERT_URL = getEnv(
  'FIREBASE_AUTH_PROVIDER_X509_CERT_URL'
);
export const FIREBASE_CLIENT_X509_CERT_URL = getEnv(
  'FIREBASE_CLIENT_X509_CERT_URL'
);
export const FIREBASE_UNIVERSE_DOMAIN = getEnv('FIREBASE_UNIVERSE_DOMAIN');
export const FIREBASE_WEB_API_KEY = getEnv('FIREBASE_WEB_API_KEY', '');

/*
 * MONGODB ENVIROMENT VARIABLES
 */
export const MONGO_URI = getEnv('MONGO_URI');

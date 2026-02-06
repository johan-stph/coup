import { auth } from '~/auth/firebase';
import { API_URL } from '~/config/environment';

/**
 * Fetch wrapper that automatically attaches the Firebase auth token
 * and prepends the API base URL.
 *
 * @param path - API path relative to API_URL (e.g. "/games", "/user/profile")
 * @param options - Standard RequestInit options
 */
export async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
}

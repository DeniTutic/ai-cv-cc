import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/** Thrown when we cannot obtain a token, so callers can trigger re-auth. */
export class AuthTokenError extends Error {
  constructor(cause) {
    super('Your session has expired. Please sign in again.');
    this.name = 'AuthTokenError';
    this.cause = cause;
  }
}

/**
 * One client per token-getter, memoised. Previously a fresh axios instance was
 * built on every mount and every action.
 */
const clientCache = new WeakMap();

export function createApiClient(getAccessToken, onAuthFailure) {
  const cached = clientCache.get(getAccessToken);
  if (cached) return cached;

  const client = axios.create({ baseURL: BASE_URL, timeout: 120000 });

  client.interceptors.request.use(async (config) => {
    // Fail loudly. Sending the request without an Authorization header just
    // produced a confusing generic error with no route back to sign-in.
    let token;
    try {
      token = await getAccessToken({
        authorizationParams: { audience: import.meta.env.VITE_AUTH0_AUDIENCE }
      });
    } catch (err) {
      onAuthFailure?.(err);
      throw new AuthTokenError(err);
    }

    config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        onAuthFailure?.(error);
      }
      return Promise.reject(error);
    }
  );

  clientCache.set(getAccessToken, client);
  return client;
}

/** Turn any API error into a message worth showing a user. */
export function apiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err instanceof AuthTokenError) return err.message;
  if (err.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (err.response?.data?.error) return err.response.data.error;
  if (!err.response) return 'Could not reach the server. Is the backend running?';
  return fallback;
}

export const cvApi = {
  upload: (client, formData, onUploadProgress) =>
    client.post('/api/cv/upload', formData, { onUploadProgress }),
  getHistory: (client) => client.get('/api/cv/history'),
  getOne: (client, id) => client.get(`/api/cv/${id}`),
  getStats: (client) => client.get('/api/cv/stats'),
  deleteOne: (client, id) => client.delete(`/api/cv/${id}`)
};

export const userApi = {
  getMe: (client) => client.get('/api/user/me')
};

/**
 * admin/api.js — HTTP client for the admin API.
 *
 * Token handling:
 *   - The access token lives in memory only. Closing or reloading the page drops it.
 *   - The refresh token lives in sessionStorage, so it survives a reload in the same
 *     tab and is gone when the tab closes.
 *   - A 401 triggers one refresh and a retry. If the refresh fails, the session ends.
 */

import axios from 'axios';

const API_ROOT = import.meta.env.VITE_API_URL || 'https://backend-2-e4i7.onrender.com';
const REFRESH_KEY = 'slipr_admin_refresh';

let accessToken = null;
let refreshing = null;

export const api = axios.create({
  baseURL: `${API_ROOT}/api/admin`,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        await refreshSession();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        clearSession();
        window.dispatchEvent(new Event('admin:signed-out'));
      }
    }
    return Promise.reject(error);
  },
);

export const setAccessToken = (token) => { accessToken = token; };
export const hasAccessToken = () => Boolean(accessToken);

export const getStoredRefresh = () => {
  try { return sessionStorage.getItem(REFRESH_KEY); } catch { return null; }
};

const storeRefresh = (token) => {
  try {
    if (token) sessionStorage.setItem(REFRESH_KEY, token);
    else sessionStorage.removeItem(REFRESH_KEY);
  } catch { /* storage blocked: the session just won't survive a reload */ }
};

/** Exchanges the stored refresh token for a new pair. Concurrent calls share one request. */
export const refreshSession = () => {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = getStoredRefresh();
      if (!refreshToken) throw new Error('No session');
      const { data } = await api.post('/auth/refresh', { refreshToken });
      setAccessToken(data.data.accessToken);
      storeRefresh(data.data.refreshToken);
    })().finally(() => { refreshing = null; });
  }
  return refreshing;
};

/** Stores the tokens from a successful sign-in. */
export const saveTokens = ({ accessToken: access, refreshToken }) => {
  setAccessToken(access);
  storeRefresh(refreshToken);
};

export const clearSession = () => {
  setAccessToken(null);
  storeRefresh(null);
};

/** Human-readable message from an API error. */
export const errorMessage = (err, fallback = 'Something went wrong') => {
  if (err?.response?.status === 429) return 'Too many requests — wait a few minutes and try again';
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.request) return 'Cannot reach the server. Check your connection.';
  return fallback;
};

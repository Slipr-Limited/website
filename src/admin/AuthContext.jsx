/**
 * admin/AuthContext.jsx — Admin session state.
 *   - Restores the session on load from the tab's refresh token.
 *   - Signs out after 15 minutes without input.
 *   - Signs out when the API reports the session has ended.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, getStoredRefresh, refreshSession, saveTokens } from './api';

const IDLE_LIMIT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

const AuthContext = createContext(null);

export const useAdminAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
};

export function AdminAuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [status, setStatus] = useState('loading'); // loading | signedOut | signedIn

  const signOutLocally = useCallback(() => {
    clearSession();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* the session is dropped locally either way */ }
    signOutLocally();
  }, [signOutLocally]);

  // Restore the session when the page loads.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getStoredRefresh()) { setStatus('signedOut'); return; }
      try {
        await refreshSession();
        const { data } = await api.get('/auth/me');
        if (!cancelled) { setUser(data.data.user); setStatus('signedIn'); }
      } catch {
        if (!cancelled) signOutLocally();
      }
    })();
    return () => { cancelled = true; };
  }, [signOutLocally]);

  // The API client reports a dead session here.
  useEffect(() => {
    const handler = () => signOutLocally();
    window.addEventListener('admin:signed-out', handler);
    return () => window.removeEventListener('admin:signed-out', handler);
  }, [signOutLocally]);

  // Idle timeout.
  useEffect(() => {
    if (status !== 'signedIn') return undefined;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { logout(); }, IDLE_LIMIT_MS);
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [status, logout]);

  const completeSignIn = useCallback((payload) => {
    saveTokens(payload);
    setUser(payload.user);
    setStatus('signedIn');
  }, []);

  const value = useMemo(() => ({
    user, status, logout, completeSignIn,
    role: user?.adminRole ?? null,
  }), [user, status, logout, completeSignIn]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

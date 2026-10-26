/**
 * admin/hooks.js — Data loading for admin pages.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api';

/**
 * Loads a GET endpoint whenever `params` changes.
 * Ignores responses that arrive after a newer request has started.
 * @returns {{ data, loading, error, reload }}
 */
export function useApi(url, params = {}, { enabled = true } = {}) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [tick, setTick]       = useState(0);
  const latest = useRef(0);
  const key = JSON.stringify(params);

  useEffect(() => {
    if (!enabled) return undefined;
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    api.get(url, { params: JSON.parse(key) })
      .then(({ data: body }) => { if (id === latest.current) setData(body.data); })
      .catch((err) => { if (id === latest.current) setError(errorMessage(err, 'Could not load this data')); })
      .finally(() => { if (id === latest.current) setLoading(false); });
    return undefined;
  }, [url, key, enabled, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}

/** Runs a write request and reports its result. */
export const useAction = () => {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn) => {
    setBusy(true);
    try {
      const res = await fn();
      return { ok: true, message: res?.data?.message ?? 'Done', data: res?.data?.data ?? null };
    } catch (err) {
      return { ok: false, message: errorMessage(err) };
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, run };
};

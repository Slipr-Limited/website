import React, { useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { useApi, useAction } from '../hooks';
import { ActionButton, Card, Notice, Spinner } from '../components/ui';

const toForm = (s) => ({
  platformFee: (s.platformFeeKobo ?? 0) / 100,
  minWithdrawal: (s.minWithdrawalKobo ?? 0) / 100,
  maxWithdrawalPerDay: (s.maxWithdrawalPerDayKobo ?? 0) / 100,
  escrowResolutionWindowHours: s.escrowResolutionWindowHours ?? 48,
  outcomeWindowMinutes: s.outcomeWindowMinutes ?? 90,
  maintenanceMode: Boolean(s.maintenanceMode),
  maintenanceMessage: s.maintenanceMessage ?? '',
});

const num = (v) => Number(v);

export default function SettingsPage() {
  const settings = useApi('/super/settings');
  const { busy, run } = useAction();
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState(null);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (settings.data?.settings) setForm(toForm(settings.data.settings));
  }, [settings.data]);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = async (e) => {
    e.preventDefault();
    setNotice(null);
    setError(null);
    const checks = [
      [num(form.platformFee) >= 0, 'Platform fee cannot be negative'],
      [num(form.minWithdrawal) >= 1000, 'Minimum withdrawal must be at least ₦1,000'],
      [num(form.maxWithdrawalPerDay) >= num(form.minWithdrawal), 'Daily withdrawal limit must be at least the minimum'],
      [num(form.escrowResolutionWindowHours) >= 1, 'Escrow window must be at least 1 hour'],
      [num(form.outcomeWindowMinutes) >= 0, 'Outcome window cannot be negative'],
    ];
    const failed = checks.find(([ok]) => !ok);
    if (failed) { setError(failed[1]); return; }

    const payload = {
      platformFeeKobo: Math.round(num(form.platformFee) * 100),
      minWithdrawalKobo: Math.round(num(form.minWithdrawal) * 100),
      maxWithdrawalPerDayKobo: Math.round(num(form.maxWithdrawalPerDay) * 100),
      escrowResolutionWindowHours: num(form.escrowResolutionWindowHours),
      outcomeWindowMinutes: num(form.outcomeWindowMinutes),
      maintenanceMode: form.maintenanceMode,
      maintenanceMessage: form.maintenanceMessage,
    };
    const result = await run(() => api.put('/super/settings', payload));
    if (result.ok) { setNotice('Settings saved'); settings.reload(); }
    else setError(result.message);
  };

  if (settings.loading && !form) return <div className="ad-center"><Spinner /></div>;
  if (settings.error) return <Notice kind="error">{settings.error}</Notice>;
  if (!form) return null;

  return (
    <div className="ad-stack-lg">
      <Card title="Platform settings">
        <form className="ad-stack" onSubmit={save}>
          <div className="ad-form-row">
            <label className="ad-field"><span>Platform fee (₦ per slip)</span>
              <input type="number" min="0" step="1" value={form.platformFee} onChange={set('platformFee')} /></label>
            <label className="ad-field"><span>Minimum withdrawal (₦)</span>
              <input type="number" min="1000" step="1" value={form.minWithdrawal} onChange={set('minWithdrawal')} /></label>
            <label className="ad-field"><span>Daily withdrawal limit (₦)</span>
              <input type="number" min="0" step="1" value={form.maxWithdrawalPerDay} onChange={set('maxWithdrawalPerDay')} /></label>
          </div>
          <div className="ad-form-row">
            <label className="ad-field"><span>Escrow resolution window (hours)</span>
              <input type="number" min="1" step="1" value={form.escrowResolutionWindowHours} onChange={set('escrowResolutionWindowHours')} /></label>
            <label className="ad-field"><span>Outcome window after kick-off (minutes)</span>
              <input type="number" min="0" step="1" value={form.outcomeWindowMinutes} onChange={set('outcomeWindowMinutes')} /></label>
          </div>
          <label className="ad-field ad-check">
            <input type="checkbox" checked={form.maintenanceMode} onChange={set('maintenanceMode')} />
            <span>Maintenance mode (blocks the apps for everyone except admins)</span>
          </label>
          <label className="ad-field"><span>Maintenance message</span>
            <textarea rows={2} value={form.maintenanceMessage} onChange={set('maintenanceMessage')} /></label>
          {error && <Notice kind="error" onClose={() => setError(null)}>{error}</Notice>}
          {notice && <Notice kind="info" onClose={() => setNotice(null)}>{notice}</Notice>}
          <div>
            <button type="submit" className="ad-btn ad-btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
          </div>
        </form>
      </Card>

      <Card title="Operations">
        <p className="ad-muted ad-small">Changes here affect live money movement. Each action is recorded in the audit log.</p>
        <div className="ad-form-row">
          <ActionButton tone="primary" dialog={{
            title: 'Run auto-resolve now?', confirmLabel: 'Run now',
            description: 'Checks every tracked slip with a finished match and settles it. Runs in the background.',
            onConfirm: () => runAction(() => api.post('/super/resolve-tracked')),
          }}>Run auto-resolve</ActionButton>
          <ActionButton dialog={{
            title: 'Recalculate a tipster\'s analytics?', confirmLabel: 'Recalculate',
            fields: [{ name: 'tipsterId', label: 'Tipster user ID', required: true }],
            onConfirm: (v) => runAction(() => api.post(`/super/analytics/recalc/${v.tipsterId.trim()}`)),
          }}>Recalculate tipster analytics</ActionButton>
        </div>
      </Card>
    </div>
  );
}

/** Wraps a write call so the dialog gets { ok, message } back. */
async function runAction(fn) {
  try {
    const res = await fn();
    return { ok: true, message: res.data?.message ?? 'Done' };
  } catch (err) {
    return { ok: false, message: errorMessage(err, 'Action failed') };
  }
}

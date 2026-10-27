import React, { useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks';
import { ActionButton, Badge, Card, DataTable, ExportButton, Notice, Pager, StatTile } from '../components/ui';
import { BarChart } from '../components/Chart';
import { fetchAllPages } from '../export';
import { formatDate, formatNumber, label } from '../format';

const EVENT_TYPES = [
  '', 'failed_admin_login', 'failed_login', 'rate_limit_exceeded',
  'unauthorized_access', 'blocked_ip_attempt', 'admin_action',
];
const WINDOWS = [
  { hours: 24, label: 'Last 24 hours' },
  { hours: 168, label: 'Last 7 days' },
  { hours: 720, label: 'Last 30 days' },
];

const IPV4_OR_V6 = /^[0-9a-fA-F:.]{3,45}$/;

export default function SecurityPage() {
  const [hours, setHours]   = useState(24);
  const [type, setType]     = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [ipQuery, setIpQuery]   = useState('');
  const [page, setPage]     = useState(1);

  const health  = useApi('/security/health');
  const summary = useApi('/security/summary', { hours });
  const events  = useApi('/security/events', { page, limit: 25, type, ip: ipQuery });
  const blocked = useApi('/security/blocked-ips');

  const counts = summary.data?.counts ?? {};

  const submitIp = (e) => {
    e.preventDefault();
    const v = ipFilter.trim();
    if (v && !IPV4_OR_V6.test(v)) return;
    setPage(1);
    setIpQuery(v);
  };

  return (
    <div className="ad-stack-lg">
      <Card title="Overview" actions={
        <label className="ad-field">
          <span className="ad-sr">Window</span>
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {WINDOWS.map((w) => <option key={w.hours} value={w.hours}>{w.label}</option>)}
          </select>
        </label>
      }>
        {summary.error && <Notice kind="error">{summary.error}</Notice>}
        {summary.data && (
          <div className="ad-grid" data-cols="3">
            <StatTile label="Security events" value={formatNumber(summary.data.totalEvents)} />
            <StatTile label="Failed admin sign-ins" value={formatNumber(counts.failed_admin_login)} />
            <StatTile label="Failed user sign-ins" value={formatNumber(counts.failed_login)} />
            <StatTile label="Rate limits hit" value={formatNumber(counts.rate_limit_exceeded)} />
            <StatTile label="Unauthorised requests" value={formatNumber(counts.unauthorized_access)} />
            <StatTile label="Blocked IPs" value={formatNumber(summary.data.blockedIPCount)} />
          </div>
        )}
        {summary.data && (
          <BarChart
            label={`Security events by type, ${WINDOWS.find((w) => w.hours === hours)?.label.toLowerCase()}`}
            format={formatNumber}
            data={Object.entries(counts).map(([t, c]) => ({ label: label(t), value: c }))}
          />
        )}
        {health.data && (
          <p className="ad-muted ad-small">
            Server up {Math.round((health.data.uptimeSeconds ?? 0) / 60)} min · database {label(health.data.mongoStatus)} · cache {label(health.data.redisStatus)}
          </p>
        )}
      </Card>

      <div className="ad-grid ad-grid--two">
        <Card title="Top IP addresses">
          <div className="ad-row-end">
            <ExportButton
              filename="top-ips"
              load={async () => summary.data?.topIPs ?? []}
              columns={[
                { header: 'IP', value: (r) => r.ip },
                { header: 'Events', value: (r) => r.count },
                { header: 'Types', value: (r) => (r.types ?? []).join('; ') },
              ]}
            />
          </div>
          <DataTable
            rows={summary.data?.topIPs}
            rowKey="ip"
            emptyText="No activity in this window"
            columns={[
              { key: 'ip', header: 'IP' },
              { key: 'count', header: 'Events', render: (r) => formatNumber(r.count) },
              { key: 'types', header: 'Types', render: (r) => (r.types ?? []).map((t) => label(t)).join(', ') },
              { key: 'action', header: '', render: (r) => (
                <ActionButton tone="danger" onDone={blocked.reload} dialog={{
                  title: `Block ${r.ip}?`, confirmLabel: 'Block IP', danger: true,
                  description: 'Requests from this address are refused immediately.',
                  fields: [{ name: 'reason', label: 'Reason', type: 'textarea', required: true, minLength: 5 }],
                  onConfirm: (v) => runAction(() => api.post('/security/blocked-ips', { ip: r.ip, reason: v.reason })),
                }}>Block</ActionButton>
              ) },
            ]}
          />
        </Card>

        <Card title="Blocked IP addresses">
          <div className="ad-row-end">
            <ExportButton
              filename="blocked-ips"
              load={async () => blocked.data?.ips ?? []}
              columns={[
                { header: 'IP', value: (r) => r.ip },
                { header: 'Reason', value: (r) => r.reason },
                { header: 'Blocked at', value: (r) => r.createdAt },
              ]}
            />
          </div>
          <DataTable
            loading={blocked.loading}
            error={blocked.error}
            rows={blocked.data?.ips}
            rowKey="ip"
            emptyText="No IPs are blocked"
            columns={[
              { key: 'ip', header: 'IP' },
              { key: 'reason', header: 'Reason' },
              { key: 'createdAt', header: 'Blocked', render: (r) => formatDate(r.createdAt) },
              { key: 'action', header: '', render: (r) => (
                <ActionButton onDone={blocked.reload} dialog={{
                  title: `Unblock ${r.ip}?`, confirmLabel: 'Unblock',
                  onConfirm: () => runAction(() => api.delete(`/security/blocked-ips/${encodeURIComponent(r.ip)}`)),
                }}>Unblock</ActionButton>
              ) },
            ]}
          />
        </Card>
      </div>

      <Card title="Event log" actions={
        <form className="ad-toolbar" onSubmit={submitIp}>
          <label className="ad-field">
            <span>Type</span>
            <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t ? label(t) : 'All types'}</option>)}
            </select>
          </label>
          <label className="ad-field">
            <span>IP address</span>
            <input value={ipFilter} onChange={(e) => setIpFilter(e.target.value)} placeholder="Filter by IP" />
          </label>
          <button type="submit" className="ad-btn ad-btn--ghost">Apply</button>
        </form>
      }>
        <div className="ad-row-end">
          <ExportButton
            filename="security-events"
            load={() => fetchAllPages('/security/events', { type, ip: ipQuery }, 'events')}
            columns={[
              { header: 'Time', value: (e) => e.createdAt },
              { header: 'Type', value: (e) => e.type },
              { header: 'IP', value: (e) => e.ip },
              { header: 'Method', value: (e) => e.method },
              { header: 'Route', value: (e) => e.route },
              { header: 'Email tried', value: (e) => e.email },
              { header: 'User agent', value: (e) => e.userAgent },
            ]}
          />
        </div>
        <DataTable
          loading={events.loading}
          error={events.error}
          rows={events.data?.events}
          emptyText="No events match"
          columns={[
            { key: 'createdAt', header: 'Time', render: (e) => formatDate(e.createdAt) },
            { key: 'type', header: 'Type', render: (e) => <Badge value={e.type === 'failed_admin_login' ? 'failed' : 'muted'} /> },
            { key: 'label', header: 'Event', render: (e) => label(e.type) },
            { key: 'ip', header: 'IP' },
            { key: 'route', header: 'Route', render: (e) => <code className="ad-code">{e.method} {e.route}</code> },
            { key: 'email', header: 'Email tried' },
          ]}
        />
        <Pager page={page} totalPages={events.data?.pagination?.totalPages} onPage={setPage} />
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
    return { ok: false, message: err.response?.data?.message ?? 'Action failed' };
  }
}

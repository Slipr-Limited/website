import React, { useState } from 'react';
import { useApi } from '../hooks';
import { Badge, Card, DataTable, ExportButton, Pager } from '../components/ui';
import { fetchAllPages } from '../export';
import { formatDate, label } from '../format';

const ACTIONS = [
  { value: '', label: 'Everything' },
  { value: 'write', label: 'Changes made' },
  { value: 'login', label: 'Sign-ins' },
];

export default function AuditPage() {
  const [action, setAction] = useState('');
  const [page, setPage]     = useState(1);
  const log = useApi('/super/audit-log', { page, limit: 50, action });

  return (
    <div className="ad-stack-lg">
      <Card title="Audit log" actions={
        <label className="ad-field">
          <span className="ad-sr">Show</span>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
      }>
        <p className="ad-muted ad-small">
          Every admin change and sign-in, kept for one year. Request values are never stored, only the names of the fields that were sent.
        </p>
        <div className="ad-row-end">
          <ExportButton
            filename={`audit-log-${action || 'all'}`}
            load={() => fetchAllPages('/super/audit-log', { action }, 'entries')}
            columns={[
              { header: 'When', value: (e) => e.createdAt },
              { header: 'Admin', value: (e) => e.admin?.username ?? '' },
              { header: 'Role', value: (e) => e.adminRole },
              { header: 'Action', value: (e) => e.action },
              { header: 'Method', value: (e) => e.method },
              { header: 'Route', value: (e) => e.route },
              { header: 'Status', value: (e) => e.status },
              { header: 'Fields sent', value: (e) => (e.bodyKeys ?? []).join('; ') },
              { header: 'IP', value: (e) => e.ip },
            ]}
          />
        </div>
        <DataTable
          loading={log.loading}
          error={log.error}
          rows={log.data?.entries}
          emptyText="No activity yet"
          columns={[
            { key: 'createdAt', header: 'When', render: (e) => formatDate(e.createdAt) },
            { key: 'admin', header: 'Admin', render: (e) => (e.admin?.username ? `@${e.admin.username}` : '—') },
            { key: 'role', header: 'Role', render: (e) => label(e.adminRole) },
            { key: 'action', header: 'Action', render: (e) => <Badge value={e.action === 'login' ? 'active' : 'muted'} /> },
            { key: 'route', header: 'Request', render: (e) => (
              e.route ? <code className="ad-code">{e.method} {e.route.replace('/api/admin', '')}</code> : '—'
            ) },
            { key: 'status', header: 'Result', render: (e) => (
              e.status && e.status >= 400 ? <Badge value="failed" /> : <Badge value="success" />
            ) },
            { key: 'bodyKeys', header: 'Fields sent', render: (e) => (e.bodyKeys?.length ? e.bodyKeys.join(', ') : '—') },
            { key: 'ip', header: 'IP' },
          ]}
        />
        <Pager page={page} totalPages={log.data?.pagination?.totalPages} onPage={setPage} />
      </Card>
    </div>
  );
}

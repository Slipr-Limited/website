import React from 'react';
import { api } from '../api';
import { useAdminAuth } from '../AuthContext';
import { useApi } from '../hooks';
import { ActionButton, Badge, Card, DataTable, ExportButton, Notice } from '../components/ui';
import { formatDate, shortId } from '../format';
import { ROLE_LABELS } from '../permissions';

const ROLE_OPTIONS = [
  { value: 'finance_admin', label: 'Finance' },
  { value: 'support_admin', label: 'Support' },
  { value: 'escrow_admin', label: 'Escrow' },
];

export default function AdminsPage() {
  const { user: me } = useAdminAuth();
  const admins = useApi('/super/admins');

  const isMe = (a) => String(a._id) === String(me?._id);

  const columns = [
    { key: 'username', header: 'Admin', render: (a) => (
      <>@{a.username}{isMe(a) && <span className="ad-you">YOU</span>}</>
    ) },
    { key: 'email', header: 'Email' },
    { key: 'adminRole', header: 'Role', render: (a) => ROLE_LABELS[a.adminRole] ?? a.adminRole },
    { key: 'state', header: 'State', render: (a) => <Badge value={a.isBanned ? 'inactive' : 'active'} /> },
    { key: 'lastAdminLogin', header: 'Last sign-in', render: (a) => formatDate(a.lastAdminLogin) },
    { key: 'adminCreatedAt', header: 'Created', render: (a) => formatDate(a.adminCreatedAt ?? a.createdAt) },
    { key: 'actions', header: '', render: (a) => {
      if (a.adminRole === 'super_admin') return <span className="ad-muted">Protected</span>;
      if (isMe(a)) return <span className="ad-muted">Your account</span>;
      return (
        <span className="ad-row-actions">
          <ActionButton onDone={admins.reload} dialog={{
            title: `Change role for @${a.username}`, confirmLabel: 'Save role',
            fields: [{ name: 'adminRole', label: 'Role', type: 'select', options: ROLE_OPTIONS, initial: a.adminRole }],
            onConfirm: (v) => runAction(() => api.put(`/super/admins/${a._id}`, { adminRole: v.adminRole })),
          }}>Role</ActionButton>
          {a.isBanned ? (
            <ActionButton tone="primary" onDone={admins.reload} dialog={{
              title: `Reactivate @${a.username}?`, confirmLabel: 'Reactivate',
              onConfirm: () => runAction(() => api.put(`/super/admins/${a._id}`, { isActive: true })),
            }}>Reactivate</ActionButton>
          ) : (
            <ActionButton tone="danger" onDone={admins.reload} dialog={{
              title: `Deactivate @${a.username}?`, confirmLabel: 'Deactivate', danger: true,
              description: 'They are signed out and cannot sign in until reactivated.',
              onConfirm: () => runAction(() => api.delete(`/super/admins/${a._id}`)),
            }}>Deactivate</ActionButton>
          )}
          <ActionButton tone="danger" onDone={admins.reload} dialog={{
            title: `Reset two-factor for @${a.username}?`, confirmLabel: 'Reset two-factor', danger: true,
            description: 'Their authenticator is removed and they are signed out. They set up a new one on next sign-in. Use this when a phone is lost.',
            fields: [{ name: 'reason', label: 'Reason', type: 'textarea', required: true, minLength: 10 }],
            onConfirm: (v) => runAction(() => api.post(`/super/admins/${a._id}/reset-mfa`, { reason: v.reason })),
          }}>Reset 2FA</ActionButton>
        </span>
      );
    } },
  ];

  return (
    <div className="ad-stack-lg">
      <Card title="Admin accounts" actions={
        <ActionButton tone="primary" onDone={admins.reload} dialog={{
          title: 'Create an admin account', confirmLabel: 'Create admin',
          description: 'The new admin signs in with this password and sets up an authenticator app on first sign-in.',
          fields: [
            { name: 'username', label: 'Username', required: true, minLength: 3 },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'password', label: 'Temporary password (min 8)', type: 'password', required: true, minLength: 8 },
            { name: 'adminRole', label: 'Role', type: 'select', options: ROLE_OPTIONS },
          ],
          onConfirm: (v) => runAction(() => api.post('/super/admins', {
            username: v.username.trim(), email: v.email.trim(), password: v.password, adminRole: v.adminRole,
          })),
        }}>Create admin</ActionButton>
      }>
        <p className="ad-muted ad-small">
          Roles: Finance (withdrawals, refunds), Support (users, KYC, complaints, comments), Escrow (disputes and outcomes).
          Super admins are created from the server console only, never from the dashboard.
        </p>
        <div className="ad-row-end">
          <ExportButton
            filename="admin-accounts"
            load={async () => admins.data?.admins ?? []}
            columns={[
              { header: 'Username', value: (a) => a.username },
              { header: 'Email', value: (a) => a.email },
              { header: 'Role', value: (a) => ROLE_LABELS[a.adminRole] ?? a.adminRole },
              { header: 'Active', value: (a) => (a.isBanned ? 'no' : 'yes') },
              { header: 'Last sign-in', value: (a) => a.lastAdminLogin },
              { header: 'Created', value: (a) => a.adminCreatedAt ?? a.createdAt },
            ]}
          />
        </div>
        <DataTable columns={columns} rows={admins.data?.admins} loading={admins.loading} error={admins.error} emptyText="No admins" />
        <p className="ad-muted ad-small">Short IDs are shown in audit records: {shortId(me?._id)} is you.</p>
      </Card>
      {admins.error && <Notice kind="error">{admins.error}</Notice>}
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

import React, { useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks';
import { ActionButton, Badge, Card, DataTable, ExportButton, Pager } from '../components/ui';
import { fetchAllPages } from '../export';
import { formatDate, label, shortId } from '../format';

const TABS = [
  { key: 'complaints', label: 'Complaints' },
  { key: 'kyc', label: 'KYC review' },
  { key: 'comments', label: 'Comments' },
];

const COMPLAINT_STATUSES = ['pending', 'under_review', 'resolved', 'dismissed'];

const who = (u) => (u?.username ? `@${u.username}` : shortId(u));

export default function SupportPage() {
  const [tab, setTab]   = useState('complaints');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');

  const complaints = useApi('/support/complaints', { page, limit: 20, status }, { enabled: tab === 'complaints' });
  const kyc        = useApi('/support/kyc', { page, limit: 20 }, { enabled: tab === 'kyc' });
  const comments   = useApi('/support/comments', { page, limit: 20 }, { enabled: tab === 'comments' });

  const switchTab = (key) => { setTab(key); setPage(1); };
  const current = tab === 'complaints' ? complaints : tab === 'kyc' ? kyc : comments;

  const complaintColumns = [
    { key: 'createdAt', header: 'Reported', render: (c) => formatDate(c.createdAt) },
    { key: 'reporter', header: 'Reporter', render: (c) => who(c.reporter) },
    { key: 'target', header: 'Target', render: (c) => `${label(c.targetType)} · ${shortId(c.targetId)}` },
    { key: 'reason', header: 'Reason', render: (c) => label(c.reason) },
    { key: 'status', header: 'Status', render: (c) => <Badge value={c.status} /> },
    { key: 'actions', header: '', render: (c) => (
      <span className="ad-row-actions">
        {c.status !== 'resolved' && c.status !== 'dismissed' && (
          <>
            <ActionButton onDone={complaints.reload} dialog={{
              title: 'Mark as resolved?', confirmLabel: 'Resolve',
              fields: [{ name: 'adminNote', label: 'Note', type: 'textarea' }],
              onConfirm: (v) => runAction(() => api.put(`/support/complaints/${c._id}`, { status: 'resolved', adminNote: v.adminNote })),
            }}>Resolve</ActionButton>
            <ActionButton onDone={complaints.reload} dialog={{
              title: 'Dismiss this complaint?', confirmLabel: 'Dismiss', danger: true,
              fields: [{ name: 'adminNote', label: 'Reason', type: 'textarea', required: true, minLength: 5 }],
              onConfirm: (v) => runAction(() => api.put(`/support/complaints/${c._id}`, { status: 'dismissed', adminNote: v.adminNote })),
            }}>Dismiss</ActionButton>
          </>
        )}
        {c.status === 'pending' && (
          <ActionButton onDone={complaints.reload} dialog={{
            title: 'Mark as under review?', confirmLabel: 'Mark under review',
            onConfirm: () => runAction(() => api.put(`/support/complaints/${c._id}`, { status: 'under_review' })),
          }}>Start review</ActionButton>
        )}
      </span>
    ) },
  ];

  const kycColumns = [
    { key: 'username', header: 'User', render: (u) => `@${u.username}` },
    { key: 'email', header: 'Email' },
    { key: 'isTipster', header: 'Type', render: (u) => (u.isTipster ? 'Tipster' : 'Buyer') },
    { key: 'kycStatus', header: 'KYC', render: (u) => <Badge value={u.kycStatus} /> },
    { key: 'createdAt', header: 'Joined', render: (u) => formatDate(u.createdAt) },
    { key: 'actions', header: '', render: (u) => (
      <span className="ad-row-actions">
        <ActionButton tone="primary" onDone={kyc.reload} dialog={{
          title: `Approve KYC for @${u.username}?`, confirmLabel: 'Approve',
          description: 'Approving KYC lets this user withdraw money and post slips.',
          fields: [{ name: 'note', label: 'Note', type: 'textarea' }],
          onConfirm: (v) => runAction(() => api.put(`/support/kyc/${u._id}`, { status: 'approved', note: v.note })),
        }}>Approve</ActionButton>
        <ActionButton tone="danger" onDone={kyc.reload} dialog={{
          title: `Reject KYC for @${u.username}?`, confirmLabel: 'Reject', danger: true,
          fields: [{ name: 'note', label: 'Reason sent to the user', type: 'textarea', required: true, minLength: 5 }],
          onConfirm: (v) => runAction(() => api.put(`/support/kyc/${u._id}`, { status: 'rejected', note: v.note })),
        }}>Reject</ActionButton>
      </span>
    ) },
  ];

  const commentColumns = [
    { key: 'createdAt', header: 'Posted', render: (c) => formatDate(c.createdAt) },
    { key: 'author', header: 'Author', render: (c) => who(c.author) },
    { key: 'text', header: 'Comment', render: (c) => <span className="ad-clamp">{c.text}</span> },
    { key: 'listing', header: 'Slip', render: (c) => shortId(c.listing) },
    { key: 'actions', header: '', render: (c) => (
      <ActionButton tone="danger" onDone={comments.reload} dialog={{
        title: 'Remove this comment?', confirmLabel: 'Remove', danger: true,
        description: 'The comment is removed from the slip for everyone.',
        onConfirm: () => runAction(() => api.delete(`/support/comments/${c._id}`)),
      }}>Remove</ActionButton>
    ) },
  ];

  return (
    <div className="ad-stack-lg">
      <Card title="Support" actions={
        <div className="ad-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
              className={`ad-tab${tab === t.key ? ' is-active' : ''}`} onClick={() => switchTab(t.key)}>{t.label}</button>
          ))}
        </div>
      }>
        {tab === 'complaints' && (
          <div className="ad-tabs" role="tablist">
            {COMPLAINT_STATUSES.map((s) => (
              <button key={s} type="button" role="tab" aria-selected={status === s}
                className={`ad-tab${status === s ? ' is-active' : ''}`} onClick={() => { setStatus(s); setPage(1); }}>{label(s)}</button>
            ))}
          </div>
        )}
        <div className="ad-row-end">
          <ExportButton
            filename={tab === 'complaints' ? `complaints-${status}` : tab === 'kyc' ? 'kyc-pending' : 'comments'}
            load={() => tab === 'complaints'
              ? fetchAllPages('/support/complaints', { status }, 'complaints')
              : tab === 'kyc'
                ? fetchAllPages('/support/kyc', {}, 'users')
                : fetchAllPages('/support/comments', {}, 'comments')}
            columns={tab === 'complaints' ? [
              { header: 'Reported', value: (c) => c.createdAt },
              { header: 'Reporter', value: (c) => c.reporter?.username ?? c.reporter },
              { header: 'Target type', value: (c) => c.targetType },
              { header: 'Target ID', value: (c) => c.targetId },
              { header: 'Reason', value: (c) => c.reason },
              { header: 'Status', value: (c) => c.status },
            ] : tab === 'kyc' ? [
              { header: 'Username', value: (u) => u.username },
              { header: 'Email', value: (u) => u.email },
              { header: 'Type', value: (u) => (u.isTipster ? 'Tipster' : 'Buyer') },
              { header: 'KYC status', value: (u) => u.kycStatus },
              { header: 'Joined', value: (u) => u.createdAt },
            ] : [
              { header: 'Posted', value: (c) => c.createdAt },
              { header: 'Author', value: (c) => c.author?.username ?? c.author },
              { header: 'Comment', value: (c) => c.text },
              { header: 'Slip ID', value: (c) => c.listing },
            ]}
          />
        </div>
        <DataTable
          columns={tab === 'complaints' ? complaintColumns : tab === 'kyc' ? kycColumns : commentColumns}
          rows={tab === 'complaints' ? complaints.data?.complaints : tab === 'kyc' ? kyc.data?.users : comments.data?.comments}
          loading={current.loading}
          error={current.error}
          emptyText="Nothing here"
        />
        <Pager page={page} totalPages={current.data?.pagination?.totalPages} onPage={setPage} />
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

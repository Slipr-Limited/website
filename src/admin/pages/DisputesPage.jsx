import React, { useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks';
import { ActionButton, Badge, Card, DataTable, ExportButton, Notice, Pager } from '../components/ui';
import { fetchAllPages } from '../export';
import { formatDate, formatKobo, label, shortId } from '../format';

const TABS = [
  { key: 'disputes', label: 'Disputes' },
  { key: 'outcomes', label: 'Awaiting outcome' },
];

const STATUSES = ['', 'open', 'under_review', 'resolved_buyer', 'resolved_tipster'];

export default function DisputesPage() {
  const [tab, setTab]       = useState('disputes');
  const [status, setStatus] = useState('open');
  const [page, setPage]     = useState(1);
  const [selected, setSelected] = useState(null);

  const disputes = useApi('/escrow/disputes', { page, limit: 20, status }, { enabled: tab === 'disputes' });
  const outcomes = useApi('/escrow/outcomes', { page, limit: 20 }, { enabled: tab === 'outcomes' });
  const detail   = useApi(`/escrow/disputes/${selected}`, {}, { enabled: Boolean(selected) });

  const current = tab === 'disputes' ? disputes : outcomes;
  const switchTab = (key) => { setTab(key); setPage(1); setSelected(null); };

  const disputeColumns = [
    { key: 'createdAt', header: 'Opened', render: (d) => formatDate(d.createdAt) },
    { key: 'status', header: 'Status', render: (d) => <Badge value={d.status} /> },
    { key: 'raisedBy', header: 'Raised by', render: (d) => (d.raisedBy?.username ? `@${d.raisedBy.username}` : shortId(d.raisedBy)) },
    { key: 'reason', header: 'Reason', render: (d) => <span className="ad-clamp">{d.reason}</span> },
    { key: 'actions', header: '', render: (d) => (
      <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setSelected(d._id)}>Review</button>
    ) },
  ];

  const outcomeColumns = [
    { key: 'createdAt', header: 'Purchased', render: (p) => formatDate(p.createdAt) },
    { key: 'status', header: 'Status', render: (p) => <Badge value={p.status} /> },
    { key: 'buyer', header: 'Buyer', render: (p) => (p.buyer?.username ? `@${p.buyer.username}` : shortId(p.buyer)) },
    { key: 'escrowAmount', header: 'In escrow', render: (p) => formatKobo(p.escrowAmount) },
  ];

  return (
    <div className="ad-stack-lg">
      <Card title="Escrow" actions={
        <div className="ad-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
              className={`ad-tab${tab === t.key ? ' is-active' : ''}`} onClick={() => switchTab(t.key)}>{t.label}</button>
          ))}
        </div>
      }>
        {tab === 'disputes' && (
          <div className="ad-toolbar">
            <label className="ad-field">
              <span>Status</span>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s ? label(s) : 'All'}</option>)}
              </select>
            </label>
          </div>
        )}
        <div className="ad-row-end">
          <ExportButton
            filename={tab === 'disputes' ? 'disputes' : 'escrow-outcomes'}
            load={() => tab === 'disputes'
              ? fetchAllPages('/escrow/disputes', { status }, 'disputes')
              : fetchAllPages('/escrow/outcomes', {}, 'purchases')}
            columns={tab === 'disputes' ? [
              { header: 'Opened', value: (d) => d.createdAt },
              { header: 'Status', value: (d) => d.status },
              { header: 'Raised by', value: (d) => d.raisedBy?.username ?? d.raisedBy },
              { header: 'Reason', value: (d) => d.reason },
              { header: 'Admin note', value: (d) => d.adminNote },
            ] : [
              { header: 'Purchased', value: (p) => p.createdAt },
              { header: 'Status', value: (p) => p.status },
              { header: 'Buyer', value: (p) => p.buyer?.username ?? p.buyer },
              { header: 'Escrow (NGN)', value: (p) => (p.escrowAmount ?? 0) / 100 },
            ]}
          />
        </div>
        <DataTable
          columns={tab === 'disputes' ? disputeColumns : outcomeColumns}
          rows={tab === 'disputes' ? disputes.data?.disputes : outcomes.data?.purchases}
          loading={current.loading}
          error={current.error}
          emptyText={tab === 'disputes' ? 'No disputes in this state' : 'Nothing is waiting for an outcome'}
        />
        <Pager page={page} totalPages={current.data?.pagination?.totalPages} onPage={setPage} />
      </Card>

      {tab === 'disputes' && selected && (
        <Card title={`Dispute ${shortId(selected)}`} actions={
          <span className="ad-row-actions">
            {detail.data?.dispute?.status === 'open' || detail.data?.dispute?.status === 'under_review' ? (
              <>
                <ActionButton tone="primary" onDone={() => { detail.reload(); disputes.reload(); }} dialog={{
                  title: 'Rule in favour of the buyer?', confirmLabel: 'Rule for buyer', danger: true,
                  description: 'The buyer is refunded from escrow. The tipster is not paid for this slip.',
                  fields: [{ name: 'note', label: 'Reasoning (required)', type: 'textarea', required: true, minLength: 10 }],
                  onConfirm: (v) => runAction(() => api.put(`/escrow/disputes/${selected}/resolve`, { verdict: 'buyer', note: v.note })),
                }}>Rule for buyer</ActionButton>
                <ActionButton tone="primary" onDone={() => { detail.reload(); disputes.reload(); }} dialog={{
                  title: 'Rule in favour of the tipster?', confirmLabel: 'Rule for tipster', danger: true,
                  description: 'The tipster is paid from escrow. The buyer is not refunded.',
                  fields: [{ name: 'note', label: 'Reasoning (required)', type: 'textarea', required: true, minLength: 10 }],
                  onConfirm: (v) => runAction(() => api.put(`/escrow/disputes/${selected}/resolve`, { verdict: 'tipster', note: v.note })),
                }}>Rule for tipster</ActionButton>
                <ActionButton onDone={() => detail.reload()} dialog={{
                  title: 'Escalate to super admin?', confirmLabel: 'Escalate',
                  fields: [{ name: 'note', label: 'Note for the super admin', type: 'textarea', required: true, minLength: 10 }],
                  onConfirm: (v) => runAction(() => api.put(`/escrow/disputes/${selected}/escalate`, { note: v.note })),
                }}>Escalate</ActionButton>
                <ActionButton onDone={() => detail.reload()} dialog={{
                  title: 'Request evidence', confirmLabel: 'Send request',
                  fields: [
                    { name: 'party', label: 'From', type: 'select', options: [
                      { value: 'buyer', label: 'Buyer' }, { value: 'tipster', label: 'Tipster' },
                    ] },
                    { name: 'message', label: 'What do you need?', type: 'textarea', required: true, minLength: 10 },
                  ],
                  onConfirm: (v) => runAction(() => api.put(`/escrow/disputes/${selected}/evidence`, { party: v.party, message: v.message })),
                }}>Request evidence</ActionButton>
              </>
            ) : null}
            <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setSelected(null)}>Close</button>
          </span>
        }>
          {detail.error && <Notice kind="error">{detail.error}</Notice>}
          {detail.data?.dispute && (
            <dl className="ad-kv">
              <dt>Status</dt><dd><Badge value={detail.data.dispute.status} /></dd>
              <dt>Opened</dt><dd>{formatDate(detail.data.dispute.createdAt)}</dd>
              <dt>Raised by</dt><dd>{detail.data.dispute.raisedBy?.username ? `@${detail.data.dispute.raisedBy.username}` : shortId(detail.data.dispute.raisedBy)}</dd>
              <dt>Reason</dt><dd>{detail.data.dispute.reason}</dd>
              <dt>Admin note</dt><dd>{detail.data.dispute.adminNote ?? '—'}</dd>
              <dt>Slip</dt><dd>{detail.data.dispute.listing?.platform ?? '—'} · {detail.data.dispute.listing?.sport?.join(', ') ?? ''}</dd>
            </dl>
          )}
        </Card>
      )}
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

import React, { useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks';
import { ActionButton, Badge, Card, DataTable, ExportButton, Notice, Pager, StatTile } from '../components/ui';
import { fetchAllPages } from '../export';
import { formatDate, formatKobo, formatNumber, label, shortId } from '../format';

const TABS = [
  { key: 'slips', label: 'Slips' },
  { key: 'boosts', label: 'Boosts' },
  { key: 'subscriptions', label: 'Blue tick subscriptions' },
];

const STATUSES = ['', 'active', 'locked', 'outcome_pending', 'won', 'lost', 'expired', 'disputed', 'cancelled'];

const tipsterName = (t) => (t?.username ? `@${t.username}` : shortId(t));

export default function ListingsPage() {
  const [tab, setTab]       = useState('slips');
  const [status, setStatus] = useState('');
  const [page, setPage]     = useState(1);
  const [selected, setSelected] = useState(null);

  const slips = useApi('/listings', { page, limit: 20, status }, { enabled: tab === 'slips' });
  const boosts = useApi('/boosts', { page, limit: 20, active: 'true' }, { enabled: tab === 'boosts' });
  const subs = useApi('/subscriptions', { page, limit: 20, active: 'true' }, { enabled: tab === 'subscriptions' });
  const detail = useApi(`/listings/${selected}`, {}, { enabled: Boolean(selected) });

  const switchTab = (key) => { setTab(key); setPage(1); setSelected(null); };

  const slipColumns = [
    { key: 'tipster', header: 'Tipster', render: (l) => tipsterName(l.tipster) },
    { key: 'platform', header: 'Platform' },
    { key: 'numberOfGames', header: 'Games', render: (l) => formatNumber(l.numberOfGames) },
    { key: 'totalOdds', header: 'Odds', render: (l) => (Number(l.totalOdds) || 0).toFixed(2) },
    { key: 'price', header: 'Price', render: (l) => (l.isFree ? 'Free' : formatKobo(l.price)) },
    { key: 'status', header: 'Status', render: (l) => <Badge value={l.status} /> },
    { key: 'kickoffTime', header: 'Kick-off', render: (l) => formatDate(l.kickoffTime) },
    { key: 'actions', header: '', render: (l) => (
      <span className="ad-row-actions">
        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setSelected(l._id)}>View</button>
        <ActionButton tone="danger" onDone={slips.reload} dialog={{
          title: 'Delete this slip?', danger: true, confirmLabel: 'Delete slip',
          description: 'Buyers are refunded if the slip has not settled. This cannot be undone.',
          fields: [{ name: 'reason', label: 'Reason', type: 'textarea', required: true, minLength: 10 }],
          onConfirm: (v) => runAction(() => api.delete(`/listings/${l._id}`, { data: { reason: v.reason } })),
        }}>Delete</ActionButton>
      </span>
    ) },
  ];

  const boostColumns = [
    { key: 'tipster', header: 'Tipster', render: (l) => tipsterName(l.tipster) },
    { key: 'platform', header: 'Platform' },
    { key: 'boost', header: 'Boost ends', render: (l) => formatDate(l.boost?.expiresAt ?? l.boost?.endsAt) },
    { key: 'actions', header: '', render: (l) => (
      <ActionButton tone="danger" onDone={boosts.reload} dialog={{
        title: 'Cancel this boost?', danger: true, confirmLabel: 'Cancel boost',
        fields: [{ name: 'reason', label: 'Reason sent to the tipster', type: 'textarea', required: true, minLength: 5 }],
        onConfirm: (v) => runAction(() => api.delete(`/boosts/${l._id}`, { data: { reason: v.reason } })),
      }}>Cancel boost</ActionButton>
    ) },
  ];

  const subColumns = [
    { key: 'username', header: 'User', render: (u) => `@${u.username}` },
    { key: 'email', header: 'Email' },
    { key: 'subscription', header: 'Expires', render: (u) => formatDate(u.verifiedSubscription?.expiresAt) },
    { key: 'actions', header: '', render: (u) => (
      <ActionButton tone="danger" onDone={subs.reload} dialog={{
        title: `Cancel blue tick for @${u.username}?`, danger: true, confirmLabel: 'Cancel subscription',
        fields: [{ name: 'reason', label: 'Reason sent to the user', type: 'textarea', required: true, minLength: 5 }],
        onConfirm: (v) => runAction(() => api.delete(`/subscriptions/${u._id}`, { data: { reason: v.reason } })),
      }}>Cancel</ActionButton>
    ) },
  ];

  const current = tab === 'slips' ? slips : tab === 'boosts' ? boosts : subs;
  const columns = tab === 'slips' ? slipColumns : tab === 'boosts' ? boostColumns : subColumns;
  const rows = tab === 'slips' ? slips.data?.listings : tab === 'boosts' ? boosts.data?.listings : subs.data?.users;

  return (
    <div className="ad-stack-lg">
      <Card title="Slips and promotions" actions={
        <div className="ad-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
              className={`ad-tab${tab === t.key ? ' is-active' : ''}`} onClick={() => switchTab(t.key)}>{t.label}</button>
          ))}
        </div>
      }>
        {tab === 'slips' && (
          <div className="ad-toolbar">
            <label className="ad-field">
              <span>Status</span>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s ? label(s) : 'All statuses'}</option>)}
              </select>
            </label>
          </div>
        )}
        <div className="ad-row-end">
          <ExportButton
            filename={tab}
            load={() => tab === 'slips'
              ? fetchAllPages('/listings', { status }, 'listings')
              : tab === 'boosts'
                ? fetchAllPages('/boosts', { active: 'true' }, 'listings')
                : fetchAllPages('/subscriptions', { active: 'true' }, 'users')}
            columns={tab === 'slips' ? [
              { header: 'Tipster', value: (l) => l.tipster?.username ?? l.tipster },
              { header: 'Platform', value: (l) => l.platform },
              { header: 'Games', value: (l) => l.numberOfGames },
              { header: 'Odds', value: (l) => (Number(l.totalOdds) || 0).toFixed(2) },
              { header: 'Price (NGN)', value: (l) => (l.isFree ? 0 : (l.price ?? 0) / 100) },
              { header: 'Status', value: (l) => l.status },
              { header: 'Kick-off', value: (l) => l.kickoffTime },
              { header: 'Created', value: (l) => l.createdAt },
            ] : tab === 'boosts' ? [
              { header: 'Tipster', value: (l) => l.tipster?.username ?? l.tipster },
              { header: 'Platform', value: (l) => l.platform },
              { header: 'Boost ends', value: (l) => l.boost?.expiresAt ?? l.boost?.endsAt },
            ] : [
              { header: 'Username', value: (u) => u.username },
              { header: 'Email', value: (u) => u.email },
              { header: 'Expires', value: (u) => u.verifiedSubscription?.expiresAt },
            ]}
          />
        </div>
        <DataTable columns={columns} rows={rows} loading={current.loading} error={current.error} emptyText="Nothing to show" />
        <Pager page={page} totalPages={current.data?.pagination?.totalPages} onPage={setPage} />
      </Card>

      {tab === 'slips' && selected && (
        <Card title={`Slip ${shortId(selected)}`} actions={
          <span className="ad-row-actions">
            <ActionButton onDone={() => { detail.reload(); slips.reload(); }} dialog={{
              title: 'Set the outcome', confirmLabel: 'Set outcome', danger: true,
              description: 'Forces the settlement of this slip. Buyers are paid or refunded according to the outcome.',
              fields: [
                { name: 'outcome', label: 'Outcome', type: 'select', options: [
                  { value: 'won', label: 'Won — pay the tipster' },
                  { value: 'lost', label: 'Lost — refund buyers' },
                  { value: 'cancelled', label: 'Cancelled — refund buyers' },
                ] },
                { name: 'note', label: 'Note (required)', type: 'textarea', required: true, minLength: 10 },
              ],
              onConfirm: (v) => runAction(() => api.put(`/listings/${selected}/outcome`, { outcome: v.outcome, note: v.note })),
            }}>Set outcome</ActionButton>
            <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setSelected(null)}>Close</button>
          </span>
        }>
          {detail.error && <Notice kind="error">{detail.error}</Notice>}
          {detail.data && (
            <>
              <dl className="ad-kv">
                <dt>Tipster</dt><dd>{tipsterName(detail.data.listing.tipster)}</dd>
                <dt>Platform</dt><dd>{detail.data.listing.platform}</dd>
                <dt>Status</dt><dd><Badge value={detail.data.listing.status} /></dd>
                <dt>Sports</dt><dd>{(detail.data.listing.sport ?? []).join(', ') || '—'}</dd>
                <dt>Kick-off</dt><dd>{formatDate(detail.data.listing.kickoffTime)}</dd>
                <dt>Closes</dt><dd>{formatDate(detail.data.listing.closingTime)}</dd>
                <dt>Purchases</dt><dd>{formatNumber(detail.data.purchaseCount)}</dd>
                <dt>Disputes</dt><dd>{formatNumber(detail.data.disputeCount)}</dd>
                <dt>Description</dt><dd>{detail.data.listing.description ?? '—'}</dd>
              </dl>
              <div className="ad-grid">
                <StatTile label="Total odds" value={(Number(detail.data.listing.totalOdds) || 0).toFixed(2)} />
                <StatTile label="Matches" value={formatNumber(detail.data.listing.trackedMatches?.length ?? detail.data.listing.numberOfGames)} />
              </div>
            </>
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

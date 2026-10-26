import React, { useState } from 'react';
import { api } from '../api';
import { useAdminAuth } from '../AuthContext';
import { useApi } from '../hooks';
import { canSee, ROLES } from '../permissions';
import { ActionButton, Badge, Card, DataTable, ExportButton, Notice, Pager, StatTile } from '../components/ui';
import { fetchAllPages } from '../export';
import { formatDate, formatKobo, formatNumber, shortId } from '../format';

const FILTERS = [
  { key: 'all', label: 'All users' },
  { key: 'banned', label: 'Banned', params: { isBanned: 'true' } },
  { key: 'flagged', label: 'Flagged', params: { isFlagged: 'true' } },
  { key: 'tipsters', label: 'Tipsters', params: { isTipster: 'true' } },
  { key: 'kyc', label: 'KYC pending', params: { kycStatus: 'pending' } },
];

export default function UsersPage() {
  const { role } = useAdminAuth();
  const canModerate = canSee(role, 'support');
  const isSuper = role === ROLES.SUPER;

  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');
  const [query, setQuery]     = useState('');
  const [page, setPage]       = useState(1);
  const [selected, setSelected] = useState(null);

  const activeFilter = FILTERS.find((f) => f.key === filter);
  const list = useApi('/support/users', { page, limit: 20, search: query, ...(activeFilter?.params ?? {}) });
  const detail = useApi(`/support/users/${selected}`, {}, { enabled: Boolean(selected) });
  const purchases = useApi(`/support/users/${selected}/purchases`, { limit: 10 }, { enabled: Boolean(selected) });

  const submitSearch = (e) => { e.preventDefault(); setPage(1); setQuery(search.trim()); };

  const columns = [
    { key: 'username', header: 'User', render: (u) => (
      <button type="button" className="ad-link" onClick={() => setSelected(u._id)}>@{u.username}</button>
    ) },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Type', render: (u) => u.isTipster ? 'Tipster' : 'Buyer' },
    { key: 'status', header: 'Status', render: (u) => (
      <span className="ad-row-badges">
        {u.isBanned && <Badge value="banned" />}
        {u.isFlagged && <Badge value="flagged" />}
        {!u.isBanned && !u.isFlagged && <Badge value="active" />}
        {u.isVerified && <Badge value="verified" />}
      </span>
    ) },
    { key: 'kycStatus', header: 'KYC', render: (u) => <Badge value={u.kycStatus ?? 'none'} /> },
    { key: 'createdAt', header: 'Joined', render: (u) => formatDate(u.createdAt) },
    { key: 'actions', header: '', render: (u) => canModerate && (
      <span className="ad-row-actions">
        {u.isBanned
          ? <ActionButton tone="ghost" onDone={list.reload} dialog={{
              title: `Unban @${u.username}?`, confirmLabel: 'Unban',
              onConfirm: async () => {
                const r = await runAction(() => api.put(`/support/users/${u._id}/unban`));
                return r;
              },
            }}>Unban</ActionButton>
          : <ActionButton tone="danger" onDone={list.reload} dialog={{
              title: `Ban @${u.username}?`, confirmLabel: 'Ban user', danger: true,
              description: 'Banned users cannot sign in. Their active slips remain under review.',
              fields: [{ name: 'reason', label: 'Reason', type: 'textarea', required: true, minLength: 5 }],
              onConfirm: (v) => runAction(() => api.put(`/support/users/${u._id}/ban`, { reason: v.reason })),
            }}>Ban</ActionButton>}
        <ActionButton onDone={list.reload} dialog={{
          title: `Warn @${u.username}`, confirmLabel: 'Send warning',
          fields: [{ name: 'reason', label: 'Warning', type: 'textarea', required: true, minLength: 5 }],
          onConfirm: (v) => runAction(() => api.put(`/support/users/${u._id}/warn`, { reason: v.reason })),
        }}>Warn</ActionButton>
        {!u.isFlagged
          ? <ActionButton onDone={list.reload} dialog={{
              title: `Flag @${u.username} for review`, confirmLabel: 'Flag',
              fields: [{ name: 'reason', label: 'Reason', type: 'textarea', required: true, minLength: 5 }],
              onConfirm: (v) => runAction(() => api.put(`/support/users/${u._id}/flag`, { reason: v.reason })),
            }}>Flag</ActionButton>
          : <ActionButton onDone={list.reload} dialog={{
              title: `Remove flag from @${u.username}?`, confirmLabel: 'Remove flag',
              onConfirm: () => runAction(() => api.post(`/users/${u._id}/unflag`)),
            }}>Unflag</ActionButton>}
        {isSuper && (
          <ActionButton onDone={list.reload} dialog={{
            title: `${u.isVerified ? 'Remove' : 'Grant'} blue tick for @${u.username}?`,
            confirmLabel: u.isVerified ? 'Remove tick' : 'Grant tick',
            fields: [{ name: 'reason', label: 'Reason', type: 'textarea', required: true, minLength: 5 }],
            onConfirm: (v) => runAction(() => api.put(`/users/${u._id}/verify`, { isVerified: !u.isVerified, reason: v.reason })),
          }}>{u.isVerified ? 'Remove tick' : 'Grant tick'}</ActionButton>
        )}
      </span>
    ) },
  ];

  return (
    <div className="ad-stack-lg">
      <Card title="Users" actions={
        <div className="ad-tabs" role="tablist">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={filter === f.key}
              className={`ad-tab${filter === f.key ? ' is-active' : ''}`}
              onClick={() => { setFilter(f.key); setPage(1); }}>{f.label}</button>
          ))}
        </div>
      }>
        <form className="ad-toolbar" onSubmit={submitSearch}>
          <label className="ad-field">
            <span>Search username or email</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. tunde or tunde@mail.com" />
          </label>
          <button type="submit" className="ad-btn ad-btn--primary">Search</button>
        </form>
        <div className="ad-row-end">
          <ExportButton
            filename="users"
            load={() => fetchAllPages('/support/users', { search: query, ...(activeFilter?.params ?? {}) }, 'users')}
            columns={[
              { header: 'Username', value: (u) => u.username },
              { header: 'Email', value: (u) => u.email },
              { header: 'Type', value: (u) => (u.isTipster ? 'Tipster' : 'Buyer') },
              { header: 'Banned', value: (u) => (u.isBanned ? 'yes' : 'no') },
              { header: 'Flagged', value: (u) => (u.isFlagged ? 'yes' : 'no') },
              { header: 'Verified', value: (u) => (u.isVerified ? 'yes' : 'no') },
              { header: 'KYC', value: (u) => u.kycStatus ?? 'none' },
              { header: 'Joined', value: (u) => u.createdAt },
            ]}
          />
        </div>
        <DataTable columns={columns} rows={list.data?.users} loading={list.loading} error={list.error} emptyText="No users match these filters" />
        <Pager page={page} totalPages={list.data?.pagination?.totalPages} onPage={setPage} />
      </Card>

      {selected && (
        <Card title={`User ${shortId(selected)}`} actions={<button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setSelected(null)}>Close</button>}>
          {detail.error && <Notice kind="error">{detail.error}</Notice>}
          {detail.data && (
            <>
              <dl className="ad-kv">
                <dt>Username</dt><dd>@{detail.data.user.username}</dd>
                <dt>Email</dt><dd>{detail.data.user.email}</dd>
                <dt>Phone</dt><dd>{detail.data.user.phone ?? '—'}</dd>
                <dt>Type</dt><dd>{detail.data.user.isTipster ? 'Tipster' : 'Buyer'}</dd>
                <dt>KYC</dt><dd><Badge value={detail.data.user.kycStatus ?? 'none'} /></dd>
                <dt>Banned</dt><dd>{detail.data.user.isBanned ? `Yes — ${detail.data.user.banReason ?? 'no reason recorded'}` : 'No'}</dd>
                <dt>Joined</dt><dd>{formatDate(detail.data.user.createdAt)}</dd>
              </dl>
              <div className="ad-grid">
                <StatTile label="Available balance" value={formatKobo(detail.data.wallet?.balance)} />
                <StatTile label="In escrow" value={formatKobo(detail.data.wallet?.escrowBalance)} />
              </div>
            </>
          )}
          <h3 className="ad-subhead">Recent purchases</h3>
          <DataTable
            loading={purchases.loading}
            error={purchases.error}
            rows={purchases.data?.purchases}
            emptyText="No purchases"
            columns={[
              { key: 'createdAt', header: 'Date', render: (p) => formatDate(p.createdAt) },
              { key: 'status', header: 'Status', render: (p) => <Badge value={p.status} /> },
              { key: 'amountPaid', header: 'Paid', render: (p) => formatKobo(p.amountPaid) },
              { key: 'listing', header: 'Slip', render: (p) => `${p.listing?.platform ?? '—'} · ${formatNumber(p.listing?.numberOfGames)} games` },
            ]}
          />
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

import React, { useState } from 'react';
import { api } from '../api';
import { useAdminAuth } from '../AuthContext';
import { useApi } from '../hooks';
import { ROLES, canSee } from '../permissions';
import { ActionButton, Badge, Card, DataTable, ExportButton, Notice, Pager, StatTile } from '../components/ui';
import { BarChart } from '../components/Chart';
import { fetchAllPages } from '../export';
import { formatDate, formatKobo, formatNaira, formatNumber, label, shortId } from '../format';

const isSuper = (role) => role === ROLES.SUPER;

const TABS = [
  { key: 'withdrawals', label: 'Withdrawals' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'deposits', label: 'Deposits' },
  { key: 'escrow', label: 'Escrow' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'refunds', label: 'Refunds' },
];

const WITHDRAWAL_STATUSES = ['pending', 'processing', 'success', 'failed'];
const TX_TYPES = ['', 'deposit', 'withdrawal', 'purchase', 'sale', 'refund', 'payout', 'escrow_release', 'escrow_hold'];

const who = (u) => (u?.username ? `@${u.username}` : shortId(u));

export default function FinancePage() {
  const { role } = useAdminAuth();
  const tabs = TABS.filter((t) => t.key !== 'refunds' || canSee(role, 'finance'));
  const [tab, setTab]   = useState('withdrawals');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [type, setType]     = useState('');

  const switchTab = (key) => { setTab(key); setPage(1); };

  return (
    <div className="ad-stack-lg">
      <div className="ad-row-end">
        <ActionButton dialog={{
          title: 'Check payments with Flutterwave now?', confirmLabel: 'Run check',
          description: 'Looks for deposits, purchases and transfers that never reached us, and applies any that Flutterwave confirms. This also runs every 10 minutes.',
          onConfirm: () => runAction(() => api.post('/finance/reconcile')),
        }}>Check payments now</ActionButton>
      </div>
      <Card title="Finance" actions={
        <div className="ad-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
              className={`ad-tab${tab === t.key ? ' is-active' : ''}`} onClick={() => switchTab(t.key)}>{t.label}</button>
          ))}
        </div>
      }>
        {tab === 'withdrawals' && <Withdrawals page={page} setPage={setPage} status={status} setStatus={(s) => { setStatus(s); setPage(1); }} />}
        {tab === 'transactions' && <Transactions page={page} setPage={setPage} type={type} setType={(t) => { setType(t); setPage(1); }} />}
        {tab === 'deposits' && <Deposits page={page} setPage={setPage} />}
        {tab === 'escrow' && <Escrow />}
        {tab === 'revenue' && <Revenue />}
        {tab === 'refunds' && <Refunds role={role} />}
      </Card>
    </div>
  );
}

function Withdrawals({ page, setPage, status, setStatus }) {
  const { role } = useAdminAuth();
  const list = useApi('/finance/withdrawals', { page, limit: 20, status });

  const columns = [
    { key: 'createdAt', header: 'Requested', render: (w) => formatDate(w.createdAt) },
    { key: 'tipster', header: 'Tipster', render: (w) => who(w.tipster) },
    { key: 'amount', header: 'Amount', render: (w) => formatKobo(w.amount) },
    { key: 'bank', header: 'Bank', render: (w) => `${w.bankName} · ${w.accountNumber}` },
    { key: 'status', header: 'Status', render: (w) => <Badge value={w.status} /> },
    { key: 'actions', header: '', render: (w) => {
      if (w.status === 'pending') return (
        <span className="ad-row-actions">
          <ActionButton tone="primary" onDone={list.reload} dialog={{
            title: 'Approve withdrawal?', confirmLabel: 'Approve and send',
            description: `Sends ${formatKobo(w.amount)} to ${w.accountName} at ${w.bankName}.`,
            fields: [{ name: 'reason', label: 'Note', type: 'textarea' }],
            onConfirm: (v) => runAction(() => api.put(`/finance/withdrawals/${w._id}`, { action: 'approve', reason: v.reason })),
          }}>Approve</ActionButton>
          <ActionButton tone="danger" onDone={list.reload} dialog={{
            title: 'Reject withdrawal?', confirmLabel: 'Reject', danger: true,
            description: 'The amount is returned to the tipster\'s wallet.',
            fields: [{ name: 'reason', label: 'Reason sent to the tipster', type: 'textarea', required: true, minLength: 5 }],
            onConfirm: (v) => runAction(() => api.put(`/finance/withdrawals/${w._id}`, { action: 'reject', reason: v.reason })),
          }}>Reject</ActionButton>
        </span>
      );
      if (w.status === 'processing') return (
        <span className="ad-row-actions">
          <ActionButton onDone={list.reload} dialog={{
            title: 'Check this transfer with Flutterwave?', confirmLabel: 'Check status',
            description: 'Reads the real status from Flutterwave. Nothing changes unless Flutterwave confirms it.',
            onConfirm: () => runAction(() => api.put(`/finance/withdrawals/${w._id}/resolve-stuck`, { force: false })),
          }}>Check status</ActionButton>
          {isSuper(role) && (
            <ActionButton tone="danger" onDone={list.reload} dialog={{
              title: 'Force refund?', confirmLabel: 'Force refund', danger: true,
              description: 'Refunds the tipster now, even though the transfer may still complete on Flutterwave. If it does, the tipster is paid twice. Only use this after checking Flutterwave.',
              onConfirm: () => runAction(() => api.put(`/finance/withdrawals/${w._id}/resolve-stuck`, { force: true })),
            }}>Force refund</ActionButton>
          )}
        </span>
      );
      return <span className="ad-muted">—</span>;
    } },
  ];

  return (
    <>
      <div className="ad-tabs" role="tablist">
        {WITHDRAWAL_STATUSES.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s}
            className={`ad-tab${status === s ? ' is-active' : ''}`} onClick={() => setStatus(s)}>{label(s)}</button>
        ))}
      </div>
      <div className="ad-row-end">
        <ExportButton
          filename={`withdrawals-${status}`}
          load={() => fetchAllPages('/finance/withdrawals', { status }, 'withdrawals')}
          columns={[
            { header: 'Requested', value: (w) => w.createdAt },
            { header: 'Tipster', value: (w) => w.tipster?.username ?? w.tipster },
            { header: 'Amount (NGN)', value: (w) => (w.amount ?? 0) / 100 },
            { header: 'Bank', value: (w) => w.bankName },
            { header: 'Account number', value: (w) => w.accountNumber },
            { header: 'Account name', value: (w) => w.accountName },
            { header: 'Reference', value: (w) => w.reference },
            { header: 'Status', value: (w) => w.status },
            { header: 'Failure reason', value: (w) => w.failureReason },
          ]}
        />
      </div>
      <DataTable columns={columns} rows={list.data?.withdrawals} loading={list.loading} error={list.error} emptyText="No withdrawals in this state" />
      <Pager page={page} totalPages={list.data?.pagination?.totalPages} onPage={setPage} />
    </>
  );
}

function Transactions({ page, setPage, type, setType }) {
  const list = useApi('/finance/transactions', { page, limit: 50, type });
  return (
    <>
      <div className="ad-toolbar">
        <label className="ad-field">
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {TX_TYPES.map((t) => <option key={t} value={t}>{t ? label(t) : 'All types'}</option>)}
          </select>
        </label>
        <ExportButton
          filename={`transactions-${type || 'all'}`}
          load={() => fetchAllPages('/finance/transactions', { type }, 'transactions')}
          columns={[
            { header: 'Date', value: (t) => t.createdAt },
            { header: 'User', value: (t) => t.user?.username ?? t.user },
            { header: 'Type', value: (t) => t.type },
            { header: 'Amount (NGN)', value: (t) => t.amount },
            { header: 'Balance before (NGN)', value: (t) => t.balanceBefore },
            { header: 'Balance after (NGN)', value: (t) => t.balanceAfter },
            { header: 'Reference', value: (t) => t.reference },
          ]}
        />
      </div>
      <DataTable
        loading={list.loading}
        error={list.error}
        rows={list.data?.transactions}
        emptyText="No transactions"
        columns={[
          { key: 'createdAt', header: 'Date', render: (t) => formatDate(t.createdAt) },
          { key: 'user', header: 'User', render: (t) => who(t.user) },
          { key: 'type', header: 'Type', render: (t) => label(t.type) },
          { key: 'amount', header: 'Amount', render: (t) => formatNaira(t.amount) },
          { key: 'reference', header: 'Reference', render: (t) => <code className="ad-code">{t.reference}</code> },
        ]}
      />
      <Pager page={page} totalPages={list.data?.pagination?.totalPages} onPage={setPage} />
    </>
  );
}

function Deposits({ page, setPage }) {
  const list = useApi('/finance/deposits', { page, limit: 50 });
  return (
    <>
      <div className="ad-row-end">
        <ExportButton
          filename="deposits"
          load={() => fetchAllPages('/finance/deposits', {}, 'deposits')}
          columns={[
            { header: 'Date', value: (d) => d.createdAt },
            { header: 'User', value: (d) => d.user?.username ?? d.user },
            { header: 'Amount (NGN)', value: (d) => d.amount },
            { header: 'Reference', value: (d) => d.reference },
          ]}
        />
      </div>
      <DataTable
        loading={list.loading}
        error={list.error}
        rows={list.data?.deposits}
        emptyText="No successful deposits"
        columns={[
          { key: 'createdAt', header: 'Date', render: (d) => formatDate(d.createdAt) },
          { key: 'user', header: 'User', render: (d) => who(d.user) },
          { key: 'amount', header: 'Amount', render: (d) => formatNaira(d.amount) },
          { key: 'reference', header: 'Reference', render: (d) => <code className="ad-code">{d.reference}</code> },
        ]}
      />
      <Pager page={page} totalPages={list.data?.pagination?.totalPages} onPage={setPage} />
    </>
  );
}

function Escrow() {
  const list = useApi('/finance/escrow');
  return (
    <>
      {list.error && <Notice kind="error">{list.error}</Notice>}
      {list.data && <div className="ad-grid"><StatTile label="Total held in escrow" value={formatNaira(list.data.totalEscrow)} /></div>}
      <div className="ad-row-end">
        <ExportButton
          filename="escrow-balances"
          load={async () => list.data?.wallets ?? []}
          columns={[
            { header: 'Username', value: (w) => w.username ?? w.user },
            { header: 'Email', value: (w) => w.email },
            { header: 'In escrow (NGN)', value: (w) => w.escrowBalance },
            { header: 'Available (NGN)', value: (w) => w.balance },
          ]}
        />
      </div>
      <DataTable
        loading={list.loading}
        rows={list.data?.wallets}
        rowKey="user"
        emptyText="Nothing held in escrow"
        columns={[
          { key: 'user', header: 'Buyer', render: (w) => `@${w.username ?? w.user}` },
          { key: 'email', header: 'Email' },
          { key: 'escrowBalance', header: 'In escrow', render: (w) => formatNaira(w.escrowBalance) },
        ]}
      />
    </>
  );
}

function Revenue() {
  const [days, setDays] = useState(30);
  const data = useApi('/finance/revenue', { days });
  const daily = (data.data?.daily ?? []).slice();
  return (
    <>
      <div className="ad-toolbar">
        <label className="ad-field">
          <span>Window</span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[7, 30, 90, 365].map((d) => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </label>
        <ExportButton
          filename={`revenue-${days}-days`}
          load={async () => daily}
          columns={[
            { header: 'Day', value: (r) => r.date },
            { header: 'Purchases', value: (r) => r.purchases },
            { header: 'Revenue (NGN)', value: (r) => r.revenue },
          ]}
        />
      </div>
      {data.error && <Notice kind="error">{data.error}</Notice>}
      {data.data && (
        <div className="ad-grid">
          <StatTile label="Platform revenue (all time)" value={formatNaira(data.data.totalRevenue)} />
          <StatTile label="Purchases (all time)" value={formatNumber(data.data.totalPurchases)} />
        </div>
      )}
      <BarChart
        label={`Daily revenue, last ${days} days`}
        format={formatNaira}
        data={daily.map((d) => ({ label: d.date, value: d.revenue }))}
      />
      <DataTable
        loading={data.loading}
        rows={daily.slice().reverse()}
        rowKey="date"
        emptyText="No revenue in this window"
        columns={[
          { key: 'date', header: 'Day' },
          { key: 'purchases', header: 'Purchases', render: (r) => formatNumber(r.purchases) },
          { key: 'revenue', header: 'Revenue', render: (r) => formatNaira(r.revenue) },
        ]}
      />
    </>
  );
}

function Refunds({ role }) {
  const [purchaseId, setPurchaseId] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);
  const large = useApi('/super/refund/large', { status: 'pending' }, { enabled: isSuper(role) });

  const refundDialog = (endpoint, title, confirmLabel) => ({
    title, confirmLabel, danger: true,
    fields: [
      { name: 'purchaseId', label: 'Purchase ID', required: true, initial: purchaseId },
      { name: 'note', label: 'Reason (required)', type: 'textarea', required: true, minLength: 10, initial: note },
    ],
    onConfirm: (v) => runAction(() => api.post(endpoint, { purchaseId: v.purchaseId.trim(), note: v.note })),
  });

  return (
    <div className="ad-stack">
      {result && <Notice kind="info" onClose={() => setResult(null)}>{result}</Notice>}
      <p className="ad-muted">
        Refunds return the buyer's payment from escrow. Refunds above the large-refund limit need super admin approval.
      </p>
      <div className="ad-form-row">
        <label className="ad-field">
          <span>Purchase ID</span>
          <input value={purchaseId} onChange={(e) => setPurchaseId(e.target.value)} placeholder="24-character purchase ID" />
        </label>
        <label className="ad-field" style={{ flex: 1, minWidth: 220 }}>
          <span>Reason</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is this refund being issued?" />
        </label>
        <ActionButton tone="danger" onDone={() => setResult('Refund processed')} dialog={refundDialog('/finance/refund', 'Issue refund now?', 'Issue refund')}>
          Issue refund
        </ActionButton>
        <ActionButton onDone={() => { setResult('Sent for super admin approval'); large.reload(); }} dialog={refundDialog('/finance/refund/large', 'Request large refund approval?', 'Request approval')}>
          Request approval
        </ActionButton>
      </div>

      {isSuper(role) && (
        <>
          <h3 className="ad-subhead">Pending large refunds</h3>
          <div className="ad-row-end">
            <ExportButton
              filename="large-refunds-pending"
              load={async () => large.data?.requests ?? []}
              columns={[
                { header: 'Requested', value: (r) => r.createdAt },
                { header: 'Purchase', value: (r) => r.purchase?._id ?? r.purchase },
                { header: 'Amount (NGN)', value: (r) => (r.purchase?.amountPaid ?? 0) / 100 },
                { header: 'Requested by', value: (r) => r.requestedBy?.username ?? r.requestedBy },
                { header: 'Note', value: (r) => r.note },
              ]}
            />
          </div>
          <DataTable
            loading={large.loading}
            error={large.error}
            rows={large.data?.requests}
            emptyText="No large refunds waiting"
            columns={[
              { key: 'createdAt', header: 'Requested', render: (r) => formatDate(r.createdAt) },
              { key: 'purchase', header: 'Purchase', render: (r) => shortId(r.purchase?._id ?? r.purchase) },
              { key: 'amount', header: 'Amount', render: (r) => formatKobo(r.purchase?.amountPaid) },
              { key: 'requestedBy', header: 'Requested by', render: (r) => who(r.requestedBy) },
              { key: 'actions', header: '', render: (r) => (
                <ActionButton tone="danger" onDone={large.reload} dialog={{
                  title: 'Approve this refund?', confirmLabel: 'Approve refund', danger: true,
                  fields: [{ name: 'note', label: 'Approval note (required)', type: 'textarea', required: true, minLength: 10 }],
                  onConfirm: (v) => runAction(() => api.post('/super/refund', { purchaseId: r.purchase?._id ?? r.purchase, note: v.note })),
                }}>Approve</ActionButton>
              ) },
            ]}
          />
        </>
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

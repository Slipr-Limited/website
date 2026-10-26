import React from 'react';
import { useAdminAuth } from '../AuthContext';
import { useApi } from '../hooks';
import { canSee } from '../permissions';
import { Card, DataTable, ExportButton, Notice, StatTile, Badge } from '../components/ui';
import { BarChart } from '../components/Chart';
import { formatNaira, formatNumber } from '../format';

export default function OverviewPage() {
  const { role } = useAdminAuth();
  const stats    = useApi('/stats');
  const revenue  = useApi('/finance/revenue', { days: 30 }, { enabled: canSee(role, 'finance') });
  const security = useApi('/security/summary', { hours: 24 }, { enabled: canSee(role, 'security') });
  const health   = useApi('/security/health', {}, { enabled: canSee(role, 'security') });

  const s = stats.data;
  const tiles = s && [
    { label: 'Users', value: formatNumber(s.totalUsers), hint: `${formatNumber(s.totalTipsters)} tipsters` },
    { label: 'Active slips', value: formatNumber(s.activeListings), hint: `${formatNumber(s.totalListings)} total` },
    { label: 'Purchases', value: formatNumber(s.totalPurchases) },
    { label: 'Open disputes', value: formatNumber(s.openDisputes) },
    { label: 'Pending withdrawals', value: formatNumber(s.pendingWithdrawals) },
    { label: 'Banned users', value: formatNumber(s.bannedUsers) },
    { label: 'Flagged users', value: formatNumber(s.flaggedUsers) },
  ];

  return (
    <>
      {stats.error && <Notice kind="error">{stats.error}</Notice>}
      <div className="ad-grid">
        {tiles?.map((t) => <StatTile key={t.label} {...t} />)}
      </div>

      {canSee(role, 'finance') && (
        <Card title="Revenue (last 30 days)">
          {revenue.error ? <Notice kind="error">{revenue.error}</Notice> : (
            <>
              <div className="ad-grid">
                <StatTile label="Platform revenue" value={formatNaira(revenue.data?.totalRevenue)} />
                <StatTile label="Purchases" value={formatNumber(revenue.data?.totalPurchases)} />
              </div>
              <BarChart
                label="Daily revenue, last 30 days"
                format={formatNaira}
                data={(revenue.data?.daily ?? []).map((d) => ({ label: d.date, value: d.revenue }))}
              />
              <div className="ad-row-end">
                <ExportButton
                  filename="revenue-30-days"
                  load={async () => revenue.data?.daily ?? []}
                  columns={[
                    { header: 'Day', value: (r) => r.date },
                    { header: 'Purchases', value: (r) => r.purchases },
                    { header: 'Revenue (NGN)', value: (r) => r.revenue },
                  ]}
                />
              </div>
              <DataTable
                loading={revenue.loading}
                rows={(revenue.data?.daily ?? []).slice(-14).reverse()}
                rowKey="date"
                columns={[
                  { key: 'date', header: 'Day' },
                  { key: 'revenue', header: 'Revenue', render: (r) => formatNaira(r.revenue) },
                ]}
              />
            </>
          )}
        </Card>
      )}

      {canSee(role, 'security') && (
        <div className="ad-grid ad-grid--two">
          <Card title="Server health">
            {health.error ? <Notice kind="error">{health.error}</Notice> : health.data && (
              <dl className="ad-kv">
                <dt>Uptime</dt><dd>{Math.round((health.data.uptimeSeconds ?? 0) / 60)} min</dd>
                <dt>Database</dt><dd><Badge value={health.data.mongoStatus === 'connected' ? 'active' : 'failed'} /> {health.data.mongoStatus}</dd>
                <dt>Redis</dt><dd>{health.data.redisStatus}</dd>
              </dl>
            )}
          </Card>
          <Card title="Security (last 24 h)">
            {security.error ? <Notice kind="error">{security.error}</Notice> : security.data && (
              <dl className="ad-kv">
                <dt>Security events</dt><dd>{formatNumber(security.data.totalEvents)}</dd>
                <dt>Blocked IPs</dt><dd>{formatNumber(security.data.blockedIPCount)}</dd>
                <dt>Failed admin sign-ins</dt><dd>{formatNumber(security.data.counts?.failed_admin_login)}</dd>
                <dt>Failed user sign-ins</dt><dd>{formatNumber(security.data.counts?.failed_login)}</dd>
              </dl>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

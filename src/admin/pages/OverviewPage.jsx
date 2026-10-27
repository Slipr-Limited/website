import React from 'react';
import { useAdminAuth } from '../AuthContext';
import { useApi } from '../hooks';
import { canSee } from '../permissions';
import { Card, DataTable, ExportButton, Notice, StatGrid, StatTile, PageHero, Badge } from '../components/ui';
import { BarChart } from '../components/Chart';
import { formatNaira, formatNumber } from '../format';

export default function OverviewPage() {
  const { role, user } = useAdminAuth();
  const stats    = useApi('/stats');
  const revenue  = useApi('/finance/revenue', { days: 30 }, { enabled: canSee(role, 'finance') });
  const security = useApi('/security/summary', { hours: 24 }, { enabled: canSee(role, 'security') });
  const health   = useApi('/security/health', {}, { enabled: canSee(role, 'security') });

  const s = stats.data;
  const daily = revenue.data?.daily ?? [];
  const uptimeMinutes = Math.round((health.data?.uptimeSeconds ?? 0) / 60);

  return (
    <>
      <PageHero
        title={`Welcome, @${user?.username ?? 'admin'}`}
        text={`Signed in as ${role?.replace('_', ' ') ?? 'admin'}.`}
      >
        <span>{health.data ? `Server up ${uptimeMinutes} min` : 'Checking server'}</span>
        <span>{health.data?.mongoStatus === 'connected' ? 'Database connected' : ''}</span>
      </PageHero>

      {stats.error && <Notice kind="error">{stats.error}</Notice>}

      {s && (
        <StatGrid cols={4}>
          <StatTile label="Users" value={formatNumber(s.totalUsers)} hint={`${formatNumber(s.totalTipsters)} tipsters`} />
          <StatTile label="Slips posted" value={formatNumber(s.totalListings)} hint="All time" />
          <StatTile label="Live slips" value={formatNumber(s.activeListings)} hint="Open for purchase" />
          <StatTile label="Purchases" value={formatNumber(s.totalPurchases)} hint="All time" />
          <StatTile label="Open disputes" value={formatNumber(s.openDisputes)} hint="Waiting for a ruling" />
          <StatTile label="Pending withdrawals" value={formatNumber(s.pendingWithdrawals)} hint="Awaiting approval" />
          <StatTile label="Banned" value={formatNumber(s.bannedUsers)} hint="Currently suspended" />
          <StatTile label="Flagged" value={formatNumber(s.flaggedUsers)} hint="Needs review" />
        </StatGrid>
      )}

      {canSee(role, 'finance') && (
        <div className="ad-split">
          <Card
            title="Revenue"
            subtitle="Daily platform revenue, last 30 days"
            actions={
              <ExportButton
                filename="revenue-30-days"
                load={async () => daily}
                columns={[
                  { header: 'Day', value: (r) => r.date },
                  { header: 'Purchases', value: (r) => r.purchases },
                  { header: 'Revenue (NGN)', value: (r) => r.revenue },
                ]}
              />
            }
          >
            {revenue.error ? <Notice kind="error">{revenue.error}</Notice> : (
              <>
                <dl className="ad-kv" style={{ maxWidth: 420 }}>
                  <dt>All-time revenue</dt><dd>{revenue.data ? formatNaira(revenue.data.totalRevenue) : '—'}</dd>
                  <dt>Purchases</dt><dd>{revenue.data ? formatNumber(revenue.data.totalPurchases) : '—'}</dd>
                </dl>
                <BarChart label="Daily revenue" format={formatNaira} data={daily.map((d) => ({ label: d.date, value: d.revenue }))} />
              </>
            )}
          </Card>

          <Card title="Latest days" subtitle="Most recent first">
            <DataTable
              loading={revenue.loading}
              rows={daily.slice().reverse().slice(0, 10)}
              rowKey="date"
              emptyText="No sales in this window"
              columns={[
                { key: 'date', header: 'Day' },
                { key: 'purchases', header: 'Sales', render: (r) => formatNumber(r.purchases) },
                { key: 'revenue', header: 'Revenue', render: (r) => formatNaira(r.revenue) },
              ]}
            />
          </Card>
        </div>
      )}

      {canSee(role, 'security') && (
        <div className="ad-grid ad-grid--two">
          <Card title="Server">
            {health.error ? <Notice kind="error">{health.error}</Notice> : health.data && (
              <dl className="ad-kv">
                <dt>Database</dt><dd><Badge value={health.data.mongoStatus === 'connected' ? 'active' : 'failed'} /></dd>
                <dt>Cache</dt><dd><Badge value={health.data.redisStatus === 'ready' ? 'active' : 'muted'} /> <span className="ad-muted ad-small">{health.data.redisStatus}</span></dd>
                <dt>Uptime</dt><dd>{uptimeMinutes} minutes</dd>
              </dl>
            )}
          </Card>

          <Card title="Security" subtitle="Last 24 hours">
            {security.error ? <Notice kind="error">{security.error}</Notice> : security.data && (
              <dl className="ad-kv">
                <dt>Events</dt><dd>{formatNumber(security.data.totalEvents)}</dd>
                <dt>Failed admin sign-ins</dt><dd>{formatNumber(security.data.counts?.failed_admin_login)}</dd>
                <dt>Failed user sign-ins</dt><dd>{formatNumber(security.data.counts?.failed_login)}</dd>
                <dt>Blocked addresses</dt><dd>{formatNumber(security.data.blockedIPCount)}</dd>
              </dl>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

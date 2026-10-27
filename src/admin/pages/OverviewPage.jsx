import React from 'react';
import { motion } from 'framer-motion';
import { Users, Ticket, ShoppingBag, Scale, Wallet, Ban, Flag, Server, ShieldAlert, Database, Activity } from 'lucide-react';
import { useAdminAuth } from '../AuthContext';
import { useApi } from '../hooks';
import { canSee } from '../permissions';
import { Card, DataTable, ExportButton, Notice, StatGrid, PageHero, Badge } from '../components/ui';
import { BarChart } from '../components/Chart';
import { CountUp, Ring, Sparkline, LiveDot, Reveal, staggerItem } from '../motion';
import { formatNaira, formatNumber } from '../format';

function Hero({ name, role, live, stats }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <PageHero title={`${greeting}, @${name ?? 'admin'}`} text={`Signed in as ${role}. Here's how Slipr is doing.`}>
      {stats && (
        <>
          <div>
            <strong><CountUp value={stats.totalUsers} /></strong>
            <span>Users</span>
          </div>
          <div>
            <strong><CountUp value={stats.activeListings} /></strong>
            <span>Live slips</span>
          </div>
          <div>
            <strong><CountUp value={stats.openDisputes} /></strong>
            <span>Open disputes</span>
          </div>
          <div>
            <strong><LiveDot tone={live ? 'good' : 'bad'} /> {live ? 'Live' : 'Offline'}</strong>
            <span>Platform status</span>
          </div>
        </>
      )}
    </PageHero>
  );
}

export default function OverviewPage() {
  const { role, user } = useAdminAuth();
  const stats    = useApi('/stats');
  const revenue  = useApi('/finance/revenue', { days: 30 }, { enabled: canSee(role, 'finance') });
  const security = useApi('/security/summary', { hours: 24 }, { enabled: canSee(role, 'security') });
  const health   = useApi('/security/health', {}, { enabled: canSee(role, 'security') });

  const s = stats.data;
  const daily = revenue.data?.daily ?? [];
  const revenueSeries = daily.map((d) => d.revenue);
  const purchaseSeries = daily.map((d) => d.purchases);

  const kpis = s && [
    { label: 'Users', value: s.totalUsers, hint: `${formatNumber(s.totalTipsters)} tipsters`, icon: Users },
    { label: 'Slips', value: s.totalListings, hint: 'Posted to date', icon: Ticket },
    { label: 'Live slips', value: s.activeListings, hint: 'Open for purchase now', icon: Activity },
    { label: 'Purchases', value: s.totalPurchases, hint: 'All time', icon: ShoppingBag, series: purchaseSeries },
    { label: 'Open disputes', value: s.openDisputes, hint: 'Waiting for a ruling', icon: Scale },
    { label: 'Pending withdrawals', value: s.pendingWithdrawals, hint: 'Awaiting approval', icon: Wallet },
    { label: 'Banned users', value: s.bannedUsers, hint: 'Currently suspended', icon: Ban },
    { label: 'Flagged users', value: s.flaggedUsers, hint: 'Needs a review', icon: Flag },
  ];

  const uptimeMinutes = Math.round((health.data?.uptimeSeconds ?? 0) / 60);
  const failedAdmin = security.data?.counts?.failed_admin_login ?? 0;
  const failedUser  = security.data?.counts?.failed_login ?? 0;
  const threat = Math.min(100, (security.data?.totalEvents ?? 0) / 5);

  return (
    <>
      <Hero name={user?.username} role={role?.replace('_', ' ')} live={Boolean(health.data)} stats={s} />

      {stats.error && <Notice kind="error">{stats.error}</Notice>}

      {kpis && (
        <StatGrid cols={4}>
          {kpis.map((k) => (
            <motion.div key={k.label} variants={staggerItem} className="ad-stat">
              <div className="ad-row-end" style={{ justifyContent: 'space-between' }}>
                <span className="ad-stat__icon"><k.icon size={18} aria-hidden="true" /></span>
              </div>
              <span className="ad-stat__label">{k.label}</span>
              <strong className="ad-stat__value"><CountUp value={k.value} /></strong>
              <span className="ad-stat__hint">{k.hint}</span>
              {k.series && <Sparkline values={k.series} />}
            </motion.div>
          ))}
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
                <div className="ad-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
                  <div>
                    <span className="ad-muted ad-small">All-time revenue</span>
                    <div className="ad-stat__value" style={{ fontSize: 26 }}>
                      {revenue.data ? formatNaira(revenue.data.totalRevenue) : '—'}
                    </div>
                  </div>
                  <div>
                    <span className="ad-muted ad-small">Purchases (all time)</span>
                    <div className="ad-stat__value" style={{ fontSize: 26 }}>
                      {revenue.data ? <CountUp value={revenue.data.totalPurchases} /> : '—'}
                    </div>
                  </div>
                </div>
                <BarChart label="Daily revenue, last 30 days" format={formatNaira} data={daily.map((d) => ({ label: d.date, value: d.revenue }))} />
                {revenueSeries.length > 1 && <Sparkline values={revenueSeries} color="var(--ad-gold)" height={36} />}
              </>
            )}
          </Card>

          <Card title="Latest days" subtitle="Most recent first">
            <DataTable
              loading={revenue.loading}
              rows={daily.slice().reverse().slice(0, 10)}
              rowKey="date"
              emptyText="No revenue in this window"
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
        <Reveal>
          <div className="ad-grid ad-grid--two">
            <Card title="Server health" subtitle="Live status of the API, database and cache">
              {health.error ? <Notice kind="error">{health.error}</Notice> : health.data && (
                <div className="ad-row-end" style={{ justifyContent: 'space-around', gap: 18 }}>
                  <Ring percent={health.data.mongoStatus === 'connected' ? 100 : 15} label="Database" color="var(--ad-good)" />
                  <div className="ad-stack" style={{ gap: 12 }}>
                    <div className="ad-row-end" style={{ justifyContent: 'flex-start' }}><Database size={16} /> Database <Badge value={health.data.mongoStatus === 'connected' ? 'active' : 'failed'} /></div>
                    <div className="ad-row-end" style={{ justifyContent: 'flex-start' }}><Server size={16} /> Uptime <strong>{uptimeMinutes} min</strong></div>
                    <div className="ad-row-end" style={{ justifyContent: 'flex-start' }}><Server size={16} /> Cache <Badge value={health.data.redisStatus === 'ready' ? 'active' : 'muted'} /></div>
                  </div>
                </div>
              )}
            </Card>

            <Card title="Security" subtitle="Last 24 hours">
              {security.error ? <Notice kind="error">{security.error}</Notice> : security.data && (
                <div className="ad-row-end" style={{ justifyContent: 'space-around', gap: 18 }}>
                  <Ring percent={threat} label="Threat level" color={threat > 60 ? 'var(--ad-bad)' : threat > 25 ? 'var(--ad-warn)' : 'var(--ad-good)'} />
                  <div className="ad-stack" style={{ gap: 12 }}>
                    <div className="ad-row-end" style={{ justifyContent: 'flex-start' }}><ShieldAlert size={16} /> Events <strong><CountUp value={security.data.totalEvents ?? 0} /></strong></div>
                    <div className="ad-row-end" style={{ justifyContent: 'flex-start' }}><ShieldAlert size={16} /> Failed admin sign-ins <strong><CountUp value={failedAdmin} /></strong></div>
                    <div className="ad-row-end" style={{ justifyContent: 'flex-start' }}><ShieldAlert size={16} /> Failed user sign-ins <strong><CountUp value={failedUser} /></strong></div>
                    <div className="ad-row-end" style={{ justifyContent: 'flex-start' }}><Ban size={16} /> Blocked addresses <strong><CountUp value={security.data.blockedIPCount ?? 0} /></strong></div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </Reveal>
      )}
    </>
  );
}

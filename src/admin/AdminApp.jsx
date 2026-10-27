/**
 * admin/AdminApp.jsx — Routes and the signed-in shell for /admin. Mounted by src/App.jsx
 * for any /admin path, so the marketing navbar and footer never load here.
 *
 * Route tree (absolute paths throughout, so every URL is explicit):
 *   /admin/login                  → sign-in (public)
 *   everything else under /admin  → signed-in only → Shell → one route per section,
 *                                   each wrapped in a role check
 */

import React, { useEffect } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Ticket, Scale, Wallet, LifeBuoy, ShieldAlert, UserCog, ScrollText, Settings, LogOut, ShieldCheck,
} from 'lucide-react';
import { AdminAuthProvider, useAdminAuth } from './AuthContext';
import { SECTIONS, ROLE_LABELS, canSee } from './permissions';
import { Forbidden, Spinner, ToastProvider } from './components/ui';
import { Ring } from './motion';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import UsersPage from './pages/UsersPage';
import ListingsPage from './pages/ListingsPage';
import DisputesPage from './pages/DisputesPage';
import FinancePage from './pages/FinancePage';
import SupportPage from './pages/SupportPage';
import SecurityPage from './pages/SecurityPage';
import AdminsPage from './pages/AdminsPage';
import SettingsPage from './pages/SettingsPage';
import AuditPage from './pages/AuditPage';
import './admin.css';

const PAGES = {
  overview: OverviewPage,
  users: UsersPage,
  listings: ListingsPage,
  disputes: DisputesPage,
  finance: FinancePage,
  support: SupportPage,
  security: SecurityPage,
  admins: AdminsPage,
  audit: AuditPage,
  settings: SettingsPage,
};

const ICONS = {
  overview: LayoutDashboard,
  users: Users,
  listings: Ticket,
  disputes: Scale,
  finance: Wallet,
  support: LifeBuoy,
  security: ShieldAlert,
  admins: UserCog,
  audit: ScrollText,
  settings: Settings,
};

const DESCRIPTIONS = {
  overview: 'Platform health, revenue and activity at a glance',
  users: 'Find, moderate and verify accounts',
  listings: 'Slips, boosts and blue-tick subscriptions',
  disputes: 'Rule on escrow disputes and pending outcomes',
  finance: 'Withdrawals, transactions, deposits, escrow and refunds',
  support: 'Complaints, KYC review and comment moderation',
  security: 'Threat monitoring, sign-in failures and blocked addresses',
  admins: 'Create and manage admin roles',
  audit: 'Every admin change and sign-in, for one year',
  settings: 'Fees, limits, windows and maintenance mode',
};

const GREETING = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const initials = (name = '') => name.replace(/^@/, '').slice(0, 2).toUpperCase() || 'AD';

function FullScreenLoader() {
  return (
    <div className="ad-fullscreen">
      <div className="ad-row-end" style={{ flexDirection: 'column', gap: 16 }}>
        <Ring percent={70} size={64} label="Loading" />
        <span className="ad-muted ad-small">Loading the admin console…</span>
      </div>
    </div>
  );
}

/** Sends signed-out users to the login page, remembering where they were going. */
function RequireSignedIn() {
  const { status } = useAdminAuth();
  const location = useLocation();
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'signedOut') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

function RoleGate({ section, children }) {
  const { role } = useAdminAuth();
  if (!canSee(role, section)) return <Forbidden />;
  return children;
}

/** Signed-in layout: animated sidebar, glass top bar and the current page. */
function Shell() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = 'Slipr Admin';
  }, []);

  const visible = Object.entries(SECTIONS).filter(([key]) => canSee(user?.adminRole, key));
  const currentKey = visible.find(([, s]) => s.path === location.pathname)?.[0] ?? 'overview';
  const current = SECTIONS[currentKey];
  const roleLabel = ROLE_LABELS[user?.adminRole] ?? user?.adminRole;

  return (
    <div className="ad-shell">
      <aside className="ad-sidebar" aria-label="Admin navigation">
        <div className="ad-sidebar__head">
          <p className="ad-brand">
            <span className="ad-logo" aria-hidden="true"><ShieldCheck size={18} /></span>
            <span>Slipr <span>Admin</span></span>
          </p>
        </div>
        <nav>
          {visible.map(([key, s]) => {
            const Icon = ICONS[key];
            return (
              <NavLink key={key} to={s.path} end={s.path === '/admin'} className={({ isActive }) => `ad-nav${isActive ? ' is-active' : ''}`}>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="ad-nav-pill"
                        className="ad-nav__pill"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      >
                        <span className="ad-nav__bar" />
                      </motion.span>
                    )}
                    <Icon size={18} aria-hidden="true" />
                    <span>{s.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="ad-sidebar__foot">
          <div className="ad-row-end" style={{ justifyContent: 'flex-start', gap: 8, marginBottom: 6 }}>
            <span className="ad-livedot ad-livedot--good" />
            <span>Secure session</span>
          </div>
          Signs out after 15 minutes of inactivity.
        </div>
      </aside>

      <div className="ad-main">
        <header className="ad-topbar">
          <div className="ad-topbar__title">
            <h1>{current?.label ?? 'Admin'}</h1>
            <div className="ad-topbar__sub">{DESCRIPTIONS[currentKey]}</div>
          </div>
          <div className="ad-topbar__right">
            <div className="ad-who">
              <span className="ad-avatar" aria-hidden="true">{initials(user?.username)}</span>
              <span className="ad-who__text">
                <span className="ad-who__name">@{user?.username}</span>
                <span className="ad-who__role" style={{ display: 'block' }}>{roleLabel}</span>
              </span>
            </div>
            <button
              type="button"
              className="ad-btn ad-btn--ghost ad-btn--sm"
              onClick={async () => { await logout(); navigate('/admin/login', { replace: true }); }}
            >
              <LogOut size={15} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </header>
        <div className="ad-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="ad-stack-lg"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function AdminApp() {
  return (
    <MotionConfig reducedMotion="user">
      <AdminAuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/admin/login" element={<LoginPage />} />
            <Route element={<RequireSignedIn />}>
              <Route element={<Shell />}>
                {Object.entries(SECTIONS).map(([key, s]) => {
                  const Page = PAGES[key];
                  return (
                    <Route key={key} path={s.path} element={<RoleGate section={key}><Page /></RoleGate>} />
                  );
                })}
                <Route path="/admin/*" element={<Forbidden />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </ToastProvider>
      </AdminAuthProvider>
    </MotionConfig>
  );
}

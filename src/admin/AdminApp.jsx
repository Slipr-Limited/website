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
import { AdminAuthProvider, useAdminAuth } from './AuthContext';
import { SECTIONS, ROLE_LABELS, canSee } from './permissions';
import { Forbidden, Spinner, ToastProvider } from './components/ui';
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

const DESCRIPTIONS = {
  overview: 'Platform figures, revenue and recent activity.',
  users: 'Find, moderate and verify accounts.',
  listings: 'Slips, boosts and blue-tick subscriptions.',
  disputes: 'Escrow disputes and purchases awaiting an outcome.',
  finance: 'Withdrawals, transactions, deposits, escrow and refunds.',
  support: 'Complaints, KYC review and comment moderation.',
  security: 'Sign-in failures, rate limits and blocked addresses.',
  admins: 'Create admin accounts and manage their roles.',
  audit: 'Every admin change and sign-in, kept for one year.',
  settings: 'Fees, limits, windows and maintenance mode.',
};

const initials = (name = '') => name.replace(/^@/, '').slice(0, 2).toUpperCase() || 'AD';
const today = () => new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function FullScreenLoader() {
  return (
    <div className="ad-fullscreen">
      <span className="ad-muted ad-small"><Spinner /> &nbsp;Loading the console</span>
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

/** Signed-in layout: a numbered index on the left, the section heading on top. */
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
          <p className="ad-brand" style={{ margin: 0 }}>Slipr<br /><span className="ad-muted" style={{ fontSize: 13, fontWeight: 400 }}>Admin console</span></p>
        </div>
        <nav>
          {visible.map(([key, s], i) => (
            <NavLink key={key} to={s.path} end={s.path === '/admin'} className={({ isActive }) => `ad-nav${isActive ? ' is-active' : ''}`}>
              <span className="ad-nav__num">{String(i + 1).padStart(2, '0')}</span>
              <span>{s.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="ad-sidebar__foot">
          Signs out after 15 minutes without activity.
        </div>
      </aside>

      <div className="ad-main">
        <header className="ad-topbar">
          <div className="ad-topbar__title">
            <div className="ad-muted ad-small" style={{ fontFamily: 'var(--ad-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{today()}</div>
            <h1>{current?.label ?? 'Admin'}</h1>
            <div className="ad-topbar__sub">{DESCRIPTIONS[currentKey]}</div>
          </div>
          <div className="ad-topbar__right">
            <div className="ad-who">
              <span className="ad-avatar" aria-hidden="true">{initials(user?.username)}</span>
              <span className="ad-who__text">
                <span className="ad-who__name">@{user?.username}</span>
                <span className="ad-who__role">{roleLabel}</span>
              </span>
            </div>
            <button
              type="button"
              className="ad-btn ad-btn--ghost ad-btn--sm"
              onClick={async () => { await logout(); navigate('/admin/login', { replace: true }); }}
            >
              Sign out
            </button>
          </div>
        </header>
        <div className="ad-content">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              className="ad-stack-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
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

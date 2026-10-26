/**
 * admin/AdminApp.jsx — Routes for /admin. Mounted by src/App.jsx for any /admin path,
 * so the marketing navbar, footer and page transitions never load here.
 *
 * Route tree (absolute paths throughout, so every URL is explicit):
 *   /admin/login                  → sign-in (public)
 *   everything else under /admin  → signed-in only → Shell → one route per section,
 *                                   each wrapped in a role check
 */

import React, { useEffect } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './AuthContext';
import { SECTIONS, ROLE_LABELS, canSee } from './permissions';
import { Forbidden, Spinner } from './components/ui';
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

function FullScreenLoader() {
  return <div className="ad-fullscreen"><Spinner /></div>;
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

/** Signed-in layout: sidebar, top bar and the current page in the outlet. */
function Shell() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = 'Slipr Admin';
  }, []);

  const visible = Object.entries(SECTIONS).filter(([key]) => canSee(user?.adminRole, key));
  const current = visible.find(([, s]) => s.path === location.pathname)?.[0] ?? 'overview';

  return (
    <div className="ad-shell">
      <aside className="ad-sidebar" aria-label="Admin navigation">
        <p className="ad-brand">Slipr <span>Admin</span></p>
        <nav>
          {visible.map(([key, s]) => (
            <NavLink key={key} to={s.path} end={s.path === '/admin'} className={({ isActive }) => `ad-nav${isActive ? ' is-active' : ''}`}>
              {s.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="ad-main">
        <header className="ad-topbar">
          <div>
            <strong>{SECTIONS[current]?.label ?? 'Admin'}</strong>
            <span className="ad-muted ad-topbar__who">
              {user?.username} · {ROLE_LABELS[user?.adminRole] ?? user?.adminRole}
            </span>
          </div>
          <button
            type="button"
            className="ad-btn ad-btn--ghost ad-btn--sm"
            onClick={async () => { await logout(); navigate('/admin/login', { replace: true }); }}
          >
            Sign out
          </button>
        </header>
        <div className="ad-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
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
    </AdminAuthProvider>
  );
}

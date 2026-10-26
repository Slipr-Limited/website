/**
 * admin/permissions.js — Which admin roles see which section.
 *
 * These mirror the server-side checks in Backend/src/routes/admin.routes.js. The
 * server is the real gate; this only hides screens an admin couldn't use anyway.
 */

export const ROLES = {
  SUPER: 'super_admin',
  FINANCE: 'finance_admin',
  SUPPORT: 'support_admin',
  ESCROW: 'escrow_admin',
};

export const ROLE_LABELS = {
  super_admin: 'Super admin',
  finance_admin: 'Finance',
  support_admin: 'Support',
  escrow_admin: 'Escrow',
};

const { SUPER, FINANCE, SUPPORT, ESCROW } = ROLES;
const ALL = Object.values(ROLES);

export const SECTIONS = {
  overview: { label: 'Overview',  path: '/admin',          roles: ALL },
  users:    { label: 'Users',     path: '/admin/users',    roles: [SUPER, SUPPORT] },
  listings: { label: 'Slips',     path: '/admin/listings', roles: ALL },
  disputes: { label: 'Disputes',  path: '/admin/disputes', roles: [SUPER, ESCROW] },
  finance:  { label: 'Finance',   path: '/admin/finance',  roles: [SUPER, FINANCE] },
  support:  { label: 'Support',   path: '/admin/support',  roles: [SUPER, SUPPORT] },
  security: { label: 'Security',  path: '/admin/security', roles: [SUPER] },
  admins:   { label: 'Admins',    path: '/admin/admins',   roles: [SUPER] },
  audit:    { label: 'Audit log', path: '/admin/audit',    roles: [SUPER] },
  settings: { label: 'Settings',  path: '/admin/settings', roles: [SUPER] },
};

export const canSee = (role, section) => SECTIONS[section].roles.includes(role);

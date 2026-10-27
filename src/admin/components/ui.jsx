/**
 * admin/components/ui.jsx — Shared admin UI primitives.
 * Every component keeps the same props it had before, so pages didn't change;
 * only how they look and move did.
 */

import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertTriangle, Info, Download } from 'lucide-react';
import { label as humanise } from '../format';
import { downloadCsv, MAX_EXPORT_ROWS, toCsv } from '../export';
import { errorMessage } from '../api';
import { CountUp, Sparkline, stagger, staggerItem } from '../motion';

// ── Toasts ────────────────────────────────────────────────────────────────────

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, kind = 'info') => {
    if (!message) return;
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list.slice(-3), { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4200);
  }, []);
  const dismiss = (id) => setToasts((list) => list.filter((t) => t.id !== id));
  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ad-toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={`ad-toast ad-toast--${t.kind}`}
              role={t.kind === 'error' ? 'alert' : 'status'}
            >
              <span className="ad-toast__dot" aria-hidden="true" />
              <span>{t.message}</span>
              <button type="button" className="ad-toast__close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ── Basics ────────────────────────────────────────────────────────────────────

export function Spinner() {
  return <span className="ad-spinner" role="status" aria-label="Loading" />;
}

/** Shimmering placeholder rows shown while a table loads. */
export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="ad-stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="ad-skeleton" style={{ height: 44, opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

export function Notice({ kind = 'info', children, onClose }) {
  if (!children) return null;
  const Icon = kind === 'error' ? AlertTriangle : Info;
  return (
    <motion.div
      className={`ad-notice ad-notice--${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <span className="ad-row-end" style={{ justifyContent: 'flex-start', gap: 10 }}>
        <Icon size={16} aria-hidden="true" />
        <span>{children}</span>
      </span>
      {onClose && <button type="button" className="ad-link" onClick={onClose} aria-label="Dismiss"><X size={14} /></button>}
    </motion.div>
  );
}

const BADGE_TONES = {
  active: 'good', approved: 'good', success: 'good', won: 'good', resolved: 'good', verified: 'good',
  pending: 'warn', under_review: 'warn', processing: 'warn', outcome_pending: 'warn', open: 'warn',
  flagged: 'warn', escalated: 'warn', rejected: 'bad', failed: 'bad', lost: 'bad', banned: 'bad',
  dismissed: 'muted', cancelled: 'muted', refunded: 'muted', expired: 'muted', inactive: 'muted',
};

export function Badge({ value, tone }) {
  const t = tone ?? BADGE_TONES[value] ?? 'muted';
  return <span className={`ad-badge ad-badge--${t}`}>{humanise(value) || '—'}</span>;
}

/** A panel. Fades in when it mounts. */
export function Card({ title, subtitle, actions, children, className = '' }) {
  return (
    <motion.section
      className={`ad-card ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {(title || actions) && (
        <header className="ad-card__head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="ad-muted ad-small" style={{ margin: '4px 0 0' }}>{subtitle}</p>}
          </div>
          {actions && <div className="ad-card__actions">{actions}</div>}
        </header>
      )}
      {children}
    </motion.section>
  );
}

/** Headline number with an icon, a count-up animation and an optional sparkline. */
export function StatTile({ label: text, value, hint, icon: Icon, trend }) {
  const numeric = typeof value === 'number' ? value : null;
  return (
    <motion.div className="ad-stat" variants={staggerItem}>
      <div className="ad-row-end" style={{ justifyContent: 'space-between' }}>
        {Icon ? <span className="ad-stat__icon"><Icon size={18} aria-hidden="true" /></span> : <span />}
        {trend && <span className="ad-muted ad-small">{trend}</span>}
      </div>
      <span className="ad-stat__label">{text}</span>
      <strong className="ad-stat__value">
        {numeric !== null ? <CountUp value={numeric} /> : value}
      </strong>
      {hint && <span className="ad-stat__hint">{hint}</span>}
    </motion.div>
  );
}

/** A grid whose children appear one after another. */
export function StatGrid({ children, two = false, cols }) {
  return (
    <motion.div
      className={`ad-grid${two ? ' ad-grid--two' : ''}`}
      data-cols={cols}
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function PageHero({ title, text, children }) {
  return (
    <motion.div
      className="ad-page-hero"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      {children && <div className="ad-hero-stat">{children}</div>}
    </motion.div>
  );
}

export { Sparkline };

export function Forbidden() {
  return (
    <Card title="Not allowed">
      <p className="ad-muted">Your role doesn't include this section. Ask a super admin if you need access.</p>
    </Card>
  );
}

export function Pager({ page, totalPages, onPage }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <nav className="ad-pager" aria-label="Pagination">
      <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span>Page {page} of {totalPages}</span>
      <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}

/**
 * Table with loading, error and empty states.
 * columns: [{ key, header, render?(row) }]
 */
export function DataTable({ columns, rows, loading, error, emptyText = 'Nothing here yet', rowKey = '_id' }) {
  if (error) return <Notice kind="error">{error}</Notice>;
  if (loading && !rows?.length) return <SkeletonRows />;
  if (!rows?.length) {
    return (
      <motion.div className="ad-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className="ad-muted" style={{ margin: 0 }}>{emptyText}</p>
      </motion.div>
    );
  }
  return (
    <div className="ad-table-wrap">
      <table className="ad-table">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} scope="col">{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row[rowKey] ?? i}>
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : row[c.key] ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Dialog ────────────────────────────────────────────────────────────────────

/**
 * Confirmation dialog that can collect a reason or note.
 * fields: [{ name, label, type: 'text' | 'textarea' | 'select' | 'password' | 'email', options?, required?, minLength?, initial? }]
 * onConfirm(values) returns { ok, message }. The dialog stays open on failure.
 */
export function ConfirmDialog({ open, title, description, fields = [], confirmLabel = 'Confirm', danger = false, onConfirm, onClose }) {
  const [values, setValues] = useState({});
  const [error, setError]   = useState(null);
  const [busy, setBusy]     = useState(false);
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const initial = {};
    fields.forEach((f) => { initial[f.name] = f.initial ?? (f.type === 'select' ? f.options?.[0]?.value ?? '' : ''); });
    setValues(initial);
    setError(null);
    setBusy(false);
    const focusable = ref.current?.querySelector('input,textarea,select');
    focusable?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const validate = () => {
    for (const f of fields) {
      const v = String(values[f.name] ?? '').trim();
      if (f.required && !v) return `${f.label} is required`;
      if (f.minLength && v.length < f.minLength) return `${f.label} must be at least ${f.minLength} characters`;
    }
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError(null);
    const result = await onConfirm(values);
    setBusy(false);
    if (result?.ok) onClose(result.message);
    else setError(result?.message ?? 'Something went wrong');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          className="ad-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
        >
          <motion.form
            ref={ref}
            className="ad-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onSubmit={submit}
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <h3 id={titleId}>{title}</h3>
            {description && <p className="ad-muted" style={{ margin: 0 }}>{description}</p>}
            {fields.map((f, i) => (
              <motion.label
                key={f.name}
                className="ad-field"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
              >
                <span>{f.label}{f.required ? ' *' : ''}</span>
                {f.type === 'textarea' ? (
                  <textarea rows={3} value={values[f.name] ?? ''} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
                ) : f.type === 'select' ? (
                  <select value={values[f.name] ?? ''} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}>
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type={f.type ?? 'text'} value={values[f.name] ?? ''} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
                )}
              </motion.label>
            ))}
            {error && <Notice kind="error">{error}</Notice>}
            <div className="ad-dialog__actions">
              <button type="button" className="ad-btn ad-btn--ghost" onClick={() => onClose()} disabled={busy}>Cancel</button>
              <button type="submit" className={`ad-btn ${danger ? 'ad-btn--danger' : 'ad-btn--primary'}`} disabled={busy}>
                {busy ? <Spinner /> : confirmLabel}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Button that opens a ConfirmDialog and reports the outcome as a toast. */
export function ActionButton({ children, dialog, onDone, tone = 'ghost' }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        className={`ad-btn ad-btn--${tone} ad-btn--sm`}
        onClick={() => setOpen(true)}
      >
        {children}
      </motion.button>
      <ConfirmDialog
        open={open}
        {...dialog}
        onClose={(message) => {
          setOpen(false);
          if (message) {
            toast(message, 'success');
            onDone?.();
          }
        }}
      />
    </>
  );
}

// ── CSV export ────────────────────────────────────────────────────────────────

/**
 * Downloads the rows that `load` returns as a CSV file.
 * load: async () => rows.  columns: [{ header, value(row) }].
 */
export function ExportButton({ load, columns, filename, label = 'Export CSV' }) {
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const rows = await load();
      if (!rows.length) { setError('Nothing to export'); return; }
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`slipr-${filename}-${stamp}.csv`, toCsv(columns, rows));
      toast(`Exported ${rows.length.toLocaleString()} row${rows.length === 1 ? '' : 's'}`, 'success');
    } catch (err) {
      setError(errorMessage(err, 'Export failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="ad-export">
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        className="ad-btn ad-btn--ghost ad-btn--sm"
        onClick={run}
        disabled={busy}
        title={`Exports up to ${MAX_EXPORT_ROWS.toLocaleString()} rows matching the current filters`}
      >
        {busy ? <Spinner /> : <Download size={14} aria-hidden="true" />}
        {busy ? 'Exporting…' : label}
      </motion.button>
      {error && <span className="ad-inline-error" role="status">{error}</span>}
    </span>
  );
}


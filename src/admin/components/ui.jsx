/**
 * admin/components/ui.jsx — Shared admin UI primitives. Same props as before; the look is
 * flat and typographic: rules instead of cards, no shadows, no motion beyond a fade.
 */

import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { label as humanise } from '../format';
import { downloadCsv, MAX_EXPORT_ROWS, toCsv } from '../export';
import { errorMessage } from '../api';
import { Fade } from '../motion';

// ── Toasts ────────────────────────────────────────────────────────────────────

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, kind = 'info') => {
    if (!message) return;
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list.slice(-2), { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);
  const dismiss = (id) => setToasts((list) => list.filter((t) => t.id !== id));
  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ad-toasts" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`ad-toast ad-toast--${t.kind}`}
              role={t.kind === 'error' ? 'alert' : 'status'}
            >
              <span>{t.message}</span>
              <button type="button" className="ad-toast__close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>Close</button>
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

/** Plain grey bars while a table loads. */
export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="ad-stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="ad-skeleton" style={{ height: 40 }} />
      ))}
    </div>
  );
}

export function Notice({ kind = 'info', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`ad-notice ad-notice--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onClose && <button type="button" className="ad-link" onClick={onClose}>Dismiss</button>}
    </div>
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

/** A section of the page: a rule across the top, a serif title, then its content. */
export function Card({ title, subtitle, actions, children, className = '' }) {
  return (
    <Fade>
      <section className={`ad-card ${className}`}>
        {(title || actions) && (
          <header className="ad-card__head">
            <div>
              {title && <h2>{title}</h2>}
              {subtitle && <p className="ad-muted ad-small" style={{ margin: '3px 0 0' }}>{subtitle}</p>}
            </div>
            {actions && <div className="ad-card__actions">{actions}</div>}
          </header>
        )}
        {children}
      </section>
    </Fade>
  );
}

/** A single figure: small label, large serif number. */
export function StatTile({ label: text, value, hint }) {
  return (
    <div className="ad-stat">
      <span className="ad-stat__label">{text}</span>
      <strong className="ad-stat__value">{value}</strong>
      {hint && <span className="ad-stat__hint">{hint}</span>}
    </div>
  );
}

export function StatGrid({ children, two = false, cols }) {
  return (
    <div className={`ad-grid${two ? ' ad-grid--two' : ''}`} data-cols={cols}>
      {children}
    </div>
  );
}

export function PageHero({ title, text, children }) {
  return (
    <header className="ad-page-head">
      <div>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      {children && <div className="ad-page-head__meta">{children}</div>}
    </header>
  );
}

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
  if (!rows?.length) return <p className="ad-muted ad-empty">{emptyText}</p>;
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
    ref.current?.querySelector('input,textarea,select')?.focus();
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
          transition={{ duration: 0.12 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
        >
          <form ref={ref} className="ad-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={submit}>
            <h3 id={titleId}>{title}</h3>
            {description && <p className="ad-muted" style={{ margin: 0 }}>{description}</p>}
            {fields.map((f) => (
              <label key={f.name} className="ad-field">
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
              </label>
            ))}
            {error && <Notice kind="error">{error}</Notice>}
            <div className="ad-dialog__actions">
              <button type="button" className="ad-btn ad-btn--ghost" onClick={() => onClose()} disabled={busy}>Cancel</button>
              <button type="submit" className={`ad-btn ${danger ? 'ad-btn--danger' : 'ad-btn--primary'}`} disabled={busy}>
                {busy ? <Spinner /> : confirmLabel}
              </button>
            </div>
          </form>
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
      <button type="button" className={`ad-btn ad-btn--${tone} ad-btn--sm`} onClick={() => setOpen(true)}>
        {children}
      </button>
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
      <button
        type="button"
        className="ad-btn ad-btn--ghost ad-btn--sm"
        onClick={run}
        disabled={busy}
        title={`Exports up to ${MAX_EXPORT_ROWS.toLocaleString()} rows matching the current filters`}
      >
        {busy ? <Spinner /> : null}
        {busy ? 'Exporting…' : label}
      </button>
      {error && <span className="ad-inline-error" role="status">{error}</span>}
    </span>
  );
}

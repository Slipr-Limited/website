/**
 * admin/components/ui.jsx — Shared admin UI primitives.
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import { label as humanise } from '../format';
import { downloadCsv, MAX_EXPORT_ROWS, toCsv } from '../export';
import { errorMessage } from '../api';

export function Spinner() {
  return <span className="ad-spinner" role="status" aria-label="Loading" />;
}

export function Notice({ kind = 'info', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`ad-notice ad-notice--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onClose && <button type="button" className="ad-link" onClick={onClose} aria-label="Dismiss">×</button>}
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

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`ad-card ${className}`}>
      {(title || actions) && (
        <header className="ad-card__head">
          {title && <h2>{title}</h2>}
          {actions && <div className="ad-card__actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatTile({ label: text, value, hint }) {
  return (
    <div className="ad-stat">
      <span className="ad-stat__label">{text}</span>
      <strong className="ad-stat__value">{value}</strong>
      {hint && <span className="ad-stat__hint">{hint}</span>}
    </div>
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
      <button type="button" className="ad-btn ad-btn--ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span>Page {page} of {totalPages}</span>
      <button type="button" className="ad-btn ad-btn--ghost" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}

/**
 * Table with loading, error and empty states.
 * columns: [{ key, header, render?(row) }]
 */
export function DataTable({ columns, rows, loading, error, emptyText = 'Nothing here yet', rowKey = '_id' }) {
  if (error) return <Notice kind="error">{error}</Notice>;
  if (loading && !rows?.length) return <div className="ad-center"><Spinner /></div>;
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

/**
 * Confirmation dialog that can collect a reason or note.
 * fields: [{ name, label, type: 'text' | 'textarea' | 'select', options?, required?, minLength?, initial? }]
 * onConfirm(values) returns { ok, message }. The dialog stays open on failure.
 */
export function ConfirmDialog({ open, title, description, fields = [], confirmLabel = 'Confirm', danger = false, onConfirm, onClose }) {
  const [values, setValues] = useState({});
  const [error, setError]   = useState(null);
  const [busy, setBusy]     = useState(false);
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const initial = {};
    fields.forEach((f) => { initial[f.name] = f.initial ?? (f.type === 'select' ? f.options?.[0]?.value ?? '' : ''); });
    setValues(initial);
    setError(null);
    setBusy(false);
    ref.current?.querySelector('input,textarea,select,button')?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

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
    <div className="ad-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <form ref={ref} className="ad-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={submit}>
        <h3 id={titleId}>{title}</h3>
        {description && <p className="ad-muted">{description}</p>}
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
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className={`ad-btn ${danger ? 'ad-btn--danger' : 'ad-btn--primary'}`} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Button that opens a ConfirmDialog. */
export function ActionButton({ children, dialog, onDone, tone = 'ghost' }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  return (
    <>
      <button type="button" className={`ad-btn ad-btn--${tone} ad-btn--sm`} onClick={() => setOpen(true)}>{children}</button>
      <ConfirmDialog
        open={open}
        {...dialog}
        onClose={(message) => { setOpen(false); if (message) { setNotice(message); onDone?.(); } }}
      />
      {notice && <span className="ad-muted ad-inline-note">{notice}</span>}
    </>
  );
}

/**
 * Downloads the rows that `load` returns as a CSV file.
 * load: async () => rows.  columns: [{ header, value(row) }].
 */
export function ExportButton({ load, columns, filename, label = 'Export CSV' }) {
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const rows = await load();
      if (!rows.length) { setError('Nothing to export'); return; }
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`slipr-${filename}-${stamp}.csv`, toCsv(columns, rows));
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
        {busy ? 'Exporting…' : label}
      </button>
      {error && <span className="ad-inline-error" role="status">{error}</span>}
    </span>
  );
}

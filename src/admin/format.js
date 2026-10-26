/**
 * admin/format.js — Display helpers. Money handling is per field:
 * the API returns some amounts in kobo and some already in naira.
 */

const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 });

/** For values already in naira. */
export const formatNaira = (value) => naira.format(Number(value) || 0);

/** For values stored in kobo (e.g. withdrawal amounts, listing prices). */
export const formatKobo = (value) => naira.format((Number(value) || 0) / 100);

export const formatNumber = (value) => (Number(value) || 0).toLocaleString('en-NG');

export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
};

export const shortId = (id) => (id ? String(id).slice(-6) : '—');

export const label = (text) => String(text ?? '').replace(/_/g, ' ');

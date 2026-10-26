/**
 * admin/export.js — CSV export for admin tables.
 *
 * fetchAllPages walks every page of a paginated endpoint with the current filters,
 * up to MAX_EXPORT_ROWS. toCsv escapes cells and neutralises spreadsheet formulas.
 */

import { api } from './api';

export const MAX_EXPORT_ROWS = 10000;
const PAGE_SIZE = 100;

/** Collects all rows of a paginated admin endpoint (the list is under `dataKey`). */
export async function fetchAllPages(url, params = {}, dataKey) {
  const rows = [];
  let page = 1;
  for (;;) {
    const { data } = await api.get(url, { params: { ...params, page, limit: PAGE_SIZE } });
    const batch = data.data?.[dataKey] ?? [];
    rows.push(...batch);
    const totalPages = data.data?.pagination?.totalPages ?? 1;
    if (batch.length === 0 || page >= totalPages || rows.length >= MAX_EXPORT_ROWS) break;
    page += 1;
  }
  return rows.slice(0, MAX_EXPORT_ROWS);
}

// Cells starting with these characters are evaluated as formulas by spreadsheet apps.
const FORMULA_START = /^[=+\-@\t\r]/;

const cell = (value) => {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString()
    : typeof value === 'object' ? JSON.stringify(value)
    : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * @param {{ header: string, value: (row) => any }[]} columns
 * @param {object[]} rows
 */
export function toCsv(columns, rows) {
  const head = columns.map((c) => cell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => cell(c.value(row))).join(','));
  // BOM so Excel reads Naira signs and accented names correctly.
  return `﻿${[head, ...body].join('\r\n')}`;
}

export function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

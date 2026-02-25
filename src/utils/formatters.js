// utils/formatters.js
// Date and text formatting helpers.

/**
 * Format a timestamptz string to a locale date string.
 * @param {string} isoString
 * @returns {string}
 */
export function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a timestamptz string to a locale date + time string.
 * @param {string} isoString
 * @returns {string}
 */
export function formatDateTime(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-GB');
}

/**
 * Convert a timestamptz ISO string to the YYYY-MM-DDTHH:MM format
 * required by <input type="datetime-local"> value attribute.
 */
export function toDateTimeLocal(isoString) {
  if (!isoString) return '';
  const d   = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return [
    d.getFullYear(), '-', pad(d.getMonth() + 1), '-', pad(d.getDate()),
    'T', pad(d.getHours()), ':', pad(d.getMinutes()),
  ].join('');
}

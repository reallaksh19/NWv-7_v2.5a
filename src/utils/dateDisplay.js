import { toLocalDateKey } from './dateKey.js';

function toValidDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toDateKey(value, fallback = 'undated') {
  // Local-calendar date key: setHours(0,0,0,0) + toISOString() yielded the
  // previous UTC day for ahead-of-UTC zones (IST), splitting keys from the
  // local keys produced by the intelligence layer (dateAware/canonicalItemBuilder).
  return toLocalDateKey(value) || fallback;
}

export function formatPlannerDateLabel(dateKey, fallback = 'Date TBD') {
  if (!dateKey || dateKey === 'undated') return fallback;
  const parsed = toValidDate(`${dateKey}T00:00:00Z`) || toValidDate(dateKey);
  if (!parsed) return fallback;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

export function formatPlannerCompactDateLabel(dateKey, fallback = 'Date TBD') {
  if (!dateKey || dateKey === 'undated') return fallback;
  const parsed = toValidDate(`${dateKey}T00:00:00Z`) || toValidDate(dateKey);
  if (!parsed) return fallback;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

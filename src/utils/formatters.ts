import { Timestamp } from 'firebase/firestore';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function toIsoString(value: unknown): string {
  if (!value) return '';
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const secs = Number((value as { seconds: number }).seconds);
    return new Date(secs * 1000).toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

export function formatDate(value: unknown): string {
  const iso = toIsoString(value);
  if (!iso) return 'Just now';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: unknown): string {
  const iso = toIsoString(value);
  if (!iso) return 'Just now';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function slugify(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'item';
}

export function makeSafeDocId(prefix: string, label: string): string {
  const normalized = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${normalized || 'doc'}_${rand}`;
}

export interface PasswordValidationResult {
  valid: boolean;
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
  };
}

export function validatePassword(password: string): PasswordValidationResult {
  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
  return {
    valid: checks.minLength && checks.hasUpper && checks.hasLower && checks.hasNumber,
    checks,
  };
}

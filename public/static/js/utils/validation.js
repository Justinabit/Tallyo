// =============================================================================
// TALLYO — Input validation helpers (friendly, non-technical error messages)
// =============================================================================

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function validatePassword(password) {
  if (!password || password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

export function validateRequired(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return `${label} is required.`;
  }
  return null;
}

export function validatePositiveAmount(value, label = 'Amount') {
  const n = Number(value);
  if (value === '' || value === undefined || value === null || Number.isNaN(n)) return `${label} must be a valid number.`;
  if (n <= 0) return `${label} must be greater than zero.`;
  if (n > 999_999_999) return `${label} is too large.`;
  return null;
}

export function validateDate(value, label = 'Date') {
  if (!value) return `${label} is required.`;
  if (Number.isNaN(new Date(value).getTime())) return `${label} is not a valid date.`;
  return null;
}

export function validateDateRange(start, end) {
  if (start && end && new Date(end) < new Date(start)) return 'End date cannot be before the start date.';
  return null;
}

/**
 * Runs a set of {field, error} rule functions and returns
 * { valid, errors: {field: message} }.
 */
export function runValidation(rules) {
  const errors = {};
  for (const [field, message] of rules) {
    if (message) errors[field] = message;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

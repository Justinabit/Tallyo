// =============================================================================
// TALLYO — Currency formatting (centralized so it's easy to add currencies)
// =============================================================================

export const CURRENCIES = {
  PHP: { symbol: '₱', locale: 'en-PH', code: 'PHP' },
  USD: { symbol: '$', locale: 'en-US', code: 'USD' },
  EUR: { symbol: '€', locale: 'de-DE', code: 'EUR' }
};

let _activeCurrency = 'PHP';

export function setActiveCurrency(code) {
  if (CURRENCIES[code]) _activeCurrency = code;
}

export function getActiveCurrency() {
  return _activeCurrency;
}

/** Format a numeric amount using the active currency. */
export function formatMoney(amount, opts = {}) {
  const n = Number(amount) || 0;
  const cur = CURRENCIES[opts.currency || _activeCurrency] || CURRENCIES.PHP;
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString(cur.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const sign = n < 0 ? '-' : '';
  return `${sign}${cur.symbol}${formatted}`;
}

/** Format without decimals, useful for compact stat headers. */
export function formatMoneyCompact(amount, opts = {}) {
  const n = Number(amount) || 0;
  const cur = CURRENCIES[opts.currency || _activeCurrency] || CURRENCIES.PHP;
  const abs = Math.abs(n);
  let display;
  if (abs >= 1_000_000) display = (abs / 1_000_000).toFixed(1) + 'M';
  else if (abs >= 1_000) display = (abs / 1_000).toFixed(1) + 'K';
  else display = abs.toFixed(0);
  return `${n < 0 ? '-' : ''}${cur.symbol}${display}`;
}

export function currencySymbol(code) {
  return (CURRENCIES[code || _activeCurrency] || CURRENCIES.PHP).symbol;
}

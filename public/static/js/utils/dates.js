// =============================================================================
// TALLYO — Date & period helpers
// =============================================================================
// All dates are handled as "YYYY-MM-DD" strings (matching Postgres `date`)
// to avoid timezone bugs. `toISODate` always uses LOCAL date parts, not UTC.
// =============================================================================

export function toISODate(d) {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function parseISO(s) {
  // Avoid UTC shift: construct with explicit local parts.
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(dateISO, n) {
  const d = parseISO(dateISO);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function daysBetween(aISO, bISO) {
  const a = parseISO(aISO);
  const b = parseISO(bISO);
  return Math.round((b - a) / 86400000);
}

export function startOfWeek(dateISO) {
  const d = parseISO(dateISO);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // week starts Monday
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}
export function endOfWeek(dateISO) {
  return addDays(startOfWeek(dateISO), 6);
}

export function startOfMonth(dateISO) {
  const d = parseISO(dateISO);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}
export function endOfMonth(dateISO) {
  const d = parseISO(dateISO);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function startOfYear(dateISO) {
  const d = parseISO(dateISO);
  return toISODate(new Date(d.getFullYear(), 0, 1));
}
export function endOfYear(dateISO) {
  const d = parseISO(dateISO);
  return toISODate(new Date(d.getFullYear(), 11, 31));
}

/**
 * Returns { start, end, label } for the given period type, anchored at "today"
 * unless a reference date is provided. offset shifts by whole periods
 * (e.g. offset=-1 gives "last month" when period === 'monthly').
 */
export function getPeriodRange(period, offset = 0, refISO = todayISO(), customRange = null) {
  if (period === 'custom' && customRange) {
    return { start: customRange.start, end: customRange.end, label: `${formatShort(customRange.start)} – ${formatShort(customRange.end)}` };
  }

  let ref = parseISO(refISO);

  if (period === 'weekly') {
    ref.setDate(ref.getDate() + offset * 7);
    const refISOShifted = toISODate(ref);
    const start = startOfWeek(refISOShifted);
    const end = endOfWeek(refISOShifted);
    return { start, end, label: `${formatShort(start)} – ${formatShort(end)}` };
  }

  if (period === 'yearly') {
    const y = ref.getFullYear() + offset;
    const start = toISODate(new Date(y, 0, 1));
    const end = toISODate(new Date(y, 11, 31));
    return { start, end, label: String(y) };
  }

  // monthly (default)
  const y = ref.getFullYear();
  const m = ref.getMonth() + offset;
  const first = new Date(y, m, 1);
  const start = toISODate(first);
  const end = toISODate(new Date(first.getFullYear(), first.getMonth() + 1, 0));
  const label = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { start, end, label };
}

export function formatShort(dateISO) {
  return parseISO(dateISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatLong(dateISO) {
  return parseISO(dateISO).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatDayMonth(dateISO) {
  return parseISO(dateISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function relativeDueLabel(dateISO) {
  const diff = daysBetween(todayISO(), dateISO);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff}d`;
}

/** Previous comparable period (used for "vs last period" comparisons). */
export function getPreviousPeriodRange(period, offset, refISO, customRange) {
  if (period === 'custom' && customRange) {
    const len = daysBetween(customRange.start, customRange.end) + 1;
    const prevEnd = addDays(customRange.start, -1);
    const prevStart = addDays(prevEnd, -(len - 1));
    return { start: prevStart, end: prevEnd, label: `${formatShort(prevStart)} – ${formatShort(prevEnd)}` };
  }
  return getPeriodRange(period, offset - 1, refISO, customRange);
}

export const WEEKDAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

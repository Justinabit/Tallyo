// =============================================================================
// TALLYO — Topbar with period selector (weekly / monthly / yearly / custom)
// =============================================================================
import { h } from '../utils/dom.js';
import { getState, setPeriod } from '../store.js';
import { getPeriodRange } from '../utils/dates.js';

export function renderTopbar(title, { onPeriodChange, showPeriod = true, actions = [] } = {}) {
  const { period, refDate } = getState();

  // Note: setPeriod() already notifies every page subscribed to the store
  // (dashboard.js, reports.js, transactions.js all call `subscribe(() =>
  // load())`), which re-runs their load() on its own. Calling
  // onPeriodChange() here too used to fire that SAME page's load() a second
  // time for every single period interaction — doubling data fetches and,
  // worse, doubling AI insight requests on every click. setPeriod() alone
  // is enough.
  const periodTypeSelect = h('select', {
    class: 'input', style: 'padding:4px 8px;border:none;background:transparent;font-weight:700',
    onchange: (e) => {
      setPeriod({ type: e.target.value, offset: 0 });
    }
  }, [
    h('option', { value: 'weekly', selected: period.type === 'weekly' || undefined }, 'Weekly'),
    h('option', { value: 'monthly', selected: period.type === 'monthly' || undefined }, 'Monthly'),
    h('option', { value: 'yearly', selected: period.type === 'yearly' || undefined }, 'Yearly'),
    h('option', { value: 'custom', selected: period.type === 'custom' || undefined }, 'Custom')
  ]);

  const range = getPeriodRange(period.type, period.offset, refDate, period.customRange);

  const periodBlock = [];
  if (showPeriod) {
    if (period.type === 'custom') {
      periodBlock.push(
        h('div', { class: 'period-select' }, [
          h('input', {
            type: 'date', class: 'input', style: 'border:none;background:transparent;padding:4px', value: period.customRange?.start || range.start,
            onchange: (e) => { setPeriod({ customRange: { start: e.target.value, end: period.customRange?.end || range.end } }); }
          }),
          h('span', { class: 'text-faint' }, 'to'),
          h('input', {
            type: 'date', class: 'input', style: 'border:none;background:transparent;padding:4px', value: period.customRange?.end || range.end,
            onchange: (e) => { setPeriod({ customRange: { start: period.customRange?.start || range.start, end: e.target.value } }); }
          }),
          periodTypeSelect
        ])
      );
    } else {
      periodBlock.push(
        h('div', { class: 'period-select' }, [
          h('button', { class: 'btn btn-ghost btn-icon', style: 'width:26px;height:26px', onclick: () => { setPeriod({ offset: period.offset - 1 }); } }, [h('i', { class: 'fas fa-chevron-left', style: 'font-size:11px' })]),
          h('span', { style: 'font-weight:700;font-size:12.5px;min-width:120px;text-align:center' }, range.label),
          h('button', { class: 'btn btn-ghost btn-icon', style: 'width:26px;height:26px', onclick: () => { setPeriod({ offset: period.offset + 1 }); } }, [h('i', { class: 'fas fa-chevron-right', style: 'font-size:11px' })]),
          periodTypeSelect
        ])
      );
    }
  }

  return h('header', { class: 'topbar' }, [
    h('div', { class: 'flex items-center gap-12' }, [
      h('button', {
        class: 'btn btn-ghost btn-icon menu-toggle',
        onclick: () => { document.getElementById('sidebar')?.classList.add('open'); document.getElementById('sidebar-backdrop')?.classList.add('show'); }
      }, [h('i', { class: 'fas fa-bars' })]),
      h('h1', { class: 'topbar-title' }, title)
    ]),
    h('div', { class: 'topbar-actions' }, [...periodBlock, ...actions])
  ]);
}
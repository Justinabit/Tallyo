// =============================================================================
// TALLYO — Reports Page
// =============================================================================
import { h } from '../utils/dom.js';
import { renderShell } from '../components/layout.js';
import { loadingBlock, emptyState } from '../components/emptyState.js';
import { getState, subscribe } from '../store.js';
import { listTransactions } from '../services/transactionService.js';
import { categoriesById as toCategoryMap } from '../services/categoryService.js';
import { formatMoney } from '../utils/currency.js';
import { getPeriodRange, getPreviousPeriodRange, startOfMonth, endOfMonth, toISODate, parseISO } from '../utils/dates.js';
import { calcTotals, calcSpendingByCategory, percentChange } from '../utils/calculations.js';
import { drawDonut, drawBar, drawLine, destroyChartsIn } from '../components/charts.js';

let unsub = null;
let renderSeq = 0;

export async function renderReportsPage() {
  if (unsub) unsub();
  const content = renderShell({ route: '#/reports', title: 'Reports', onPeriodChange: load });
  content.appendChild(loadingBlock());
  unsub = subscribe(() => load());
  await load();

  async function load() {
    // Guards against overlapping load() calls racing each other — without
    // this, a slow/older call finishing after a newer one had already
    // rendered good charts could wipe them out (or throw and leave the
    // page blank) instead of the newer, correct render staying on screen.
    const mySeq = ++renderSeq;

    const { period, refDate, categories } = getState();
    const range = getPeriodRange(period.type, period.offset, refDate, period.customRange);
    const prevRange = getPreviousPeriodRange(period.type, period.offset, refDate, period.customRange);

    let txs, prevTxs;
    try {
      [txs, prevTxs] = await Promise.all([
        listTransactions({ start: range.start, end: range.end }),
        listTransactions({ start: prevRange.start, end: prevRange.end })
      ]);
    } catch (err) {
      if (mySeq !== renderSeq) return;
      console.error('[Tallyo] Reports failed to load', err);
      destroyChartsIn(content);
      content.innerHTML = '';
      content.appendChild(h('div', { class: 'card' }, [
        emptyState({ icon: 'fa-triangle-exclamation', title: 'Could not load reports', message: 'Something went wrong fetching your data. Please try again.', actionLabel: 'Retry', onAction: load })
      ]));
      return;
    }

    if (mySeq !== renderSeq) return;

    const catMap = toCategoryMap(categories);
    const totals = calcTotals(txs);
    const prevTotals = calcTotals(prevTxs);
    const { rows: spendRows } = calcSpendingByCategory(txs, catMap);

    destroyChartsIn(content);
    content.innerHTML = '';

    if (!txs.length && !prevTxs.length) {
      content.appendChild(h('div', { class: 'card' }, [emptyState({ icon: 'fa-chart-pie', title: 'No data yet for reports', message: 'Add some transactions to see reports and comparisons.' })]));
      return;
    }

    content.appendChild(renderComparisonCard(totals, prevTotals, range, prevRange));
    content.appendChild(
      h('div', { class: 'grid grid-cols-2', style: 'margin-top:18px' }, [
        renderTrendCard(txs, range),
        renderCategoryReportCard(spendRows, totals.expense)
      ])
    );
  }
}

function deltaBadge(current, previous) {
  const change = percentChange(current, previous);
  if (change === null) return h('span', { class: 'badge badge-muted' }, 'New');
  const up = change >= 0;
  return h('span', { class: `badge ${up ? 'badge-danger' : 'badge-success'}` }, `${up ? '+' : ''}${change.toFixed(0)}%`);
}

function renderComparisonCard(totals, prevTotals, range, prevRange) {
  const card = h('div', { class: 'card' }, [
    h('div', { class: 'card-header' }, [h('div', {}, [h('div', { class: 'card-title' }, 'Period Comparison'), h('div', { class: 'card-subtitle' }, `${range.label} vs ${prevRange.label}`)])])
  ]);
  const grid = h('div', { class: 'grid grid-cols-3' }, [
    comparisonRow('Income', totals.income, prevTotals.income, false),
    comparisonRow('Expenses', totals.expense, prevTotals.expense, true),
    comparisonRow('Balance', totals.balance, prevTotals.balance, false)
  ]);
  card.appendChild(grid);
  return card;
}

function comparisonRow(label, value, prevValue, higherIsBad) {
  const change = percentChange(value, prevValue);
  const isBad = change !== null && (higherIsBad ? change > 0 : change < 0);
  return h('div', { style: 'padding:14px;border:1px solid var(--border);border-radius:12px' }, [
    h('div', { class: 'stat-label', style: 'margin-bottom:6px' }, label),
    h('div', { class: 'stat-value', style: 'font-size:20px;margin-bottom:6px' }, formatMoney(value)),
    h('div', { class: 'flex items-center gap-8' }, [
      change === null ? h('span', { class: 'badge badge-muted' }, 'New') : h('span', { class: `stat-delta ${isBad ? 'down' : 'up'}` }, [h('i', { class: `fas fa-arrow-${change >= 0 ? 'up' : 'down'}` }), `${Math.abs(change).toFixed(1)}%`]),
      h('span', { class: 'text-faint', style: 'font-size:11px' }, `prev: ${formatMoney(prevValue)}`)
    ])
  ]);
}

function renderTrendCard(txs, range) {
  const card = h('div', { class: 'card' }, [h('div', { class: 'card-title' }, 'Income vs Expenses'), h('div', { style: 'height:240px;margin-top:12px' }, [h('canvas')])]);
  // Bucket by day if range is short, otherwise by week.
  const start = parseISO(range.start), end = parseISO(range.end);
  const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const bucketByWeek = totalDays > 45;

  const buckets = new Map();
  for (const t of txs) {
    let key;
    if (bucketByWeek) {
      const d = parseISO(t.transaction_date);
      const weekNum = Math.floor((d - start) / (7 * 86400000));
      key = `W${weekNum + 1}`;
    } else {
      key = t.transaction_date.slice(5); // MM-DD
    }
    if (!buckets.has(key)) buckets.set(key, { income: 0, expense: 0 });
    const b = buckets.get(key);
    if (t.type === 'income') b.income += Number(t.amount); else b.expense += Number(t.amount);
  }
  const labels = [...buckets.keys()].sort();
  const income = labels.map((k) => buckets.get(k).income);
  const expense = labels.map((k) => buckets.get(k).expense);

  requestAnimationFrame(() => drawBar(card.querySelector('canvas'), { labels, income, expense }));
  return card;
}

function renderCategoryReportCard(rows, totalExpense) {
  const card = h('div', { class: 'card' }, [h('div', { class: 'card-title' }, 'Spending Breakdown'), h('div', { class: 'card-subtitle' }, formatMoney(totalExpense) + ' total expenses')]);
  if (!rows.length) {
    card.appendChild(emptyState({ icon: 'fa-chart-pie', title: 'No expenses in this period', message: '' }));
    return card;
  }
  const wrap = h('div', { style: 'display:flex;gap:20px;align-items:center;margin-top:12px' }, [
    h('div', { style: 'width:150px;height:150px;flex-shrink:0' }, [h('canvas', { width: 150, height: 150 })]),
    h('div', { class: 'donut-legend', style: 'flex:1' }, rows.map((r) => h('div', { class: 'legend-row' }, [
      h('span', { class: 'legend-dot', style: `background:${r.color}` }),
      h('span', { class: 'legend-label' }, r.name),
      h('span', { class: 'legend-value' }, formatMoney(r.amount))
    ])))
  ]);
  card.appendChild(wrap);
  requestAnimationFrame(() => drawDonut(wrap.querySelector('canvas'), rows));
  return card;
}

// =============================================================================
// TALLYO — Dashboard Page
// =============================================================================
import { h, toast } from '../utils/dom.js';
import { renderShell } from '../components/layout.js';
import { emptyState, loadingBlock } from '../components/emptyState.js';
import { iconBadge } from '../components/icons.js';
import { drawDonut, destroyChartsIn } from '../components/charts.js';
import { getState, subscribe } from '../store.js';
import { listTransactions } from '../services/transactionService.js';
import { listBudgets } from '../services/budgetService.js';
import { listUpcoming } from '../services/upcomingService.js';
import { processDueRecurring } from '../services/recurringService.js';
import { categoriesById as toCategoryMap } from '../services/categoryService.js';
import { getAiInsights } from '../services/aiService.js';
import { formatMoney } from '../utils/currency.js';
import { getPeriodRange, getPreviousPeriodRange, formatDayMonth, relativeDueLabel, todayISO, toISODate } from '../utils/dates.js';
import { calcTotals, calcSpendingByCategory, calcBudgetProgress, percentChange, calcSafeDailySpending } from '../utils/calculations.js';
import { openTransactionModal } from '../components/transactionForm.js';

let unsub = null;
let renderSeq = 0;

function greetingTitle() {
  const { profile, user } = getState();
  const name = (profile?.full_name || '').trim().split(/\s+/)[0]
    || user?.email?.split('@')[0]
    || 'there';
  return `Welcome, ${name}`;
}

export async function renderDashboard() {
  if (unsub) unsub();
  const content = renderShell({ route: '#/dashboard', title: greetingTitle(), onPeriodChange: load });
  content.appendChild(loadingBlock('Loading your dashboard…'));

  unsub = subscribe(() => load());
  await load();

  async function load() {
    // Guards against overlapping load() calls (e.g. triggered in quick
    // succession) stomping on each other or leaving the page blank if an
    // older, slower call errors out after a newer one already rendered.
    const mySeq = ++renderSeq;

    try {
      await processDueRecurring();
    } catch { /* non-fatal */ }

    const { period, refDate, categories, wallets } = getState();
    const range = getPeriodRange(period.type, period.offset, refDate, period.customRange);
    const prevRange = getPreviousPeriodRange(period.type, period.offset, refDate, period.customRange);

    let txs, prevTxs, budgets, upcoming;
    try {
      [txs, prevTxs, budgets, upcoming] = await Promise.all([
        listTransactions({ start: range.start, end: range.end }),
        listTransactions({ start: prevRange.start, end: prevRange.end }),
        listBudgets(),
        listUpcoming()
      ]);
    } catch (err) {
      if (mySeq !== renderSeq) return; // a newer load() already took over
      console.error('[Tallyo] Dashboard failed to load', err);
      content.innerHTML = '';
      content.appendChild(h('div', { class: 'card' }, [
        emptyState({ icon: 'fa-triangle-exclamation', title: 'Could not load your dashboard', message: 'Something went wrong fetching your data. Please try again.', actionLabel: 'Retry', onAction: load })
      ]));
      return;
    }

    if (mySeq !== renderSeq) return; // a newer load() started while we were fetching — let it win

    const catMap = toCategoryMap(categories);
    const totals = calcTotals(txs);
    const prevTotals = calcTotals(prevTxs);
    const { rows: spendRows } = calcSpendingByCategory(txs, catMap);
    const recent = [...txs].slice(0, 6);
    const upcomingSoon = upcoming.filter((u) => u.effective_status !== 'paid').slice(0, 5);

    // Budget progress limited to budgets overlapping the active period.
    const activeBudgets = budgets.filter((b) => (!b.end_date || b.end_date >= range.start) && b.start_date <= range.end);
    const budgetRows = activeBudgets.map((b) => {
      const catIds = (b.budget_categories || []).map((bc) => bc.category_id);
      const relevant = txs.filter((t) => t.type === 'expense' && (catIds.length === 0 || catIds.includes(t.category_id)));
      const spent = relevant.reduce((s, t) => s + Number(t.amount), 0);
      return { budget: b, progress: calcBudgetProgress(b, spent) };
    });

    const incomeChange = percentChange(totals.income, prevTotals.income);
    const expenseChange = percentChange(totals.expense, prevTotals.expense);

    const totalBudgetLimit = activeBudgets.reduce((s, b) => s + Number(b.amount), 0);
    const totalBudgetSpent = budgetRows.reduce((s, r) => s + r.progress.spent, 0);
    const remainingBudget = totalBudgetLimit > 0 ? totalBudgetLimit - totalBudgetSpent : totals.balance;
    const upcomingTotalInRange = upcoming
      .filter((u) => u.effective_status !== 'paid' && u.due_date >= todayISO() && u.due_date <= range.end)
      .reduce((s, u) => s + Number(u.amount), 0);
    const safeDaily = calcSafeDailySpending({
      periodEnd: range.end,
      remainingBudgetOrBalance: remainingBudget,
      upcomingExpensesTotal: upcomingTotalInRange
    });

    destroyChartsIn(content);
    content.innerHTML = '';
    content.appendChild(renderSummaryCards({ totals, incomeChange, expenseChange, remainingBudget, safeDaily }));
    content.appendChild(
      h('div', { class: 'grid grid-cols-3', style: 'margin-top:18px' }, [
        renderSpendingCard(spendRows, totals.expense),
        renderRecentTransactionsCard(recent, catMap),
        renderInsightsCard({ totals, spendRows, range, incomeChange, expenseChange })
      ])
    );
    content.appendChild(
      h('div', { class: 'grid grid-cols-3', style: 'margin-top:18px' }, [
        renderBudgetProgressCard(budgetRows),
        renderMiniCalendarCard(upcoming),
        renderUpcomingCard(upcomingSoon, catMap)
      ])
    );
  }
}

function statCard({ icon, iconBg, iconColor, label, value, delta, deltaLabel }) {
  const children = [
    h('div', { class: 'stat-icon', style: `background:${iconBg};color:${iconColor}` }, [h('i', { class: `fas ${icon}` })]),
    h('div', { class: 'stat-label' }, label),
    h('div', { class: 'stat-value' }, value)
  ];
  if (delta !== undefined && delta !== null) {
    const up = delta >= 0;
    children.push(h('div', { class: `stat-delta ${up ? 'up' : 'down'}` }, [h('i', { class: `fas fa-arrow-${up ? 'up' : 'down'}` }), `${Math.abs(delta).toFixed(1)}% ${deltaLabel}`]));
  }
  return h('div', { class: 'card stat-card' }, children);
}

function renderSummaryCards({ totals, incomeChange, expenseChange, remainingBudget, safeDaily }) {
  return h('div', { class: 'grid grid-cols-4' }, [
    statCard({ icon: 'fa-wallet', iconBg: 'var(--primary-soft)', iconColor: 'var(--primary)', label: 'Balance', value: formatMoney(totals.balance) }),
    statCard({ icon: 'fa-arrow-down', iconBg: 'var(--success-soft)', iconColor: 'var(--success)', label: 'Income', value: formatMoney(totals.income), delta: incomeChange, deltaLabel: 'vs last period' }),
    statCard({ icon: 'fa-arrow-up', iconBg: 'var(--danger-soft)', iconColor: 'var(--danger)', label: 'Expenses', value: formatMoney(totals.expense), delta: expenseChange, deltaLabel: 'vs last period' }),
    statCard({ icon: 'fa-gauge', iconBg: 'var(--accent-soft)', iconColor: 'var(--accent)', label: 'Safe to spend / day', value: formatMoney(safeDaily.perDay) })
  ]);
}

function renderSpendingCard(rows, totalExpense) {
  const card = h('div', { class: 'card' }, [
    h('div', { class: 'card-header' }, [h('div', {}, [h('div', { class: 'card-title' }, 'Spending by Category'), h('div', { class: 'card-subtitle' }, formatMoney(totalExpense) + ' total')])])
  ]);
  if (!rows.length) {
    card.appendChild(emptyState({ icon: 'fa-chart-pie', title: 'No expenses yet', message: 'Add your first expense to see a breakdown here.' }));
    return card;
  }
  const chartWrap = h('div', { style: 'display:flex;gap:18px;align-items:center' }, [
    h('div', { style: 'width:140px;height:140px;flex-shrink:0' }, [h('canvas', { width: 140, height: 140 })]),
    h('div', { class: 'donut-legend', style: 'flex:1' }, rows.slice(0, 6).map((r) =>
      h('div', { class: 'legend-row' }, [
        h('span', { class: 'legend-dot', style: `background:${r.color}` }),
        h('span', { class: 'legend-label' }, r.name),
        h('span', { class: 'legend-value' }, `${r.percent.toFixed(0)}%`)
      ])
    ))
  ]);
  card.appendChild(chartWrap);
  requestAnimationFrame(() => drawDonut(chartWrap.querySelector('canvas'), rows));
  return card;
}

function renderRecentTransactionsCard(recent, catMap) {
  const card = h('div', { class: 'card' }, [
    h('div', { class: 'card-header' }, [
      h('div', { class: 'card-title' }, 'Recent Transactions'),
      h('a', { style: 'font-size:12px;font-weight:700;color:var(--primary);cursor:pointer', onclick: () => (window.location.hash = '#/transactions') }, 'View all')
    ])
  ]);
  if (!recent.length) {
    card.appendChild(emptyState({
      icon: 'fa-receipt', title: 'No transactions yet',
      message: 'Add your first transaction to start tracking your spending.',
      actionLabel: 'Add Transaction',
      onAction: () => openTransactionModal({ onSaved: () => window.location.reload() })
    }));
    return card;
  }
  const list = h('div', { class: 'list' }, recent.map((t) => {
    const cat = catMap.get(t.category_id);
    return h('div', { class: 'list-item' }, [
      iconBadge(cat?.icon, cat?.color),
      h('div', { class: 'list-main' }, [
        h('div', { class: 'list-title' }, t.description || cat?.name || 'Transaction'),
        h('div', { class: 'list-sub' }, formatDayMonth(t.transaction_date))
      ]),
      h('div', { class: `list-amount ${t.type}` }, `${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}`)
    ]);
  }));
  card.appendChild(list);
  return card;
}

function renderInsightsCard({ totals, spendRows, range, incomeChange, expenseChange }) {
  const card = h('div', { class: 'card' }, [
    h('div', { class: 'card-header' }, [h('div', { class: 'card-title' }, [h('i', { class: 'fas fa-sparkles', style: 'color:var(--accent);margin-right:6px' }), 'Financial Insights'])])
  ]);
  const body = h('div', { class: 'flex-col gap-8' });
  card.appendChild(body);

  const deterministic = [];
  if (spendRows.length) deterministic.push(`${spendRows[0].name} is your largest expense category at ${formatMoney(spendRows[0].amount)}.`);
  if (expenseChange !== null) deterministic.push(`Expenses are ${expenseChange >= 0 ? 'up' : 'down'} ${Math.abs(expenseChange).toFixed(0)}% vs the previous period.`);
  if (incomeChange !== null) deterministic.push(`Income is ${incomeChange >= 0 ? 'up' : 'down'} ${Math.abs(incomeChange).toFixed(0)}% vs the previous period.`);
  if (!deterministic.length) deterministic.push('Add some transactions to unlock insights about your spending.');

  deterministic.forEach((msg) => body.appendChild(insightRow('fa-circle-info', msg)));

  if (window.__TALLYO_ENV__?.AI_ENABLED) {
    const aiPlaceholder = insightRow('fa-sparkles', 'Loading AI insight…', true);
    body.appendChild(aiPlaceholder);
    getAiInsights({
      period: range,
      summary: totals,
      categories: spendRows.slice(0, 5).map((r) => ({ name: r.name, amount: r.amount, percent: r.percent })),
      comparisons: { incomeChange, expenseChange }
    }).then((res) => {
      aiPlaceholder.remove();
      if (res.available && res.insights.length) {
        res.insights.slice(0, 2).forEach((msg) => body.appendChild(insightRow('fa-sparkles', msg)));
      } else if (res.message) {
        body.appendChild(insightRow('fa-circle-info', res.message, false, true));
      }
    });
  }

  return card;
}

function insightRow(icon, text, muted = false, faint = false) {
  return h('div', { style: `display:flex;gap:8px;align-items:flex-start;font-size:12.5px;${faint ? 'color:var(--text-faint)' : ''}` }, [
    h('i', { class: `fas ${icon}`, style: `margin-top:2px;color:${muted ? 'var(--text-faint)' : 'var(--accent)'};font-size:11px` }),
    h('span', {}, text)
  ]);
}

function renderMiniCalendarCard(upcoming) {
  const today = todayISO();
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = new Date(y, m, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  // Only unpaid items matter for "needs to be paid" highlighting.
  const unpaidByDate = new Map();
  upcoming.filter((u) => u.effective_status !== 'paid').forEach((u) => {
    if (!unpaidByDate.has(u.due_date)) unpaidByDate.set(u.due_date, []);
    unpaidByDate.get(u.due_date).push(u);
  });

  const card = h('div', { class: 'card' }, [
    h('div', { class: 'card-header' }, [
      h('div', { class: 'card-title' }, monthLabel),
      h('a', { style: 'font-size:12px;font-weight:700;color:var(--primary);cursor:pointer', onclick: () => (window.location.hash = '#/calendar') }, 'Full calendar')
    ])
  ]);

  card.appendChild(
    h('div', { class: 'calendar-grid mini', style: 'margin-bottom:6px' },
      ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => h('div', { class: 'calendar-dow' }, d)))
  );

  const grid = h('div', { class: 'calendar-grid mini' });
  for (let i = 0; i < startOffset; i++) grid.appendChild(h('div', { class: 'calendar-cell mini other-month' }));

  for (let d = 1; d <= daysInMonth; d++) {
    const dateISO = toISODate(new Date(y, m, d));
    const dayItems = unpaidByDate.get(dateISO) || [];
    const hasOverdue = dayItems.some((u) => u.effective_status === 'overdue');
    const isToday = dateISO === today;

    const classes = ['calendar-cell', 'mini'];
    if (isToday) classes.push('today');
    if (dayItems.length) classes.push(hasOverdue ? 'has-overdue' : 'has-due');

    const title = dayItems.length
      ? `${dayItems.map((u) => u.name).join(', ')} — ${formatMoney(dayItems.reduce((s, u) => s + Number(u.amount), 0))}`
      : undefined;

    grid.appendChild(
      h('div', { class: classes.join(' '), title, onclick: () => (window.location.hash = '#/calendar') }, [
        h('div', { class: 'calendar-date mini' }, String(d)),
        dayItems.length ? h('span', { class: 'calendar-dot' }) : null
      ])
    );
  }
  card.appendChild(grid);

  card.appendChild(
    h('div', { class: 'flex gap-12', style: 'margin-top:14px;font-size:11.5px;color:var(--text-muted)' }, [
      h('span', { class: 'flex items-center gap-8' }, [h('span', { class: 'legend-swatch today' }), 'Today']),
      h('span', { class: 'flex items-center gap-8' }, [h('span', { class: 'legend-swatch has-due' }), 'Bill due']),
      h('span', { class: 'flex items-center gap-8' }, [h('span', { class: 'legend-swatch has-overdue' }), 'Overdue'])
    ])
  );

  return card;
}

function renderBudgetProgressCard(budgetRows) {
  const card = h('div', { class: 'card' }, [
    h('div', { class: 'card-header' }, [
      h('div', { class: 'card-title' }, 'Budget Progress'),
      h('a', { style: 'font-size:12px;font-weight:700;color:var(--primary);cursor:pointer', onclick: () => (window.location.hash = '#/budgets') }, 'Manage')
    ])
  ]);
  if (!budgetRows.length) {
    card.appendChild(emptyState({ icon: 'fa-sack-dollar', title: 'No budgets for this period', message: 'Create a budget to track how much you can spend.', actionLabel: 'Create Budget', onAction: () => (window.location.hash = '#/budgets') }));
    return card;
  }
  budgetRows.slice(0, 4).forEach(({ budget, progress }) => {
    card.appendChild(
      h('div', { style: 'margin-bottom:14px' }, [
        h('div', { class: 'flex justify-between', style: 'margin-bottom:6px' }, [
          h('span', { style: 'font-weight:700;font-size:13px' }, budget.name),
          h('span', { class: 'text-muted', style: 'font-size:12px' }, `${formatMoney(progress.spent)} / ${formatMoney(progress.limit)}`)
        ]),
        h('div', { class: 'progress-track' }, [h('div', { class: `progress-fill ${progress.status}`, style: `width:${Math.min(progress.percent, 100)}%` })])
      ])
    );
  });
  return card;
}

function renderUpcomingCard(upcoming, catMap) {
  const card = h('div', { class: 'card' }, [
    h('div', { class: 'card-header' }, [
      h('div', { class: 'card-title' }, 'Upcoming Expenses'),
      h('a', { style: 'font-size:12px;font-weight:700;color:var(--primary);cursor:pointer', onclick: () => (window.location.hash = '#/calendar') }, 'View calendar')
    ])
  ]);
  if (!upcoming.length) {
    card.appendChild(emptyState({ icon: 'fa-calendar-check', title: 'Nothing upcoming', message: 'You have no upcoming expenses recorded.' }));
    return card;
  }
  const list = h('div', { class: 'list' }, upcoming.map((u) => {
    const cat = catMap.get(u.category_id);
    const overdue = u.effective_status === 'overdue';
    return h('div', { class: 'list-item' }, [
      iconBadge(cat?.icon || 'fa-file-invoice-dollar', cat?.color || '#6B7280'),
      h('div', { class: 'list-main' }, [
        h('div', { class: 'list-title' }, u.name),
        h('div', { class: `list-sub ${overdue ? 'text-danger' : ''}` }, relativeDueLabel(u.due_date))
      ]),
      h('div', { class: 'list-amount expense' }, formatMoney(u.amount))
    ]);
  }));
  card.appendChild(list);
  return card;
}
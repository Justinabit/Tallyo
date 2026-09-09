// =============================================================================
// TALLYO — Deterministic financial calculations
// =============================================================================
// EVERY number the user sees is computed HERE, in plain JavaScript, from the
// user's real transactions/budgets/goals. AI is never used to compute or
// invent any of these values (see src/index.tsx /api/ai/insights — it only
// ever receives numbers that were already produced by this file).
// =============================================================================

import { daysBetween, todayISO } from './dates.js';

/** Balance = Total Income − Total Expenses */
export function calcBalance(transactions) {
  return transactions.reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
}

export function calcTotals(transactions) {
  let income = 0, expense = 0;
  for (const t of transactions) {
    if (t.type === 'income') income += Number(t.amount);
    else expense += Number(t.amount);
  }
  return { income, expense, balance: income - expense };
}

/** Group expense transactions by category, returning totals + percentage of total expense. */
export function calcSpendingByCategory(transactions, categoriesById) {
  const totals = new Map();
  let totalExpense = 0;
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const amt = Number(t.amount);
    totalExpense += amt;
    const key = t.category_id || 'uncategorized';
    totals.set(key, (totals.get(key) || 0) + amt);
  }
  const rows = [...totals.entries()].map(([categoryId, amount]) => {
    const cat = categoriesById?.get(categoryId);
    return {
      categoryId,
      name: cat?.name || 'Uncategorized',
      color: cat?.color || '#9AA0AC',
      icon: cat?.icon || 'fa-circle-question',
      amount,
      percent: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
    };
  });
  rows.sort((a, b) => b.amount - a.amount);
  return { rows, totalExpense };
}

/** Remaining Budget = Budget Limit − Expenses (within the budget's scope) */
export function calcBudgetProgress(budget, spentAmount) {
  const limit = Number(budget.amount) || 0;
  const spent = Number(spentAmount) || 0;
  const remaining = limit - spent;
  const percent = limit > 0 ? (spent / limit) * 100 : 0;
  let status = 'success';
  if (percent >= 100) status = 'danger';
  else if (percent >= 80) status = 'warning';
  return { limit, spent, remaining, percent: Math.min(percent, 999), status };
}

/** Savings Progress % = Current / Target × 100 */
export function calcSavingsProgress(goal) {
  const target = Number(goal.target_amount) || 0;
  const current = Number(goal.current_amount) || 0;
  const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const remaining = Math.max(target - current, 0);
  return { target, current, remaining, percent };
}

/** Percentage change helper for period comparisons. Returns null if prev is 0 (undefined%). */
export function percentChange(current, previous) {
  if (!previous) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Recommended (not guaranteed) safe daily spending amount for the rest of
 * the selected period, factoring in upcoming expenses due before period end.
 */
export function calcSafeDailySpending({ periodEnd, remainingBudgetOrBalance, upcomingExpensesTotal }) {
  const days = Math.max(daysBetween(todayISO(), periodEnd) + 1, 1);
  const usable = Math.max(Number(remainingBudgetOrBalance) - Number(upcomingExpensesTotal || 0), 0);
  return { perDay: usable / days, days, usable };
}

export function sumWalletBalance(wallet, transactions) {
  const initial = Number(wallet.initial_balance) || 0;
  const delta = transactions
    .filter((t) => t.wallet_id === wallet.id)
    .reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
  return initial + delta;
}

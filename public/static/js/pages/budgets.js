// =============================================================================
// TALLYO — Budgets Page (tabs: Budgets / Recurring / Upcoming Expenses)
// =============================================================================
import { h, toast, confirmDialog } from '../utils/dom.js';
import { renderShell } from '../components/layout.js';
import { emptyState, loadingBlock } from '../components/emptyState.js';
import { getState, subscribe } from '../store.js';
import { listBudgets, deleteBudget } from '../services/budgetService.js';
import { listTransactions, createTransaction } from '../services/transactionService.js';
import { listRecurring, deleteRecurring, updateRecurring } from '../services/recurringService.js';
import { listUpcoming, deleteUpcoming, markUpcomingPaid } from '../services/upcomingService.js';
import { formatMoney } from '../utils/currency.js';
import { formatLong, relativeDueLabel } from '../utils/dates.js';
import { calcBudgetProgress } from '../utils/calculations.js';
import { openBudgetModal } from '../components/budgetForm.js';
import { openRecurringModal } from '../components/recurringForm.js';
import { openUpcomingModal } from '../components/upcomingForm.js';
import { iconBadge } from '../components/icons.js';

let unsub = null;
let activeTab = 'budgets';
let renderSeq = 0;

export async function renderBudgetsPage() {
  if (unsub) unsub();
  activeTab = 'budgets';
  const content = renderShell({ route: '#/budgets', title: 'Budgets & Planning', showPeriod: false, actions: [addButton()] });
  content.appendChild(loadingBlock());
  unsub = subscribe(() => load());
  await load();

  function addButton() {
    const btn = h('button', { class: 'btn btn-primary btn-sm' }, [h('i', { class: 'fas fa-plus' }), 'Add']);
    btn.onclick = () => {
      if (activeTab === 'budgets') openBudgetModal({ onSaved: load });
      else if (activeTab === 'recurring') openRecurringModal({ onSaved: load });
      else openUpcomingModal({ onSaved: load });
    };
    return btn;
  }

  async function load() {
    // Guards against two overlapping load() calls stepping on each other
    // (e.g. a fast reload finishing before a slower, earlier-triggered one).
    // Without this, an older call could still be mid-fetch when a newer one
    // renders good content, then finish late and blow it away — or throw
    // partway through and leave the page blank with nothing shown.
    const mySeq = ++renderSeq;

    content.innerHTML = '';
    const tabs = h('div', { class: 'tabs' }, [
      tabBtn('budgets', 'Budgets'),
      tabBtn('recurring', 'Recurring'),
      tabBtn('upcoming', 'Upcoming Expenses')
    ]);
    content.appendChild(tabs);

    const body = h('div', {});
    content.appendChild(body);

    try {
      if (activeTab === 'budgets') await renderBudgetsTab(body, load);
      else if (activeTab === 'recurring') await renderRecurringTab(body, load);
      else await renderUpcomingTab(body, load);
    } catch (err) {
      if (mySeq !== renderSeq) return; // a newer load() already took over — let it win
      console.error('[Tallyo] Budgets tab failed to load', err);
      body.innerHTML = '';
      body.appendChild(h('div', { class: 'card' }, [
        emptyState({
          icon: 'fa-triangle-exclamation',
          title: 'Could not load this tab',
          message: 'Something went wrong fetching your data. Please try again.',
          actionLabel: 'Retry',
          onAction: load
        })
      ]));
    }
  }

  function tabBtn(key, label) {
    const btn = h('button', { class: `tab-btn${activeTab === key ? ' active' : ''}` }, label);
    btn.onclick = () => { activeTab = key; load(); };
    return btn;
  }
}

// ---------------------------------------------------------------------------
async function renderBudgetsTab(body, onChange) {
  const { categories } = getState();
  const budgets = await listBudgets();

  if (!budgets.length) {
    body.appendChild(h('div', { class: 'card' }, [
      emptyState({ icon: 'fa-sack-dollar', title: 'No budgets yet', message: 'Create a budget to set spending limits and track your progress.', actionLabel: 'Create Budget', onAction: () => openBudgetModal({ onSaved: onChange }) })
    ]));
    return;
  }

  const grid = h('div', { class: 'grid grid-cols-3' });
  for (const b of budgets) {
    const catIds = (b.budget_categories || []).map((bc) => bc.category_id);
    const txs = await listTransactions({ start: b.start_date, end: b.end_date || undefined, type: 'expense' });
    const relevant = catIds.length ? txs.filter((t) => catIds.includes(t.category_id)) : txs;
    const spent = relevant.reduce((s, t) => s + Number(t.amount), 0);
    const progress = calcBudgetProgress(b, spent);
    grid.appendChild(renderBudgetCard(b, progress, categories, onChange));
  }
  body.appendChild(grid);
}

function renderBudgetCard(budget, progress, categories, onChange) {
  const catNames = (budget.budget_categories || []).map((bc) => categories.find((c) => c.id === bc.category_id)?.name).filter(Boolean);
  const statusBadge = progress.status === 'danger'
    ? h('span', { class: 'badge badge-danger' }, 'Over Budget')
    : progress.status === 'warning' ? h('span', { class: 'badge badge-warning' }, 'Almost There') : h('span', { class: 'badge badge-success' }, 'On Track');

  return h('div', { class: 'card' }, [
    h('div', { class: 'card-header' }, [
      h('div', {}, [h('div', { class: 'card-title' }, budget.name), h('div', { class: 'card-subtitle' }, `${budget.period[0].toUpperCase()}${budget.period.slice(1)} · ${catNames.length ? catNames.join(', ') : 'All categories'}`)]),
      statusBadge
    ]),
    h('div', { style: 'margin-bottom:10px' }, [
      h('div', { class: 'flex justify-between', style: 'margin-bottom:6px' }, [
        h('span', { style: 'font-weight:800;font-size:16px' }, formatMoney(progress.spent)),
        h('span', { class: 'text-muted' }, `of ${formatMoney(progress.limit)}`)
      ]),
      h('div', { class: 'progress-track' }, [h('div', { class: `progress-fill ${progress.status}`, style: `width:${Math.min(progress.percent, 100)}%` })]),
      h('div', { class: 'progress-meta' }, [h('span', {}, `${progress.percent.toFixed(0)}% used`), h('span', {}, progress.remaining >= 0 ? `${formatMoney(progress.remaining)} left` : `${formatMoney(Math.abs(progress.remaining))} over`)])
    ]),
    h('div', { class: 'text-faint', style: 'font-size:11.5px;margin-bottom:12px' }, `${formatLong(budget.start_date)}${budget.end_date ? ' – ' + formatLong(budget.end_date) : ''}`),
    h('div', { class: 'flex gap-8' }, [
      h('button', { class: 'btn btn-secondary btn-sm w-full', onclick: () => openBudgetModal({ existing: budget, onSaved: onChange }) }, 'Edit'),
      h('button', {
        class: 'btn btn-danger btn-sm w-full', onclick: async () => {
          const ok = await confirmDialog({ title: 'Delete budget?', message: `"${budget.name}" will be permanently removed.` });
          if (!ok) return;
          try { await deleteBudget(budget.id); toast('Budget deleted.', 'success'); onChange(); } catch (err) { toast(err.message || 'Could not delete.', 'error'); }
        }
      }, 'Delete')
    ])
  ]);
}

// ---------------------------------------------------------------------------
async function renderRecurringTab(body, onChange) {
  const { categories, wallets } = getState();
  const items = await listRecurring();
  if (!items.length) {
    body.appendChild(h('div', { class: 'card' }, [
      emptyState({ icon: 'fa-rotate', title: 'No recurring transactions', message: 'Set up recurring income or expenses like salary, rent, or subscriptions.', actionLabel: 'Add Recurring', onAction: () => openRecurringModal({ onSaved: onChange }) })
    ]));
    return;
  }
  const card = h('div', { class: 'card' });
  items.forEach((item) => {
    const cat = categories.find((c) => c.id === item.category_id);
    card.appendChild(
      h('div', { class: 'list-item' }, [
        iconBadge(cat?.icon || 'fa-rotate', cat?.color || '#6B7280'),
        h('div', { class: 'list-main' }, [
          h('div', { class: 'list-title' }, item.description),
          h('div', { class: 'list-sub' }, `${item.frequency[0].toUpperCase()}${item.frequency.slice(1)} · Next: ${formatLong(item.next_run_date)}${!item.is_active ? ' · Paused' : ''}`)
        ]),
        h('div', { class: `list-amount ${item.type}` }, `${item.type === 'income' ? '+' : '-'}${formatMoney(item.amount)}`),
        h('div', { class: 'list-actions' }, [
          h('button', { class: 'btn btn-ghost btn-icon btn-sm', title: item.is_active ? 'Pause' : 'Resume', onclick: async () => { await updateRecurring(item.id, { is_active: !item.is_active }); onChange(); } }, [h('i', { class: `fas fa-${item.is_active ? 'pause' : 'play'}`, style: 'font-size:12px' })]),
          h('button', { class: 'btn btn-ghost btn-icon btn-sm', onclick: () => openRecurringModal({ existing: item, onSaved: onChange }) }, [h('i', { class: 'fas fa-pen', style: 'font-size:12px' })]),
          h('button', {
            class: 'btn btn-ghost btn-icon btn-sm', onclick: async () => {
              const ok = await confirmDialog({ title: 'Delete recurring transaction?', message: 'Future occurrences will stop being created.' });
              if (!ok) return;
              try { await deleteRecurring(item.id); toast('Deleted.', 'success'); onChange(); } catch (err) { toast(err.message, 'error'); }
            }
          }, [h('i', { class: 'fas fa-trash', style: 'font-size:12px;color:var(--danger)' })])
        ])
      ])
    );
  });
  body.appendChild(card);
}

// ---------------------------------------------------------------------------
async function renderUpcomingTab(body, onChange) {
  const { categories } = getState();
  const items = await listUpcoming();
  if (!items.length) {
    body.appendChild(h('div', { class: 'card' }, [
      emptyState({ icon: 'fa-calendar-check', title: 'No upcoming expenses', message: 'Track bills, tuition, or subscriptions before they are due.', actionLabel: 'Add Upcoming Expense', onAction: () => openUpcomingModal({ onSaved: onChange }) })
    ]));
    return;
  }
  const card = h('div', { class: 'card' });
  items.forEach((item) => {
    const cat = categories.find((c) => c.id === item.category_id);
    const badge = item.effective_status === 'paid'
      ? h('span', { class: 'badge badge-success' }, 'Paid')
      : item.effective_status === 'overdue' ? h('span', { class: 'badge badge-danger' }, 'Overdue') : h('span', { class: 'badge badge-muted' }, relativeDueLabel(item.due_date));

    card.appendChild(
      h('div', { class: 'list-item' }, [
        iconBadge(cat?.icon || 'fa-file-invoice-dollar', cat?.color || '#6B7280'),
        h('div', { class: 'list-main' }, [h('div', { class: 'list-title' }, item.name), h('div', { class: 'list-sub' }, formatLong(item.due_date))]),
        badge,
        h('div', { class: 'list-amount expense' }, formatMoney(item.amount)),
        h('div', { class: 'list-actions' }, [
          item.effective_status !== 'paid'
            ? h('button', {
                class: 'btn btn-ghost btn-icon btn-sm', title: 'Mark as paid', onclick: async () => {
                  try { await markUpcomingPaid(item, createTransaction); toast('Marked as paid.', 'success'); onChange(); } catch (err) { toast(err.message, 'error'); }
                }
              }, [h('i', { class: 'fas fa-check', style: 'font-size:12px;color:var(--success)' })])
            : null,
          h('button', { class: 'btn btn-ghost btn-icon btn-sm', onclick: () => openUpcomingModal({ existing: item, onSaved: onChange }) }, [h('i', { class: 'fas fa-pen', style: 'font-size:12px' })]),
          h('button', {
            class: 'btn btn-ghost btn-icon btn-sm', onclick: async () => {
              const ok = await confirmDialog({ title: 'Delete upcoming expense?', message: `"${item.name}" will be permanently removed.` });
              if (!ok) return;
              try { await deleteUpcoming(item.id); toast('Deleted.', 'success'); onChange(); } catch (err) { toast(err.message, 'error'); }
            }
          }, [h('i', { class: 'fas fa-trash', style: 'font-size:12px;color:var(--danger)' })])
        ])
      ])
    );
  });
  body.appendChild(card);
}

// =============================================================================
// TALLYO — Transactions Page
// =============================================================================
import { h, toast, confirmDialog, debounce } from '../utils/dom.js';
import { renderShell } from '../components/layout.js';
import { emptyState, loadingBlock } from '../components/emptyState.js';
import { iconBadge } from '../components/icons.js';
import { getState, subscribe } from '../store.js';
import { listTransactions, deleteTransaction } from '../services/transactionService.js';
import { categoriesById as toCategoryMap } from '../services/categoryService.js';
import { formatMoney } from '../utils/currency.js';
import { getPeriodRange, formatLong } from '../utils/dates.js';
import { openTransactionModal } from '../components/transactionForm.js';
import { exportTransactionsToCsv } from '../services/exportService.js';

let unsub = null;
let filters = { type: '', categoryId: '', walletId: '', search: '' };

export async function renderTransactionsPage() {
  if (unsub) unsub();
  const content = renderShell({
    route: '#/transactions', title: 'Transactions', onPeriodChange: load,
    actions: [
      h('button', { class: 'btn btn-secondary btn-sm', onclick: exportCsv }, [h('i', { class: 'fas fa-download' }), 'Export CSV']),
      h('button', { class: 'btn btn-primary btn-sm', onclick: () => openTransactionModal({ onSaved: load }) }, [h('i', { class: 'fas fa-plus' }), 'Add Transaction'])
    ]
  });
  content.appendChild(loadingBlock());
  unsub = subscribe(() => load());

  let currentTxs = [];
  let currentCatMap = new Map();
  let currentWalletMap = new Map();

  async function exportCsv() {
    if (!currentTxs.length) { toast('No transactions to export.', 'info'); return; }
    exportTransactionsToCsv(currentTxs, currentCatMap, currentWalletMap);
  }

  await load();

  async function load() {
    const { period, refDate, categories, wallets } = getState();
    const range = getPeriodRange(period.type, period.offset, refDate, period.customRange);
    currentCatMap = toCategoryMap(categories);
    currentWalletMap = new Map(wallets.map((w) => [w.id, w]));

    const txs = await listTransactions({
      start: range.start, end: range.end,
      type: filters.type || undefined,
      categoryId: filters.categoryId || undefined,
      walletId: filters.walletId || undefined,
      search: filters.search || undefined
    });
    currentTxs = txs;

    content.innerHTML = '';
    content.appendChild(renderFilterBar(categories, wallets, () => load()));

    if (!txs.length) {
      content.appendChild(
        h('div', { class: 'card' }, [
          emptyState({
            icon: 'fa-receipt', title: 'No transactions found',
            message: 'Try adjusting your filters, or add your first transaction for this period.',
            actionLabel: 'Add Transaction', onAction: () => openTransactionModal({ onSaved: load })
          })
        ])
      );
      return;
    }

    // Group by date for readability
    const groups = new Map();
    for (const t of txs) {
      if (!groups.has(t.transaction_date)) groups.set(t.transaction_date, []);
      groups.get(t.transaction_date).push(t);
    }

    const card = h('div', { class: 'card' });
    for (const [date, items] of groups) {
      card.appendChild(h('div', { class: 'text-faint', style: 'font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:14px 4px 6px' }, formatLong(date)));
      items.forEach((t) => card.appendChild(renderRow(t, currentCatMap, currentWalletMap, load)));
    }
    content.appendChild(card);
  }
}

function renderFilterBar(categories, wallets, onChange) {
  const search = h('input', { class: 'input', placeholder: 'Search description…', value: filters.search });
  search.addEventListener('input', debounce((e) => { filters.search = e.target.value; onChange(); }, 350));

  const typeSelect = h('select', { class: 'input' }, [
    h('option', { value: '' }, 'All Types'),
    h('option', { value: 'income', selected: filters.type === 'income' || undefined }, 'Income'),
    h('option', { value: 'expense', selected: filters.type === 'expense' || undefined }, 'Expense')
  ]);
  typeSelect.onchange = (e) => { filters.type = e.target.value; onChange(); };

  const catSelect = h('select', { class: 'input' }, [
    h('option', { value: '' }, 'All Categories'),
    ...categories.map((c) => h('option', { value: c.id, selected: filters.categoryId === c.id || undefined }, c.name))
  ]);
  catSelect.onchange = (e) => { filters.categoryId = e.target.value; onChange(); };

  const walletSelect = h('select', { class: 'input' }, [
    h('option', { value: '' }, 'All Wallets'),
    ...wallets.map((w) => h('option', { value: w.id, selected: filters.walletId === w.id || undefined }, w.name))
  ]);
  walletSelect.onchange = (e) => { filters.walletId = e.target.value; onChange(); };

  return h('div', { class: 'filter-bar' }, [
    h('div', { class: 'search-box' }, [h('i', { class: 'fas fa-search' }), search]),
    typeSelect, catSelect, walletSelect
  ]);
}

function renderRow(t, catMap, walletMap, onChange) {
  const cat = catMap.get(t.category_id);
  const wallet = walletMap.get(t.wallet_id);
  const row = h('div', { class: 'list-item' }, [
    iconBadge(cat?.icon, cat?.color),
    h('div', { class: 'list-main' }, [
      h('div', { class: 'list-title' }, t.description || cat?.name || 'Transaction'),
      h('div', { class: 'list-sub' }, [cat?.name, wallet?.name].filter(Boolean).join(' · '))
    ]),
    h('div', { class: `list-amount ${t.type}` }, `${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}`),
    h('div', { class: 'list-actions' }, [
      h('button', { class: 'btn btn-ghost btn-icon btn-sm', onclick: () => openTransactionModal({ existing: t, onSaved: onChange }) }, [h('i', { class: 'fas fa-pen', style: 'font-size:12px' })]),
      h('button', {
        class: 'btn btn-ghost btn-icon btn-sm', onclick: async () => {
          const ok = await confirmDialog({ title: 'Delete transaction?', message: 'This cannot be undone.' });
          if (!ok) return;
          try { await deleteTransaction(t.id); toast('Transaction deleted.', 'success'); onChange(); }
          catch (err) { toast(err.message || 'Could not delete.', 'error'); }
        }
      }, [h('i', { class: 'fas fa-trash', style: 'font-size:12px;color:var(--danger)' })])
    ])
  ]);
  return row;
}

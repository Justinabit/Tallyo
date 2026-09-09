// =============================================================================
// TALLYO — Wallets Page
// =============================================================================
import { h, toast, confirmDialog } from '../utils/dom.js';
import { renderShell } from '../components/layout.js';
import { emptyState, loadingBlock } from '../components/emptyState.js';
import { WALLET_ICONS, hexToSoft } from '../components/icons.js';
import { subscribe, setState, getState } from '../store.js';
import { listWallets, deleteWallet } from '../services/walletService.js';
import { listTransactions } from '../services/transactionService.js';
import { formatMoney } from '../utils/currency.js';
import { sumWalletBalance } from '../utils/calculations.js';
import { openWalletModal } from '../components/walletForm.js';

let unsub = null;

export async function renderWalletsPage() {
  if (unsub) unsub();
  const content = renderShell({
    route: '#/wallets', title: 'Wallets', showPeriod: false,
    actions: [h('button', { class: 'btn btn-primary btn-sm', onclick: () => openWalletModal({ onSaved: load }) }, [h('i', { class: 'fas fa-plus' }), 'Add Wallet'])]
  });
  content.appendChild(loadingBlock());
  unsub = subscribe(() => load());
  await load();

  async function load() {
    const [wallets, allTxs] = await Promise.all([listWallets(), listTransactions({})]);
    // This load() is itself triggered by store changes (subscribe below).
    // Calling setState() unconditionally here re-notified every subscriber
    // — including this very page — which re-ran load(), which called
    // setState() again: an infinite reload loop that ran silently in the
    // background for as long as the tab was open (surviving even after you
    // navigated away from Wallets), hammering Supabase and forcing every
    // other open page to re-render nonstop. That's what was really behind
    // the chart glitching and the Budgets tab going blank. Only touch the
    // store when the wallets actually changed, so the loop has nothing to
    // feed on once the data is stable.
    if (JSON.stringify(wallets) !== JSON.stringify(getState().wallets)) {
      setState({ wallets });
    }
    content.innerHTML = '';

    if (!wallets.length) {
      content.appendChild(
        h('div', { class: 'card' }, [
          emptyState({ icon: 'fa-wallet', title: 'No wallets yet', message: 'Add a wallet to organize where your money lives.', actionLabel: 'Add Wallet', onAction: () => openWalletModal({ onSaved: load }) })
        ])
      );
      return;
    }

    const totalBalance = wallets.reduce((s, w) => s + sumWalletBalance(w, allTxs), 0);
    content.appendChild(
      h('div', { class: 'card', style: 'margin-bottom:18px' }, [
        h('div', { class: 'stat-label' }, 'Total Across All Wallets'),
        h('div', { class: 'stat-value', style: 'font-size:28px' }, formatMoney(totalBalance))
      ])
    );

    const grid = h('div', { class: 'grid grid-cols-3' });
    wallets.forEach((w) => grid.appendChild(renderWalletCard(w, sumWalletBalance(w, allTxs), load)));
    content.appendChild(grid);
  }
}

function renderWalletCard(wallet, balance, onChange) {
  const icon = WALLET_ICONS[wallet.type] || 'fa-wallet';
  const color = '#E11D2E';
  return h('div', { class: 'card' }, [
    h('div', { class: 'flex items-center gap-12', style: 'margin-bottom:16px' }, [
      h('div', { class: 'stat-icon', style: `background:${hexToSoft(color)};color:${color}` }, [h('i', { class: `fas ${icon}` })]),
      h('div', { style: 'flex:1' }, [
        h('div', { style: 'font-weight:700;font-size:14px' }, wallet.name),
        h('div', { class: 'text-faint', style: 'font-size:11.5px;text-transform:capitalize' }, wallet.type)
      ])
    ]),
    h('div', { class: 'stat-value', style: 'margin-bottom:16px' }, formatMoney(balance)),
    h('div', { class: 'flex gap-8' }, [
      h('button', { class: 'btn btn-secondary btn-sm w-full', onclick: () => openWalletModal({ existing: wallet, onSaved: onChange }) }, 'Edit'),
      h('button', {
        class: 'btn btn-danger btn-sm w-full', onclick: async () => {
          const ok = await confirmDialog({ title: 'Delete wallet?', message: `Transactions linked to "${wallet.name}" will keep their history but lose this wallet tag.` });
          if (!ok) return;
          try { await deleteWallet(wallet.id); toast('Wallet deleted.', 'success'); onChange(); }
          catch (err) { toast(err.message || 'Could not delete.', 'error'); }
        }
      }, 'Delete')
    ])
  ]);
}

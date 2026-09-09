// =============================================================================
// TALLYO — Add / Edit Wallet Form (modal)
// =============================================================================
import { h, openModal, toast } from '../utils/dom.js';
import { currencySymbol } from '../utils/currency.js';
import { validateRequired, runValidation } from '../utils/validation.js';
import { createWallet, updateWallet } from '../services/walletService.js';

export function openWalletModal({ existing = null, onSaved } = {}) {
  const nameInput = h('input', { class: 'input', placeholder: 'e.g. BPI Savings', value: existing?.name || '' });
  const typeSelect = h('select', { class: 'input' }, [
    ['cash', 'Cash'], ['bank', 'Bank'], ['ewallet', 'E-Wallet'], ['savings', 'Savings'], ['other', 'Other']
  ].map(([v, l]) => h('option', { value: v, selected: (existing?.type || 'cash') === v || undefined }, l)));
  const balanceInput = h('input', { class: 'input', type: 'number', step: '0.01', value: existing?.initial_balance ?? 0 });

  const errorsBox = h('div', {});
  const box = h('div', {}, [
    h('div', { class: 'modal-head' }, [
      h('h3', {}, existing ? 'Edit Wallet' : 'Add Wallet'),
      h('button', { class: 'btn btn-ghost btn-icon', onclick: () => close() }, [h('i', { class: 'fas fa-xmark' })])
    ]),
    h('div', { class: 'modal-body' }, [
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Wallet Name'), nameInput]),
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Type'), typeSelect]),
      h('div', { class: 'form-group' }, [
        h('label', { class: 'field-label' }, existing ? 'Starting Balance' : 'Initial Balance'),
        h('div', { class: 'amount-input-wrap' }, [h('span', { class: 'currency-prefix' }, currencySymbol()), balanceInput]),
        h('div', { class: 'field-hint' }, 'Transactions assigned to this wallet will adjust the balance automatically.')
      ]),
      errorsBox
    ]),
    h('div', { class: 'modal-foot', id: 'wallet-foot' })
  ]);

  const saveBtn = h('button', { class: 'btn btn-primary' }, existing ? 'Save Changes' : 'Add Wallet');
  box.querySelector('#wallet-foot').append(h('button', { class: 'btn btn-secondary', onclick: () => close() }, 'Cancel'), saveBtn);
  const close = openModal(box);

  saveBtn.onclick = async () => {
    const { valid, errors } = runValidation([['name', validateRequired(nameInput.value, 'Wallet name')]]);
    errorsBox.innerHTML = '';
    if (!valid) { errorsBox.appendChild(h('div', { class: 'field-error' }, Object.values(errors)[0])); return; }
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try {
      const payload = { name: nameInput.value.trim(), type: typeSelect.value, initial_balance: Number(balanceInput.value) || 0 };
      const saved = existing ? await updateWallet(existing.id, payload) : await createWallet(payload);
      toast(existing ? 'Wallet updated.' : 'Wallet added.', 'success');
      close();
      onSaved && onSaved(saved);
    } catch (err) {
      toast(err.message || 'Could not save wallet.', 'error');
      saveBtn.disabled = false; saveBtn.textContent = existing ? 'Save Changes' : 'Add Wallet';
    }
  };
}

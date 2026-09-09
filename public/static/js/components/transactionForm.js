// =============================================================================
// TALLYO — Add / Edit Transaction Form (modal)
// =============================================================================
import { h, openModal, toast } from '../utils/dom.js';
import { currencySymbol } from '../utils/currency.js';
import { validatePositiveAmount, validateRequired, validateDate, runValidation } from '../utils/validation.js';
import { createTransaction, updateTransaction } from '../services/transactionService.js';
import { getState } from '../store.js';
import { todayISO } from '../utils/dates.js';

/**
 * Opens the transaction modal. Pass `existing` to edit, otherwise creates new.
 * `onSaved` is called with the saved transaction after a successful save.
 */
export function openTransactionModal({ existing = null, defaultType = 'expense', onSaved } = {}) {
  const { categories, wallets } = getState();
  let type = existing?.type || defaultType;

  const errorsBox = h('div', {});
  const box = h('div', {}, []);

  function categoryOptions() {
    return categories.filter((c) => c.type === type).map((c) =>
      h('option', { value: c.id, selected: existing?.category_id === c.id || undefined }, c.name)
    );
  }

  const amountInput = h('input', { class: 'input', type: 'number', step: '0.01', min: '0', placeholder: '0.00', value: existing?.amount ?? '' });
  const categorySelect = h('select', { class: 'input' }, categoryOptions());
  const walletSelect = h('select', { class: 'input' }, [
    h('option', { value: '' }, 'No wallet'),
    ...wallets.map((w) => h('option', { value: w.id, selected: existing?.wallet_id === w.id || undefined }, w.name))
  ]);
  const dateInput = h('input', { class: 'input', type: 'date', value: existing?.transaction_date || todayISO() });
  const descInput = h('input', { class: 'input', placeholder: 'e.g. Lunch at cafeteria', value: existing?.description || '' });
  const notesInput = h('textarea', { class: 'input', placeholder: 'Optional notes…' }, existing?.notes || '');

  function rebuildCategoryOptions() {
    categorySelect.innerHTML = '';
    categoryOptions().forEach((o) => categorySelect.appendChild(o));
  }

  const segIncome = h('button', { type: 'button', class: `type-income${type === 'income' ? ' active' : ''}` }, 'Income');
  const segExpense = h('button', { type: 'button', class: `type-expense${type === 'expense' ? ' active' : ''}` }, 'Expense');
  segIncome.onclick = () => { type = 'income'; segIncome.classList.add('active'); segExpense.classList.remove('active'); rebuildCategoryOptions(); };
  segExpense.onclick = () => { type = 'expense'; segExpense.classList.add('active'); segIncome.classList.remove('active'); rebuildCategoryOptions(); };

  box.appendChild(h('div', { class: 'modal-head' }, [
    h('h3', {}, existing ? 'Edit Transaction' : 'Add Transaction'),
    h('button', { class: 'btn btn-ghost btn-icon', onclick: () => close() }, [h('i', { class: 'fas fa-xmark' })])
  ]));

  const body = h('div', { class: 'modal-body' }, [
    h('div', { class: 'form-group' }, [h('div', { class: 'segmented' }, [segIncome, segExpense])]),
    h('div', { class: 'form-group' }, [
      h('label', { class: 'field-label' }, 'Amount'),
      h('div', { class: 'amount-input-wrap' }, [h('span', { class: 'currency-prefix' }, currencySymbol()), amountInput])
    ]),
    h('div', { class: 'form-row' }, [
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Category'), categorySelect]),
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Wallet'), walletSelect])
    ]),
    h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Date'), dateInput]),
    h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Description'), descInput]),
    h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Notes (optional)'), notesInput]),
    errorsBox
  ]);
  box.appendChild(body);

  const saveBtn = h('button', { class: 'btn btn-primary' }, existing ? 'Save Changes' : 'Add Transaction');
  box.appendChild(h('div', { class: 'modal-foot' }, [
    h('button', { class: 'btn btn-secondary', onclick: () => close() }, 'Cancel'),
    saveBtn
  ]));

  const close = openModal(box);

  saveBtn.onclick = async () => {
    const amount = amountInput.value;
    const { valid, errors } = runValidation([
      ['amount', validatePositiveAmount(amount)],
      ['category', validateRequired(categorySelect.value, 'Category')],
      ['date', validateDate(dateInput.value)]
    ]);
    errorsBox.innerHTML = '';
    if (!valid) {
      errorsBox.appendChild(h('div', { class: 'field-error' }, Object.values(errors)[0]));
      return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      const payload = {
        type,
        amount: Number(amount),
        category_id: categorySelect.value || null,
        wallet_id: walletSelect.value || null,
        transaction_date: dateInput.value,
        description: descInput.value.trim() || null,
        notes: notesInput.value.trim() || null
      };
      const saved = existing ? await updateTransaction(existing.id, payload) : await createTransaction(payload);
      toast(existing ? 'Transaction updated.' : 'Transaction added.', 'success');
      close();
      onSaved && onSaved(saved);
    } catch (err) {
      toast(err.message || 'Could not save transaction.', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = existing ? 'Save Changes' : 'Add Transaction';
    }
  };
}

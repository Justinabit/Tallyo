// =============================================================================
// TALLYO — Add / Edit Recurring Transaction Form (modal)
// =============================================================================
import { h, openModal, toast } from '../utils/dom.js';
import { currencySymbol } from '../utils/currency.js';
import { validatePositiveAmount, validateRequired, runValidation, validateDateRange } from '../utils/validation.js';
import { createRecurring, updateRecurring } from '../services/recurringService.js';
import { getState } from '../store.js';
import { todayISO } from '../utils/dates.js';

export function openRecurringModal({ existing = null, onSaved } = {}) {
  const { categories, wallets } = getState();
  let type = existing?.type || 'expense';

  const amountInput = h('input', { class: 'input', type: 'number', step: '0.01', min: '0', value: existing?.amount ?? '' });
  const descInput = h('input', { class: 'input', placeholder: 'e.g. Monthly rent', value: existing?.description || '' });
  const categorySelect = h('select', { class: 'input' });
  const walletSelect = h('select', { class: 'input' }, [
    h('option', { value: '' }, 'No wallet'),
    ...wallets.map((w) => h('option', { value: w.id, selected: existing?.wallet_id === w.id || undefined }, w.name))
  ]);
  const frequencySelect = h('select', { class: 'input' }, ['daily', 'weekly', 'monthly', 'yearly'].map((f) =>
    h('option', { value: f, selected: (existing?.frequency || 'monthly') === f || undefined }, f[0].toUpperCase() + f.slice(1))
  ));
  const startInput = h('input', { class: 'input', type: 'date', value: existing?.start_date || todayISO() });
  const endInput = h('input', { class: 'input', type: 'date', value: existing?.end_date || '' });

  function rebuildCategories() {
    categorySelect.innerHTML = '';
    categories.filter((c) => c.type === type).forEach((c) =>
      categorySelect.appendChild(h('option', { value: c.id, selected: existing?.category_id === c.id || undefined }, c.name))
    );
  }
  rebuildCategories();

  const segIncome = h('button', { type: 'button', class: `type-income${type === 'income' ? ' active' : ''}` }, 'Income');
  const segExpense = h('button', { type: 'button', class: `type-expense${type === 'expense' ? ' active' : ''}` }, 'Expense');
  segIncome.onclick = () => { type = 'income'; segIncome.classList.add('active'); segExpense.classList.remove('active'); rebuildCategories(); };
  segExpense.onclick = () => { type = 'expense'; segExpense.classList.add('active'); segIncome.classList.remove('active'); rebuildCategories(); };

  const errorsBox = h('div', {});
  const box = h('div', {}, [
    h('div', { class: 'modal-head' }, [
      h('h3', {}, existing ? 'Edit Recurring' : 'New Recurring Transaction'),
      h('button', { class: 'btn btn-ghost btn-icon', onclick: () => close() }, [h('i', { class: 'fas fa-xmark' })])
    ]),
    h('div', { class: 'modal-body' }, [
      h('div', { class: 'form-group' }, [h('div', { class: 'segmented' }, [segIncome, segExpense])]),
      h('div', { class: 'form-row' }, [
        h('div', { class: 'form-group' }, [
          h('label', { class: 'field-label' }, 'Amount'),
          h('div', { class: 'amount-input-wrap' }, [h('span', { class: 'currency-prefix' }, currencySymbol()), amountInput])
        ]),
        h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Frequency'), frequencySelect])
      ]),
      h('div', { class: 'form-row' }, [
        h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Category'), categorySelect]),
        h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Wallet'), walletSelect])
      ]),
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Description'), descInput]),
      h('div', { class: 'form-row' }, [
        h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Start Date'), startInput]),
        h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'End Date (optional)'), endInput])
      ]),
      errorsBox
    ]),
    h('div', { class: 'modal-foot', id: 'recurring-foot' })
  ]);

  const saveBtn = h('button', { class: 'btn btn-primary' }, existing ? 'Save Changes' : 'Create');
  box.querySelector('#recurring-foot').append(h('button', { class: 'btn btn-secondary', onclick: () => close() }, 'Cancel'), saveBtn);
  const close = openModal(box);

  saveBtn.onclick = async () => {
    const { valid, errors } = runValidation([
      ['amount', validatePositiveAmount(amountInput.value)],
      ['desc', validateRequired(descInput.value, 'Description')],
      ['range', validateDateRange(startInput.value, endInput.value)]
    ]);
    errorsBox.innerHTML = '';
    if (!valid) { errorsBox.appendChild(h('div', { class: 'field-error' }, Object.values(errors)[0])); return; }
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try {
      const payload = {
        type,
        amount: Number(amountInput.value),
        category_id: categorySelect.value || null,
        wallet_id: walletSelect.value || null,
        description: descInput.value.trim(),
        frequency: frequencySelect.value,
        start_date: startInput.value,
        end_date: endInput.value || null,
        is_active: true
      };
      const saved = existing ? await updateRecurring(existing.id, payload) : await createRecurring(payload);
      toast(existing ? 'Recurring transaction updated.' : 'Recurring transaction created.', 'success');
      close();
      onSaved && onSaved(saved);
    } catch (err) {
      toast(err.message || 'Could not save.', 'error');
      saveBtn.disabled = false; saveBtn.textContent = existing ? 'Save Changes' : 'Create';
    }
  };
}

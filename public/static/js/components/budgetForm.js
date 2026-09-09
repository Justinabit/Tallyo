// =============================================================================
// TALLYO — Add / Edit Budget Form (modal)
// =============================================================================
import { h, openModal, toast } from '../utils/dom.js';
import { currencySymbol } from '../utils/currency.js';
import { validatePositiveAmount, validateRequired, runValidation, validateDateRange } from '../utils/validation.js';
import { createBudget, updateBudget } from '../services/budgetService.js';
import { getState } from '../store.js';
import { todayISO } from '../utils/dates.js';

export function openBudgetModal({ existing = null, onSaved } = {}) {
  const { categories } = getState();
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const existingCatIds = (existing?.budget_categories || []).map((bc) => bc.category_id);

  const nameInput = h('input', { class: 'input', placeholder: 'e.g. Monthly Food Budget', value: existing?.name || '' });
  const amountInput = h('input', { class: 'input', type: 'number', step: '0.01', min: '0', placeholder: '0.00', value: existing?.amount ?? '' });
  const periodSelect = h('select', { class: 'input' }, ['weekly', 'monthly', 'yearly', 'custom'].map((p) =>
    h('option', { value: p, selected: (existing?.period || 'monthly') === p || undefined }, p[0].toUpperCase() + p.slice(1))
  ));
  const startInput = h('input', { class: 'input', type: 'date', value: existing?.start_date || todayISO() });
  const endInput = h('input', { class: 'input', type: 'date', value: existing?.end_date || '' });

  const catCheckboxes = expenseCategories.map((c) => {
    const cb = h('input', { type: 'checkbox', value: c.id, checked: existingCatIds.includes(c.id) || undefined });
    return h('label', { class: 'checkbox-row', style: 'padding:6px 0' }, [cb, h('span', {}, c.name)]);
  });

  const errorsBox = h('div', {});
  const box = h('div', {}, [
    h('div', { class: 'modal-head' }, [
      h('h3', {}, existing ? 'Edit Budget' : 'Create Budget'),
      h('button', { class: 'btn btn-ghost btn-icon', onclick: () => close() }, [h('i', { class: 'fas fa-xmark' })])
    ]),
    h('div', { class: 'modal-body' }, [
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Budget Name'), nameInput]),
      h('div', { class: 'form-row' }, [
        h('div', { class: 'form-group' }, [
          h('label', { class: 'field-label' }, 'Amount'),
          h('div', { class: 'amount-input-wrap' }, [h('span', { class: 'currency-prefix' }, currencySymbol()), amountInput])
        ]),
        h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Period'), periodSelect])
      ]),
      h('div', { class: 'form-row' }, [
        h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Start Date'), startInput]),
        h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'End Date (optional)'), endInput])
      ]),
      h('div', { class: 'form-group' }, [
        h('label', { class: 'field-label' }, 'Applies to categories (leave empty for ALL spending)'),
        h('div', { style: 'max-height:160px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:6px 12px' }, catCheckboxes)
      ]),
      errorsBox
    ]),
    h('div', { class: 'modal-foot', id: 'budget-foot' })
  ]);

  const saveBtn = h('button', { class: 'btn btn-primary' }, existing ? 'Save Changes' : 'Create Budget');
  box.querySelector('#budget-foot').append(
    h('button', { class: 'btn btn-secondary', onclick: () => close() }, 'Cancel'),
    saveBtn
  );

  const close = openModal(box);

  saveBtn.onclick = async () => {
    const { valid, errors } = runValidation([
      ['name', validateRequired(nameInput.value, 'Budget name')],
      ['amount', validatePositiveAmount(amountInput.value)],
      ['range', validateDateRange(startInput.value, endInput.value)]
    ]);
    errorsBox.innerHTML = '';
    if (!valid) { errorsBox.appendChild(h('div', { class: 'field-error' }, Object.values(errors)[0])); return; }

    const categoryIds = catCheckboxes
      .map((row) => row.querySelector('input'))
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      const payload = {
        name: nameInput.value.trim(),
        amount: Number(amountInput.value),
        period: periodSelect.value,
        start_date: startInput.value,
        end_date: endInput.value || null
      };
      const saved = existing ? await updateBudget(existing.id, payload, categoryIds) : await createBudget({ ...payload, categoryIds });
      toast(existing ? 'Budget updated.' : 'Budget created.', 'success');
      close();
      onSaved && onSaved(saved);
    } catch (err) {
      toast(err.message || 'Could not save budget.', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = existing ? 'Save Changes' : 'Create Budget';
    }
  };
}

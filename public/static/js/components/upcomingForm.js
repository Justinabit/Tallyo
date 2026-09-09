// =============================================================================
// TALLYO — Add / Edit Upcoming Expense Form (modal)
// =============================================================================
import { h, openModal, toast } from '../utils/dom.js';
import { currencySymbol } from '../utils/currency.js';
import { validatePositiveAmount, validateRequired, validateDate, runValidation } from '../utils/validation.js';
import { createUpcoming, updateUpcoming } from '../services/upcomingService.js';
import { getState } from '../store.js';
import { todayISO } from '../utils/dates.js';

export function openUpcomingModal({ existing = null, onSaved } = {}) {
  const { categories } = getState();
  const nameInput = h('input', { class: 'input', placeholder: 'e.g. Tuition Fee', value: existing?.name || '' });
  const amountInput = h('input', { class: 'input', type: 'number', step: '0.01', min: '0', value: existing?.amount ?? '' });
  const dueInput = h('input', { class: 'input', type: 'date', value: existing?.due_date || todayISO() });
  const categorySelect = h('select', { class: 'input' }, [
    h('option', { value: '' }, 'Uncategorized'),
    ...categories.filter((c) => c.type === 'expense').map((c) => h('option', { value: c.id, selected: existing?.category_id === c.id || undefined }, c.name))
  ]);
  const notesInput = h('textarea', { class: 'input', placeholder: 'Optional notes…' }, existing?.notes || '');

  const errorsBox = h('div', {});
  const box = h('div', {}, [
    h('div', { class: 'modal-head' }, [
      h('h3', {}, existing ? 'Edit Upcoming Expense' : 'Add Upcoming Expense'),
      h('button', { class: 'btn btn-ghost btn-icon', onclick: () => close() }, [h('i', { class: 'fas fa-xmark' })])
    ]),
    h('div', { class: 'modal-body' }, [
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Expense Name'), nameInput]),
      h('div', { class: 'form-row' }, [
        h('div', { class: 'form-group' }, [
          h('label', { class: 'field-label' }, 'Amount'),
          h('div', { class: 'amount-input-wrap' }, [h('span', { class: 'currency-prefix' }, currencySymbol()), amountInput])
        ]),
        h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Due Date'), dueInput])
      ]),
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Category'), categorySelect]),
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Notes (optional)'), notesInput]),
      errorsBox
    ]),
    h('div', { class: 'modal-foot', id: 'upcoming-foot' })
  ]);

  const saveBtn = h('button', { class: 'btn btn-primary' }, existing ? 'Save Changes' : 'Add Expense');
  box.querySelector('#upcoming-foot').append(h('button', { class: 'btn btn-secondary', onclick: () => close() }, 'Cancel'), saveBtn);
  const close = openModal(box);

  saveBtn.onclick = async () => {
    const { valid, errors } = runValidation([
      ['name', validateRequired(nameInput.value, 'Expense name')],
      ['amount', validatePositiveAmount(amountInput.value)],
      ['date', validateDate(dueInput.value, 'Due date')]
    ]);
    errorsBox.innerHTML = '';
    if (!valid) { errorsBox.appendChild(h('div', { class: 'field-error' }, Object.values(errors)[0])); return; }
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try {
      const payload = {
        name: nameInput.value.trim(),
        amount: Number(amountInput.value),
        due_date: dueInput.value,
        category_id: categorySelect.value || null,
        notes: notesInput.value.trim() || null
      };
      const saved = existing ? await updateUpcoming(existing.id, payload) : await createUpcoming(payload);
      toast(existing ? 'Upcoming expense updated.' : 'Upcoming expense added.', 'success');
      close();
      onSaved && onSaved(saved);
    } catch (err) {
      toast(err.message || 'Could not save.', 'error');
      saveBtn.disabled = false; saveBtn.textContent = existing ? 'Save Changes' : 'Add Expense';
    }
  };
}

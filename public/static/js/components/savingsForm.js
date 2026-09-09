// =============================================================================
// TALLYO — Add / Edit Savings Goal Form (modal)
// =============================================================================
import { h, openModal, toast } from '../utils/dom.js';
import { currencySymbol } from '../utils/currency.js';
import { validateRequired, validatePositiveAmount, runValidation } from '../utils/validation.js';
import { createSavingsGoal, updateSavingsGoal } from '../services/savingsService.js';

export function openSavingsModal({ existing = null, onSaved } = {}) {
  const nameInput = h('input', { class: 'input', placeholder: 'e.g. New Laptop', value: existing?.name || '' });
  const targetInput = h('input', { class: 'input', type: 'number', step: '0.01', min: '0', value: existing?.target_amount ?? '' });
  const currentInput = h('input', { class: 'input', type: 'number', step: '0.01', min: '0', value: existing?.current_amount ?? 0 });
  const dateInput = h('input', { class: 'input', type: 'date', value: existing?.target_date || '' });
  const descInput = h('textarea', { class: 'input', placeholder: 'Optional description…' }, existing?.description || '');

  const errorsBox = h('div', {});
  const box = h('div', {}, [
    h('div', { class: 'modal-head' }, [
      h('h3', {}, existing ? 'Edit Savings Goal' : 'New Savings Goal'),
      h('button', { class: 'btn btn-ghost btn-icon', onclick: () => close() }, [h('i', { class: 'fas fa-xmark' })])
    ]),
    h('div', { class: 'modal-body' }, [
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Goal Name'), nameInput]),
      h('div', { class: 'form-row' }, [
        h('div', { class: 'form-group' }, [
          h('label', { class: 'field-label' }, 'Target Amount'),
          h('div', { class: 'amount-input-wrap' }, [h('span', { class: 'currency-prefix' }, currencySymbol()), targetInput])
        ]),
        h('div', { class: 'form-group' }, [
          h('label', { class: 'field-label' }, 'Current Amount'),
          h('div', { class: 'amount-input-wrap' }, [h('span', { class: 'currency-prefix' }, currencySymbol()), currentInput])
        ])
      ]),
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Target Date (optional)'), dateInput]),
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Description (optional)'), descInput]),
      errorsBox
    ]),
    h('div', { class: 'modal-foot', id: 'savings-foot' })
  ]);

  const saveBtn = h('button', { class: 'btn btn-primary' }, existing ? 'Save Changes' : 'Create Goal');
  box.querySelector('#savings-foot').append(h('button', { class: 'btn btn-secondary', onclick: () => close() }, 'Cancel'), saveBtn);
  const close = openModal(box);

  saveBtn.onclick = async () => {
    const { valid, errors } = runValidation([
      ['name', validateRequired(nameInput.value, 'Goal name')],
      ['target', validatePositiveAmount(targetInput.value, 'Target amount')]
    ]);
    errorsBox.innerHTML = '';
    if (!valid) { errorsBox.appendChild(h('div', { class: 'field-error' }, Object.values(errors)[0])); return; }
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try {
      const payload = {
        name: nameInput.value.trim(),
        target_amount: Number(targetInput.value),
        current_amount: Number(currentInput.value) || 0,
        target_date: dateInput.value || null,
        description: descInput.value.trim() || null
      };
      const saved = existing ? await updateSavingsGoal(existing.id, payload) : await createSavingsGoal(payload);
      toast(existing ? 'Goal updated.' : 'Savings goal created.', 'success');
      close();
      onSaved && onSaved(saved);
    } catch (err) {
      toast(err.message || 'Could not save goal.', 'error');
      saveBtn.disabled = false; saveBtn.textContent = existing ? 'Save Changes' : 'Create Goal';
    }
  };
}

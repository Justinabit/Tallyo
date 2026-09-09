// =============================================================================
// TALLYO — Savings Goals Page
// =============================================================================
import { h, toast, confirmDialog } from '../utils/dom.js';
import { renderShell } from '../components/layout.js';
import { emptyState, loadingBlock } from '../components/emptyState.js';
import { subscribe } from '../store.js';
import { listSavingsGoals, deleteSavingsGoal, contributeSavings } from '../services/savingsService.js';
import { formatMoney } from '../utils/currency.js';
import { formatLong, daysBetween, todayISO } from '../utils/dates.js';
import { calcSavingsProgress } from '../utils/calculations.js';
import { openSavingsModal } from '../components/savingsForm.js';

let unsub = null;

export async function renderSavingsPage() {
  if (unsub) unsub();
  const content = renderShell({
    route: '#/savings', title: 'Savings Goals', showPeriod: false,
    actions: [h('button', { class: 'btn btn-primary btn-sm', onclick: () => openSavingsModal({ onSaved: load }) }, [h('i', { class: 'fas fa-plus' }), 'New Goal'])]
  });
  content.appendChild(loadingBlock());
  unsub = subscribe(() => load());
  await load();

  async function load() {
    const goals = await listSavingsGoals();
    content.innerHTML = '';

    if (!goals.length) {
      content.appendChild(
        h('div', { class: 'card' }, [
          emptyState({ icon: 'fa-piggy-bank', title: 'No savings goals yet', message: 'Create a goal to start saving toward something you want.', actionLabel: 'New Goal', onAction: () => openSavingsModal({ onSaved: load }) })
        ])
      );
      return;
    }

    const grid = h('div', { class: 'grid grid-cols-3' });
    goals.forEach((g) => grid.appendChild(renderGoalCard(g, load)));
    content.appendChild(grid);
  }
}

function renderGoalCard(goal, onChange) {
  const progress = calcSavingsProgress(goal);
  const daysLeft = goal.target_date ? daysBetween(todayISO(), goal.target_date) : null;

  return h('div', { class: 'card' }, [
    h('div', { class: 'card-header' }, [
      h('div', {}, [
        h('div', { class: 'card-title' }, goal.name),
        goal.description ? h('div', { class: 'card-subtitle' }, goal.description) : null
      ]),
      progress.percent >= 100 ? h('span', { class: 'badge badge-success' }, 'Complete') : null
    ]),
    h('div', { style: 'margin-bottom:12px' }, [
      h('div', { class: 'flex justify-between', style: 'margin-bottom:6px' }, [
        h('span', { style: 'font-weight:800;font-size:16px' }, formatMoney(goal.current_amount)),
        h('span', { class: 'text-muted' }, `/ ${formatMoney(goal.target_amount)}`)
      ]),
      h('div', { class: 'progress-track' }, [h('div', { class: `progress-fill ${progress.percent >= 100 ? 'success' : ''}`, style: `width:${progress.percent}%` })]),
      h('div', { class: 'progress-meta' }, [
        h('span', {}, `${progress.percent.toFixed(0)}% complete`),
        h('span', {}, progress.remaining > 0 ? `${formatMoney(progress.remaining)} to go` : 'Goal reached!')
      ])
    ]),
    goal.target_date ? h('div', { class: 'text-faint', style: 'font-size:11.5px;margin-bottom:12px' }, `Target: ${formatLong(goal.target_date)}${daysLeft !== null ? ` (${daysLeft >= 0 ? daysLeft + 'd left' : Math.abs(daysLeft) + 'd overdue'})` : ''}`) : null,
    h('div', { class: 'flex gap-8', style: 'margin-bottom:8px' }, [
      h('button', {
        class: 'btn btn-outline btn-sm w-full', onclick: async () => {
          const amt = prompt('How much would you like to add?');
          if (!amt || isNaN(Number(amt)) || Number(amt) <= 0) return;
          try { await contributeSavings(goal.id, goal.current_amount, Number(amt)); toast('Contribution added.', 'success'); onChange(); }
          catch (err) { toast(err.message || 'Could not add contribution.', 'error'); }
        }
      }, [h('i', { class: 'fas fa-plus' }), 'Add Funds'])
    ]),
    h('div', { class: 'flex gap-8' }, [
      h('button', { class: 'btn btn-secondary btn-sm w-full', onclick: () => openSavingsModal({ existing: goal, onSaved: onChange }) }, 'Edit'),
      h('button', {
        class: 'btn btn-danger btn-sm w-full', onclick: async () => {
          const ok = await confirmDialog({ title: 'Delete goal?', message: `"${goal.name}" will be permanently removed.` });
          if (!ok) return;
          try { await deleteSavingsGoal(goal.id); toast('Goal deleted.', 'success'); onChange(); }
          catch (err) { toast(err.message || 'Could not delete.', 'error'); }
        }
      }, 'Delete')
    ])
  ]);
}

// =============================================================================
// TALLYO — Financial Calendar Page
// =============================================================================
import { h } from '../utils/dom.js';
import { renderShell } from '../components/layout.js';
import { loadingBlock, emptyState } from '../components/emptyState.js';
import { getState, subscribe } from '../store.js';
import { listTransactions } from '../services/transactionService.js';
import { listUpcoming } from '../services/upcomingService.js';
import { listRecurring } from '../services/recurringService.js';
import { formatMoney } from '../utils/currency.js';
import { toISODate, todayISO, formatLong } from '../utils/dates.js';
import { iconBadge } from '../components/icons.js';

let unsub = null;
let viewMonth = new Date();
let selectedDate = todayISO();

export async function renderCalendarPage() {
  if (unsub) unsub();
  viewMonth = new Date();
  selectedDate = todayISO();
  const content = renderShell({ route: '#/calendar', title: 'Financial Calendar', showPeriod: false });
  content.appendChild(loadingBlock());
  unsub = subscribe(() => load());
  await load();

  async function load() {
    const { categories } = getState();
    const monthStart = toISODate(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1));
    const monthEnd = toISODate(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0));

    const [txs, upcoming, recurring] = await Promise.all([
      listTransactions({ start: monthStart, end: monthEnd }),
      listUpcoming(),
      listRecurring()
    ]);

    const eventsByDate = new Map();
    const addEvent = (date, color) => {
      if (!eventsByDate.has(date)) eventsByDate.set(date, []);
      eventsByDate.get(date).push(color);
    };
    txs.forEach((t) => addEvent(t.transaction_date, t.type === 'income' ? '#16A34A' : '#E11D2E'));
    upcoming.filter((u) => u.due_date >= monthStart && u.due_date <= monthEnd && u.effective_status !== 'paid').forEach((u) => addEvent(u.due_date, '#F59E0B'));
    recurring.filter((r) => r.next_run_date >= monthStart && r.next_run_date <= monthEnd && r.is_active).forEach((r) => addEvent(r.next_run_date, '#2563EB'));

    content.innerHTML = '';
    content.appendChild(
      h('div', { class: 'grid', style: 'grid-template-columns: 2fr 1fr; gap:18px' }, [
        renderCalendarCard(eventsByDate, load),
        renderDayDetailCard(txs, upcoming, recurring, categories)
      ])
    );
  }
}

function renderCalendarCard(eventsByDate, onChange) {
  const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
  const firstDay = new Date(y, m, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthLabel = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const card = h('div', { class: 'card' }, [
    h('div', { class: 'card-header' }, [
      h('div', { class: 'card-title' }, monthLabel),
      h('div', { class: 'flex gap-8' }, [
        h('button', { class: 'btn btn-ghost btn-icon btn-sm', onclick: () => { viewMonth = new Date(y, m - 1, 1); onChange(); } }, [h('i', { class: 'fas fa-chevron-left' })]),
        h('button', { class: 'btn btn-ghost btn-icon btn-sm', onclick: () => { viewMonth = new Date(); onChange(); } }, 'Today'),
        h('button', { class: 'btn btn-ghost btn-icon btn-sm', onclick: () => { viewMonth = new Date(y, m + 1, 1); onChange(); } }, [h('i', { class: 'fas fa-chevron-right' })])
      ])
    ])
  ]);

  const dowRow = h('div', { class: 'calendar-grid', style: 'margin-bottom:4px' }, ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => h('div', { class: 'calendar-dow' }, d)));
  card.appendChild(dowRow);

  const grid = h('div', { class: 'calendar-grid' });
  for (let i = 0; i < startOffset; i++) grid.appendChild(h('div', { class: 'calendar-cell other-month' }));
  const today = todayISO();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateISO = toISODate(new Date(y, m, d));
    const dots = (eventsByDate.get(dateISO) || []).slice(0, 4);
    const cell = h('div', {
      class: `calendar-cell${dateISO === today ? ' today' : ''}${dateISO === selectedDate ? ' selected' : ''}`,
      onclick: () => { selectedDate = dateISO; onChange(); }
    }, [
      h('div', { class: 'calendar-date' }, String(d)),
      h('div', { class: 'calendar-dot-row' }, dots.map((c) => h('span', { class: 'calendar-dot', style: `background:${c}` })))
    ]);
    grid.appendChild(cell);
  }
  card.appendChild(grid);

  card.appendChild(
    h('div', { class: 'flex gap-12', style: 'margin-top:16px;font-size:11.5px;color:var(--text-muted)' }, [
      legendDot('#16A34A', 'Income'), legendDot('#E11D2E', 'Expense'), legendDot('#F59E0B', 'Upcoming'), legendDot('#2563EB', 'Recurring')
    ])
  );
  return card;
}

function legendDot(color, label) {
  return h('span', { class: 'flex items-center gap-8' }, [h('span', { class: 'legend-dot', style: `background:${color}` }), label]);
}

function renderDayDetailCard(txs, upcoming, recurring, categories) {
  const card = h('div', { class: 'card' }, [h('div', { class: 'card-title' }, formatLong(selectedDate))]);
  const dayTxs = txs.filter((t) => t.transaction_date === selectedDate);
  const dayUpcoming = upcoming.filter((u) => u.due_date === selectedDate);
  const dayRecurring = recurring.filter((r) => r.next_run_date === selectedDate);

  if (!dayTxs.length && !dayUpcoming.length && !dayRecurring.length) {
    card.appendChild(emptyState({ icon: 'fa-calendar', title: 'Nothing on this day', message: 'No transactions or events recorded.' }));
    return card;
  }

  const list = h('div', { class: 'list' });
  dayTxs.forEach((t) => {
    const cat = categories.find((c) => c.id === t.category_id);
    list.appendChild(h('div', { class: 'list-item' }, [
      iconBadge(cat?.icon, cat?.color),
      h('div', { class: 'list-main' }, [h('div', { class: 'list-title' }, t.description || cat?.name || 'Transaction'), h('div', { class: 'list-sub' }, 'Transaction')]),
      h('div', { class: `list-amount ${t.type}` }, `${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}`)
    ]));
  });
  dayUpcoming.forEach((u) => {
    list.appendChild(h('div', { class: 'list-item' }, [
      iconBadge('fa-file-invoice-dollar', '#F59E0B'),
      h('div', { class: 'list-main' }, [h('div', { class: 'list-title' }, u.name), h('div', { class: 'list-sub' }, 'Upcoming expense')]),
      h('div', { class: 'list-amount expense' }, formatMoney(u.amount))
    ]));
  });
  dayRecurring.forEach((r) => {
    list.appendChild(h('div', { class: 'list-item' }, [
      iconBadge('fa-rotate', '#2563EB'),
      h('div', { class: 'list-main' }, [h('div', { class: 'list-title' }, r.description), h('div', { class: 'list-sub' }, 'Recurring')]),
      h('div', { class: `list-amount ${r.type}` }, formatMoney(r.amount))
    ]));
  });
  card.appendChild(list);
  return card;
}

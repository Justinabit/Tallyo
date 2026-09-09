// =============================================================================
// TALLYO — Sidebar navigation
// =============================================================================
import { h } from '../utils/dom.js';
import { signOut } from '../services/authService.js';
import { getState } from '../store.js';

const NAV_ITEMS = [
  { route: '#/dashboard', icon: 'fa-gauge-high', label: 'Dashboard' },
  { route: '#/transactions', icon: 'fa-arrow-right-arrow-left', label: 'Transactions' },
  { route: '#/budgets', icon: 'fa-sack-dollar', label: 'Budgets' },
  { route: '#/wallets', icon: 'fa-wallet', label: 'Wallets' },
  { route: '#/savings', icon: 'fa-piggy-bank', label: 'Savings' },
  { route: '#/calendar', icon: 'fa-calendar-days', label: 'Calendar' },
  { route: '#/reports', icon: 'fa-chart-pie', label: 'Reports' },
  { route: '#/settings', icon: 'fa-gear', label: 'Settings' }
];

export function renderSidebar(activeRoute) {
  const { profile, user } = getState();
  const initials = (profile?.full_name || user?.email || '?').trim().charAt(0).toUpperCase();

  const nav = h('ul', { class: 'sidebar-nav' }, NAV_ITEMS.map((item) =>
    h('li', {
      class: `nav-item${activeRoute.startsWith(item.route) ? ' active' : ''}`,
      onclick: () => { window.location.hash = item.route; document.getElementById('sidebar')?.classList.remove('open'); document.getElementById('sidebar-backdrop')?.classList.remove('show'); }
    }, [h('i', { class: `fas ${item.icon}` }), h('span', {}, item.label)])
  ));

  const footer = h('div', { class: 'sidebar-footer' }, [
    h('div', { class: 'user-chip', onclick: () => { window.location.hash = '#/settings'; } }, [
      h('div', { class: 'user-avatar' }, initials),
      h('div', { class: 'user-meta' }, [
        h('div', { class: 'user-name' }, profile?.full_name || 'My Account'),
        h('div', { class: 'user-email' }, user?.email || '')
      ]),
      h('button', {
        class: 'btn btn-ghost btn-icon', title: 'Log out',
        onclick: async (e) => { e.stopPropagation(); await signOut(); window.location.hash = '#/login'; }
      }, [h('i', { class: 'fas fa-arrow-right-from-bracket' })])
    ])
  ]);

  const sidebar = h('aside', { class: 'sidebar', id: 'sidebar' }, [
    h('div', { class: 'sidebar-brand' }, [
      h('div', { class: 'brand-mark' }, 'T'),
      h('div', {}, [
        h('span', { class: 'brand-name' }, 'Tallyo'),
        h('span', { class: 'brand-tag' }, 'Track it. Plan it. Keep it.')
      ])
    ]),
    nav,
    footer
  ]);

  return sidebar;
}

export function renderSidebarBackdrop() {
  const el = h('div', { class: 'sidebar-backdrop', id: 'sidebar-backdrop' });
  el.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.remove('open');
    el.classList.remove('show');
  });
  return el;
}

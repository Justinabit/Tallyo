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

const COLLAPSE_KEY = 'tallyo-sidebar-collapsed';

// Desktop-only "minimized rail" state: collapsed shows icons only, hovering
// temporarily reveals labels (see the .sidebar.collapsed:hover rules in
// styles.css), and this toggle button pins/unpins the collapsed state so it
// persists across page navigations (the whole shell re-renders on every
// route change, so this can't just live as in-memory component state).
export function isSidebarCollapsed() {
  return localStorage.getItem(COLLAPSE_KEY) === '1';
}

function setSidebarCollapsed(collapsed) {
  localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  document.getElementById('sidebar')?.classList.toggle('collapsed', collapsed);
  document.querySelector('.main-area')?.classList.toggle('sidebar-collapsed', collapsed);
  const icon = document.querySelector('.sidebar-collapse-toggle i');
  if (icon) icon.className = `fas ${collapsed ? 'fa-angles-right' : 'fa-angles-left'}`;
  const btn = document.querySelector('.sidebar-collapse-toggle');
  if (btn) btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
}

export function renderSidebar(activeRoute) {
  const { profile, user } = getState();
  const initials = (profile?.full_name || user?.email || '?').trim().charAt(0).toUpperCase();
  const collapsed = isSidebarCollapsed();

  const nav = h('ul', { class: 'sidebar-nav' }, NAV_ITEMS.map((item) =>
    h('li', {
      class: `nav-item${activeRoute.startsWith(item.route) ? ' active' : ''}`,
      title: item.label,
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
        class: 'btn btn-ghost btn-icon', title: 'Log out', 'aria-label': 'Log out',
        onclick: async (e) => { e.stopPropagation(); await signOut(); window.location.hash = '#/login'; }
      }, [h('i', { class: 'fas fa-arrow-right-from-bracket' })])
    ])
  ]);

  const collapseToggle = h('button', {
    class: 'sidebar-collapse-toggle',
    title: collapsed ? 'Expand sidebar' : 'Collapse sidebar',
    'aria-label': collapsed ? 'Expand sidebar' : 'Collapse sidebar',
    onclick: (e) => { e.stopPropagation(); setSidebarCollapsed(!isSidebarCollapsed()); }
  }, [h('i', { class: `fas ${collapsed ? 'fa-angles-right' : 'fa-angles-left'}` })]);

  const sidebar = h('aside', { class: `sidebar${collapsed ? ' collapsed' : ''}`, id: 'sidebar' }, [
    h('div', { class: 'sidebar-brand' }, [
      h('div', { class: 'brand-mark' }, 'T'),
      h('div', { class: 'brand-text' }, [
        h('span', { class: 'brand-name' }, 'Tallyo'),
        h('span', { class: 'brand-tag' }, 'Track it. Plan it. Keep it.')
      ]),
      collapseToggle
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
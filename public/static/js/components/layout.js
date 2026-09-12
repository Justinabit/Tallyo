// =============================================================================
// TALLYO — Authenticated app shell (sidebar + topbar + content mount)
// =============================================================================
import { h } from '../utils/dom.js';
import { renderSidebar, renderSidebarBackdrop, isSidebarCollapsed } from './sidebar.js';
import { renderTopbar } from './topbar.js';
import { destroyChartsIn } from './charts.js';

/**
 * Renders the full app shell into #app-root and returns the empty
 * `.page-content` element pages should fill with their own markup.
 */
export function renderShell({ route, title, onPeriodChange, showPeriod = true, actions = [] } = {}) {
  const root = document.getElementById('app-root');
  // Navigating to a different page also wipes out any charts left over
  // from the previous page (e.g. leaving the Dashboard/Reports pages) —
  // destroy them first so they don't keep running in the background.
  destroyChartsIn(root);
  root.innerHTML = '';

  const content = h('div', { class: 'page-content' });
  const main = h('div', { class: `main-area${isSidebarCollapsed() ? ' sidebar-collapsed' : ''}` }, [
    renderTopbar(title, { onPeriodChange, showPeriod, actions }),
    content
  ]);

  root.appendChild(renderSidebar(route));
  root.appendChild(renderSidebarBackdrop());
  root.appendChild(main);

  return content;
}
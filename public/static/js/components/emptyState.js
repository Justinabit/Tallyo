// =============================================================================
// TALLYO — Reusable empty / loading state blocks
// =============================================================================
import { h } from '../utils/dom.js';

export function emptyState({ icon = 'fa-inbox', title, message, actionLabel, onAction }) {
  const children = [
    h('i', { class: `fas ${icon}` }),
    h('h4', {}, title),
    h('p', {}, message)
  ];
  if (actionLabel) {
    children.push(h('button', { class: 'btn btn-primary btn-sm', onclick: onAction }, actionLabel));
  }
  return h('div', { class: 'empty-state' }, children);
}

export function loadingBlock(label = 'Loading…') {
  return h('div', { class: 'loading-block' }, [h('div', { class: 'spinner' }), h('span', {}, label)]);
}
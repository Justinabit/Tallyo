// =============================================================================
// TALLYO — Public Landing Page
// =============================================================================
import { h } from '../utils/dom.js';

export function renderLandingPage() {
  const root = document.getElementById('app-root');
  root.innerHTML = '';

  const nav = h('nav', { class: 'public-nav' }, [
    h('div', { class: 'flex items-center gap-8' }, [
      h('div', { class: 'brand-mark' }, 'T'),
      h('span', { style: 'font-size:18px;font-weight:800' }, 'Tallyo')
    ]),
    h('div', { class: 'flex gap-8' }, [
      h('button', { class: 'btn btn-ghost', onclick: () => (window.location.hash = '#/login') }, 'Log In'),
      h('button', { class: 'btn btn-primary', onclick: () => (window.location.hash = '#/signup') }, 'Get Started')
    ])
  ]);

  const hero = h('section', { class: 'public-hero' }, [
    h('div', { style: 'max-width:640px' }, [
      h('h1', { style: 'font-size:42px;font-weight:800;letter-spacing:-1px;line-height:1.15;margin-bottom:16px' }, 'Track it. Plan it. Keep it.'),
      h('p', { style: 'font-size:16px;color:var(--text-muted);margin-bottom:26px;line-height:1.7' },
        'Tallyo is a clean, professional budgeting app that helps you see exactly where your money goes, set budgets that stick, and reach your savings goals — without the clutter.'),
      h('div', { class: 'flex gap-12' }, [
        h('button', { class: 'btn btn-primary', style: 'padding:13px 24px', onclick: () => (window.location.hash = '#/signup') }, [h('i', { class: 'fas fa-rocket' }), 'Start Tracking Free']),
        h('button', { class: 'btn btn-outline', style: 'padding:13px 24px', onclick: () => (window.location.hash = '#/login') }, 'I already have an account')
      ])
    ]),
    h('div', { class: 'grid grid-cols-3', style: 'margin-top:56px' }, [
      featureCard('fa-chart-pie', 'See where it goes', 'Automatic category breakdowns show exactly what you spend on most.'),
      featureCard('fa-sack-dollar', 'Budgets that work', 'Set weekly, monthly, or yearly budgets and get warned before you overspend.'),
      featureCard('fa-piggy-bank', 'Reach your goals', 'Track savings goals with real progress, not guesswork.')
    ])
  ]);

  const footer = h('footer', { style: 'text-align:center;padding:40px 24px;color:var(--text-faint);font-size:12px' }, [
    h('div', { class: 'flex gap-12', style: 'justify-content:center;margin-bottom:10px' }, [
      h('a', { style: 'cursor:pointer', onclick: () => (window.location.hash = '#/privacy') }, 'Privacy'),
      h('a', { style: 'cursor:pointer', onclick: () => (window.location.hash = '#/terms') }, 'Terms & Disclaimer')
    ]),
    '© ' + new Date().getFullYear() + ' Tallyo. Track it. Plan it. Keep it.'
  ]);

  root.appendChild(h('div', { class: 'public-page' }, [nav, hero, footer]));
}

function featureCard(icon, title, desc) {
  return h('div', { class: 'card' }, [
    h('div', { class: 'stat-icon', style: 'background:var(--primary-soft);color:var(--primary);margin-bottom:12px' }, [h('i', { class: `fas ${icon}` })]),
    h('div', { style: 'font-weight:700;font-size:14.5px;margin-bottom:6px' }, title),
    h('p', { class: 'text-muted', style: 'font-size:13px;margin:0' }, desc)
  ]);
}

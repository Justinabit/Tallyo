// =============================================================================
// TALLYO — Privacy Policy & Terms/Disclaimer Pages
// =============================================================================
import { h } from '../utils/dom.js';

function legalHeader() {
  return h('nav', { class: 'public-nav' }, [
    h('div', { class: 'flex items-center gap-8', style: 'cursor:pointer', onclick: () => (window.location.hash = '#/') }, [
      h('div', { class: 'brand-mark' }, 'T'),
      h('span', { style: 'font-size:18px;font-weight:800' }, 'Tallyo')
    ]),
    h('button', { class: 'btn btn-secondary', onclick: () => window.history.back() }, [h('i', { class: 'fas fa-arrow-left' }), 'Back'])
  ]);
}

export function renderPrivacyPage() {
  const root = document.getElementById('app-root');
  root.innerHTML = '';
  root.appendChild(
    h('div', { class: 'public-page' }, [
      legalHeader(),
      h('div', { class: 'public-content' }, [
        h('h1', {}, 'Privacy Policy'),
        h('p', {}, `Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`),

        h('h2', {}, 'What information Tallyo stores'),
        h('p', {}, 'Tallyo stores the information you provide in order to operate your personal budgeting account: your email address and name (for authentication and identification), and the financial data you enter yourself — transactions, wallets, budgets, savings goals, recurring transactions, and upcoming expenses.'),

        h('h2', {}, 'Why financial information is stored'),
        h('p', {}, 'Your financial data is stored so that it can be displayed back to you, synced across your devices, and used to calculate your dashboard statistics, budget progress, and reports. Tallyo does not sell your financial data or share it with third parties for advertising purposes.'),

        h('h2', {}, 'How your data is protected'),
        h('ul', {}, [
          h('li', {}, 'All data is stored in Supabase (PostgreSQL) with Row Level Security enabled on every table.'),
          h('li', {}, 'Row Level Security policies ensure that a user can only ever read or modify their own records — never another user\u2019s.'),
          h('li', {}, 'Authentication is handled by Supabase Auth using secure, industry-standard practices.'),
          h('li', {}, 'Optional AI-generated insights are produced from already-calculated summary numbers only — never your raw transaction list — and are processed through a server-side proxy that keeps the AI API key secret.')
        ]),

        h('h2', {}, 'How you can delete your information'),
        h('p', {}, 'You can export all of your data at any time from Settings → Data & Privacy. You can also permanently delete your account and associated financial records from the same page. Deletion is permanent and cannot be undone.'),

        h('h2', {}, 'Changes to this policy'),
        h('p', {}, 'If this policy changes, the "Last updated" date above will be revised. Continued use of Tallyo after changes means you accept the updated policy.')
      ])
    ])
  );
}

export function renderTermsPage() {
  const root = document.getElementById('app-root');
  root.innerHTML = '';
  root.appendChild(
    h('div', { class: 'public-page' }, [
      legalHeader(),
      h('div', { class: 'public-content' }, [
        h('h1', {}, 'Terms of Use & Financial Disclaimer'),
        h('p', {}, `Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`),

        h('h2', {}, 'What Tallyo is'),
        h('p', {}, 'Tallyo is a personal budgeting and financial tracking tool. It helps you record income and expenses, set budgets, track savings goals, and view reports based on the data you enter.'),

        h('h2', {}, 'Financial disclaimer'),
        h('p', {}, 'Tallyo is NOT a financial advisor and does not provide professional financial, investment, tax, or legal advice. Any insights, suggestions, or "safe spending" recommendations shown in the app — including any AI-generated observations — are provided for informational purposes only, are based solely on the data you enter, and should not be relied upon as the sole basis for financial decisions.'),

        h('h2', {}, 'Accuracy of data'),
        h('p', {}, 'All calculations (balances, budget usage, savings progress, comparisons) are computed deterministically from the transactions and records you enter. Tallyo cannot verify the accuracy of information you provide, and is not responsible for decisions made based on inaccurate or incomplete user-entered data.'),

        h('h2', {}, 'Your responsibilities'),
        h('ul', {}, [
          h('li', {}, 'Keep your login credentials confidential.'),
          h('li', {}, 'Ensure the data you enter is accurate to the best of your knowledge.'),
          h('li', {}, 'Use Tallyo for lawful, personal budgeting purposes only.')
        ]),

        h('h2', {}, 'Limitation of liability'),
        h('p', {}, 'Tallyo is provided "as is" without warranties of any kind. We are not liable for any financial loss, missed payments, or decisions resulting from the use of this application.'),

        h('h2', {}, 'Changes'),
        h('p', {}, 'These terms may be updated from time to time. Continued use of Tallyo after changes means you accept the updated terms.')
      ])
    ])
  );
}

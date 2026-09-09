// =============================================================================
// TALLYO — Settings Page
// =============================================================================
import { h, toast, confirmDialog } from '../utils/dom.js';
import { renderShell } from '../components/layout.js';
import { getState, setState } from '../store.js';
import { updateProfile, updatePreferences } from '../services/profileService.js';
import { listCategories, createCategory, deleteCategory } from '../services/categoryService.js';
import { listWallets } from '../services/walletService.js';
import { listTransactions } from '../services/transactionService.js';
import { listBudgets } from '../services/budgetService.js';
import { listSavingsGoals } from '../services/savingsService.js';
import { setActiveCurrency, CURRENCIES } from '../utils/currency.js';
import { applyTheme } from '../utils/theme.js';
import { exportToJson, exportTransactionsToCsv } from '../services/exportService.js';
import { getSupabaseClient } from '../config/supabase.js';
import { signOut } from '../services/authService.js';

let activeTab = 'profile';

export async function renderSettingsPage() {
  activeTab = 'profile';
  const content = renderShell({ route: '#/settings', title: 'Settings', showPeriod: false });
  await load();

  async function load() {
    content.innerHTML = '';
    const tabs = h('div', { class: 'tabs' }, [
      tabBtn('profile', 'Profile'),
      tabBtn('preferences', 'Preferences'),
      tabBtn('categories', 'Categories'),
      tabBtn('data', 'Data & Privacy')
    ]);
    content.appendChild(tabs);

    const body = h('div', { style: 'max-width:640px' });
    content.appendChild(body);

    if (activeTab === 'profile') renderProfileTab(body);
    else if (activeTab === 'preferences') renderPreferencesTab(body);
    else if (activeTab === 'categories') await renderCategoriesTab(body);
    else renderDataTab(body);
  }

  function tabBtn(key, label) {
    const btn = h('button', { class: `tab-btn${activeTab === key ? ' active' : ''}` }, label);
    btn.onclick = () => { activeTab = key; load(); };
    return btn;
  }
}

function renderProfileTab(body) {
  const { profile, user } = getState();
  const nameInput = h('input', { class: 'input', value: profile?.full_name || '' });
  const emailDisplay = h('input', { class: 'input', value: user?.email || '', disabled: true });

  body.appendChild(
    h('div', { class: 'card' }, [
      h('div', { class: 'card-title', style: 'margin-bottom:16px' }, 'Profile Information'),
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Full Name'), nameInput]),
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Email'), emailDisplay, h('div', { class: 'field-hint' }, 'Email cannot be changed here.')]),
      h('button', {
        class: 'btn btn-primary', onclick: async () => {
          try {
            const updated = await updateProfile(user.id, { full_name: nameInput.value.trim() });
            setState({ profile: updated });
            toast('Profile updated.', 'success');
          } catch (err) { toast(err.message || 'Could not update profile.', 'error'); }
        }
      }, 'Save Changes')
    ])
  );

  body.appendChild(
    h('div', { class: 'card', style: 'margin-top:18px' }, [
      h('div', { class: 'card-title', style: 'margin-bottom:12px' }, 'Account'),
      h('button', { class: 'btn btn-outline', onclick: async () => { await signOut(); window.location.hash = '#/login'; } }, [h('i', { class: 'fas fa-arrow-right-from-bracket' }), 'Log Out'])
    ])
  );
}

function renderPreferencesTab(body) {
  const { preferences, user } = getState();

  const currencySelect = h('select', { class: 'input' }, Object.keys(CURRENCIES).map((code) =>
    h('option', { value: code, selected: (preferences?.currency || 'PHP') === code || undefined }, `${code} (${CURRENCIES[code].symbol})`)
  ));

  const themeSelect = h('select', {
    class: 'input',
    // Applies AND persists on every change, independent of the "Save
    // Preferences" button below. Previously this only updated the current
    // tab (data-theme attr + localStorage) — nothing was written to
    // Supabase unless you also clicked Save, so the choice was lost on
    // your next login (which re-applies whatever preferences.theme was
    // last actually saved, silently overwriting the unsaved local pick).
    onchange: async (e) => {
      const value = e.target.value;
      applyTheme(value);
      try {
        const updated = await updatePreferences(user.id, { theme: value });
        setState({ preferences: updated });
        toast('Theme saved.', 'success');
      } catch (err) {
        toast(err.message || 'Could not save theme.', 'error');
      }
    }
  }, [
    h('option', { value: 'light', selected: preferences?.theme === 'light' || undefined }, 'Light'),
    h('option', { value: 'dark', selected: preferences?.theme === 'dark' || undefined }, 'Dark'),
    h('option', { value: 'system', selected: (preferences?.theme || 'system') === 'system' || undefined }, 'System (Auto)')
  ]);

  const periodSelect = h('select', { class: 'input' }, ['weekly', 'monthly', 'yearly'].map((p) =>
    h('option', { value: p, selected: (preferences?.budget_period_default || 'monthly') === p || undefined }, p[0].toUpperCase() + p.slice(1))
  ));

  const notifCheckbox = h('input', { type: 'checkbox', checked: preferences?.notifications_enabled !== false || undefined });

  body.appendChild(
    h('div', { class: 'card' }, [
      h('div', { class: 'card-title', style: 'margin-bottom:16px' }, 'App Preferences'),
      h('div', { class: 'form-row' }, [
        h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Currency'), currencySelect]),
        h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Theme'), themeSelect])
      ]),
      h('div', { class: 'form-group' }, [h('label', { class: 'field-label' }, 'Default Budget Period'), periodSelect]),
      h('label', { class: 'checkbox-row', style: 'margin-bottom:16px' }, [notifCheckbox, h('span', {}, 'Enable budget & bill notifications')]),
      h('button', {
        class: 'btn btn-primary', onclick: async () => {
          try {
            const updates = {
              currency: currencySelect.value,
              theme: themeSelect.value,
              budget_period_default: periodSelect.value,
              notifications_enabled: notifCheckbox.checked
            };
            const updated = await updatePreferences(user.id, updates);
            setState({ preferences: updated });
            setActiveCurrency(updated.currency);
            applyTheme(updated.theme);
            toast('Preferences saved.', 'success');
          } catch (err) { toast(err.message || 'Could not save preferences.', 'error'); }
        }
      }, 'Save Preferences')
    ])
  );
}

async function renderCategoriesTab(body) {
  const categories = await listCategories();
  const { categories: stateCategories } = getState();

  const nameInput = h('input', { class: 'input', placeholder: 'Category name' });
  const typeSelect = h('select', { class: 'input' }, [h('option', { value: 'expense' }, 'Expense'), h('option', { value: 'income' }, 'Income')]);
  const colorInput = h('input', { type: 'color', value: '#E11D2E', style: 'width:44px;height:38px;padding:2px;border-radius:8px;border:1px solid var(--border-strong)' });

  body.appendChild(
    h('div', { class: 'card', style: 'margin-bottom:18px' }, [
      h('div', { class: 'card-title', style: 'margin-bottom:12px' }, 'Add Custom Category'),
      h('div', { class: 'flex gap-8', style: 'align-items:flex-end' }, [
        h('div', { style: 'flex:1' }, [h('label', { class: 'field-label' }, 'Name'), nameInput]),
        h('div', {}, [h('label', { class: 'field-label' }, 'Type'), typeSelect]),
        h('div', {}, [h('label', { class: 'field-label' }, 'Color'), colorInput]),
        h('button', {
          class: 'btn btn-primary', onclick: async () => {
            if (!nameInput.value.trim()) { toast('Category name is required.', 'error'); return; }
            try {
              await createCategory({ name: nameInput.value.trim(), type: typeSelect.value, color: colorInput.value, icon: 'fa-tag' });
              toast('Category added.', 'success');
              const refreshed = await listCategories();
              setState({ categories: refreshed });
              renderSettingsPage();
            } catch (err) { toast(err.message || 'Could not add category.', 'error'); }
          }
        }, 'Add')
      ])
    ])
  );

  const card = h('div', { class: 'card' }, [h('div', { class: 'card-title', style: 'margin-bottom:8px' }, 'All Categories')]);
  const list = h('div', { class: 'list' });
  categories.forEach((c) => {
    list.appendChild(
      h('div', { class: 'list-item' }, [
        h('div', { class: 'list-icon', style: `background:${c.color}22;color:${c.color}` }, [h('i', { class: `fas ${c.icon}` })]),
        h('div', { class: 'list-main' }, [h('div', { class: 'list-title' }, c.name), h('div', { class: 'list-sub' }, `${c.type} ${c.is_default ? '· Default' : '· Custom'}`)]),
        !c.is_default ? h('button', {
          class: 'btn btn-ghost btn-icon btn-sm', onclick: async () => {
            const ok = await confirmDialog({ title: 'Delete category?', message: `"${c.name}" will be removed. Existing transactions keep their history.` });
            if (!ok) return;
            try { await deleteCategory(c.id); toast('Category deleted.', 'success'); const refreshed = await listCategories(); setState({ categories: refreshed }); renderSettingsPage(); }
            catch (err) { toast(err.message || 'Could not delete.', 'error'); }
          }
        }, [h('i', { class: 'fas fa-trash', style: 'font-size:12px;color:var(--danger)' })]) : h('span', { class: 'badge badge-muted' }, 'Default')
      ])
    );
  });
  card.appendChild(list);
  body.appendChild(card);
}

function renderDataTab(body) {
  const { user } = getState();

  body.appendChild(
    h('div', { class: 'card', style: 'margin-bottom:18px' }, [
      h('div', { class: 'card-title', style: 'margin-bottom:6px' }, 'Export Your Data'),
      h('p', { class: 'text-muted', style: 'font-size:12.5px;margin-bottom:14px' }, 'Download a copy of your financial data at any time.'),
      h('div', { class: 'flex gap-8' }, [
        h('button', {
          class: 'btn btn-secondary', onclick: async () => {
            const tx = await listTransactions({});
            const wallets = await listWallets();
            const budgets = await listBudgets();
            const goals = await listSavingsGoals();
            exportToJson({ transactions: tx, wallets, budgets, savings_goals: goals, exported_at: new Date().toISOString() });
          }
        }, [h('i', { class: 'fas fa-file-code' }), 'Export as JSON']),
        h('button', {
          class: 'btn btn-secondary', onclick: async () => {
            const tx = await listTransactions({});
            const { categories, wallets } = getState();
            exportTransactionsToCsv(tx, new Map(categories.map((c) => [c.id, c])), new Map(wallets.map((w) => [w.id, w])));
          }
        }, [h('i', { class: 'fas fa-file-csv' }), 'Export Transactions (CSV)'])
      ])
    ])
  );

  body.appendChild(
    h('div', { class: 'card', style: 'margin-bottom:18px' }, [
      h('div', { class: 'card-title', style: 'margin-bottom:6px' }, 'Privacy & Terms'),
      h('div', { class: 'flex gap-12', style: 'margin-top:10px' }, [
        h('a', { style: 'color:var(--primary);font-weight:700;font-size:13px;cursor:pointer', onclick: () => (window.location.hash = '#/privacy') }, 'Privacy Policy'),
        h('a', { style: 'color:var(--primary);font-weight:700;font-size:13px;cursor:pointer', onclick: () => (window.location.hash = '#/terms') }, 'Terms & Disclaimer')
      ])
    ])
  );

  body.appendChild(
    h('div', { class: 'card' }, [
      h('div', { class: 'card-title', style: 'margin-bottom:6px;color:var(--danger)' }, 'Danger Zone'),
      h('p', { class: 'text-muted', style: 'font-size:12.5px;margin-bottom:14px' }, 'Permanently delete your account and all associated financial data. This cannot be undone.'),
      h('button', {
        class: 'btn btn-danger', onclick: async () => {
          const ok = await confirmDialog({ title: 'Delete your account?', message: 'This will permanently erase all of your Tallyo data. This action cannot be undone.', confirmLabel: 'Delete Everything' });
          if (!ok) return;
          const doubleCheck = await confirmDialog({ title: 'Are you absolutely sure?', message: 'There is no way to recover your data after this.', confirmLabel: 'Yes, delete my account' });
          if (!doubleCheck) return;
          try {
            const supabase = await getSupabaseClient();
            // Row-level cascading deletes (transactions, budgets, etc.) happen automatically
            // via ON DELETE CASCADE once the profile/auth user is removed. Client-side apps
            // cannot call the admin API to delete an auth user directly for security reasons,
            // so we sign the user out and instruct them; a server-side admin action (edge
            // function) is the recommended approach for full auth.users deletion.
            await supabase.from('profiles').delete().eq('id', user.id);
            await signOut();
            toast('Your data has been deleted. Please contact support to fully remove your login.', 'info');
            window.location.hash = '#/login';
          } catch (err) { toast(err.message || 'Could not delete account.', 'error'); }
        }
      }, [h('i', { class: 'fas fa-triangle-exclamation' }), 'Delete My Account & Data'])
    ])
  );
}
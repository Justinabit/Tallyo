// =============================================================================
// TALLYO — App bootstrap & hash router
// =============================================================================
import { getSupabaseClient } from './config/supabase.js';
import { getSession, onAuthStateChange } from './services/authService.js';
import { getProfile, getPreferences } from './services/profileService.js';
import { listCategories } from './services/categoryService.js';
import { listWallets } from './services/walletService.js';
import { setState, getState } from './store.js';
import { setActiveCurrency } from './utils/currency.js';
import { applyTheme, getCachedThemeSetting, watchSystemTheme } from './utils/theme.js';

import { renderLandingPage } from './pages/landing.js';
import { renderLoginPage, renderSignupPage, renderForgotPasswordPage, renderResetPasswordPage } from './pages/auth.js';
import { renderPrivacyPage, renderTermsPage } from './pages/legal.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderTransactionsPage } from './pages/transactions.js';
import { renderBudgetsPage } from './pages/budgets.js';
import { renderWalletsPage } from './pages/wallets.js';
import { renderSavingsPage } from './pages/savings.js';
import { renderCalendarPage } from './pages/calendar.js';
import { renderReportsPage } from './pages/reports.js';
import { renderSettingsPage } from './pages/settings.js';

const PUBLIC_ROUTES = new Set(['#/', '#/login', '#/signup', '#/forgot-password', '#/reset-password', '#/privacy', '#/terms']);

const ROUTES = {
  '#/': renderLandingPage,
  '#/login': renderLoginPage,
  '#/signup': renderSignupPage,
  '#/forgot-password': renderForgotPasswordPage,
  '#/reset-password': renderResetPasswordPage,
  '#/privacy': renderPrivacyPage,
  '#/terms': renderTermsPage,
  '#/dashboard': renderDashboard,
  '#/transactions': renderTransactionsPage,
  '#/budgets': renderBudgetsPage,
  '#/wallets': renderWalletsPage,
  '#/savings': renderSavingsPage,
  '#/calendar': renderCalendarPage,
  '#/reports': renderReportsPage,
  '#/settings': renderSettingsPage
};

let bootstrapped = false;

async function loadUserContext(user) {
  const [profile, preferences, categories, wallets] = await Promise.all([
    getProfile(user.id).catch(() => null),
    getPreferences(user.id).catch(() => null),
    listCategories().catch(() => []),
    listWallets().catch(() => [])
  ]);
  setState({ user, profile, preferences, categories, wallets });
  if (preferences?.currency) setActiveCurrency(preferences.currency);
  // Default to 'system' for accounts that predate the theme setting (or
  // whose saved value is the old 'light' default nobody actually chose).
  applyTheme(preferences?.theme || 'system');
}

async function router() {
  const hash = window.location.hash || '#/';
  const route = ROUTES[hash] ? hash : (PUBLIC_ROUTES.has(hash) ? hash : null);

  const session = await getSession();
  const isPublic = PUBLIC_ROUTES.has(hash);

  if (!session && !isPublic) {
    window.location.hash = '#/login';
    return;
  }

  if (session && (hash === '#/login' || hash === '#/signup' || hash === '#/' )) {
    window.location.hash = '#/dashboard';
    return;
  }

  if (session && !getState().user) {
    await loadUserContext(session.user);
  }

  const renderFn = ROUTES[route] || ROUTES['#/'];
  try {
    await renderFn();
  } catch (err) {
    console.error('[Tallyo] Route render failed', err);
    document.getElementById('app-root').innerHTML =
      '<div style="padding:60px;text-align:center;color:#6B7280">Something went wrong loading this page. Please refresh.</div>';
  }
}

async function bootstrap() {
  // Apply a cached theme choice immediately, before we've even reached
  // Supabase — otherwise every page load (and every public page, since
  // loadUserContext() only ever runs after login) briefly flashes light
  // mode while the session/preferences round-trip is in flight. Defaults
  // to 'system' for a first-ever visit (nothing cached yet).
  applyTheme(getCachedThemeSetting());
  // Keep following the OS live if the saved setting is 'system' — e.g. the
  // user's OS flips to dark mode at sunset while the tab is already open.
  watchSystemTheme(getCachedThemeSetting);

  await getSupabaseClient();

  onAuthStateChange(async (_event, session) => {
    if (!session) {
      setState({ user: null, profile: null, preferences: null, categories: [], wallets: [] });
      // Previously this only cleared state and stopped — if you were on a
      // protected page when the session expired (e.g. tab left open
      // overnight), the page just sat there instead of sending you to
      // log back in. Re-run the router so it can redirect immediately.
      if (bootstrapped) router();
    } else if (bootstrapped && !getState().user) {
      // Session came back (e.g. token silently refreshed after being
      // stale) but we never loaded the user context for it — load it now
      // instead of leaving the app in limbo.
      router();
    }
  });

  window.addEventListener('hashchange', router);
  if (!window.location.hash) window.location.hash = '#/';
  await router();
  bootstrapped = true;
}

bootstrap();
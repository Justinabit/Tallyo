// =============================================================================
// TALLYO — Supabase Configuration
// =============================================================================
// This is the ONLY file that knows how to reach Supabase.
//
// The actual URL + anon key are NOT hardcoded here. They are fetched at
// runtime from our own backend ("/api/config"), which reads them from
// Cloudflare environment variables. This means the developer only ever has
// to set two values, in ONE place:
//
//   Local dev  → .dev.vars           (SUPABASE_URL / SUPABASE_ANON_KEY)
//   Production → wrangler pages secret / dashboard environment variables
//
// 🔑 SUPABASE URL — REQUIRED
// 🔑 SUPABASE ANON KEY — REQUIRED
// (Both are safe to expose to the browser — Row Level Security protects the
//  actual data. See SUPABASE_SETUP.md for where to find these values.)
// =============================================================================

let _client = null;
let _configPromise = null;

async function fetchRuntimeConfig() {
  const controller = new AbortController();
  // Without a timeout, a hung /api/config request left everything that
  // depends on getSupabaseClient() (i.e. the entire app) waiting forever.
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('/api/config', { signal: controller.signal });
    if (!res.ok) throw new Error('config fetch failed');
    return await res.json();
  } catch (err) {
    console.error('[Tallyo] Failed to load /api/config', err);
    return { SUPABASE_URL: '', SUPABASE_ANON_KEY: '', AI_ENABLED: false };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns a ready-to-use Supabase client (singleton).
 * Waits for /api/config on first call, then reuses the same client.
 */
export async function getSupabaseClient() {
  if (_client) return _client;
  if (!_configPromise) _configPromise = fetchRuntimeConfig();
  const cfg = await _configPromise;

  window.__TALLYO_ENV__ = window.__TALLYO_ENV__ || {};
  window.__TALLYO_ENV__.AI_ENABLED = !!cfg.AI_ENABLED;

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.warn(
      '[Tallyo] Supabase is not configured yet. Set SUPABASE_URL and SUPABASE_ANON_KEY. ' +
      'See SUPABASE_SETUP.md for instructions.'
    );
  }

  // supabase-js is loaded globally via CDN <script> tag in index.html
  const { createClient } = window.supabase;
  _client = createClient(cfg.SUPABASE_URL || 'https://placeholder.supabase.co', cfg.SUPABASE_ANON_KEY || 'placeholder', {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return _client;
}

export async function isAiEnabled() {
  await getSupabaseClient();
  return !!(window.__TALLYO_ENV__ && window.__TALLYO_ENV__.AI_ENABLED);
}

// =============================================================================
// TALLYO — Auth Service (wraps Supabase Auth)
// =============================================================================
import { getSupabaseClient } from '../config/supabase.js';

// Supabase's silent token-refresh can occasionally stall (e.g. the laptop
// slept for a while, or a flaky connection right when the access token
// expired) with no built-in timeout. Since the router `await`s getSession()
// before rendering anything, a stalled call left the whole page stuck on
// its loading skeleton forever. This wraps any promise so it fails fast
// instead of hanging indefinitely.
function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

export async function signUp(email, password, fullName) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName || '' } }
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const supabase = await getSupabaseClient();
  // 8s is generous for a local/refresh call but short enough that a stuck
  // network request no longer leaves the app stuck on "Loading…" forever.
  const result = await withTimeout(supabase.auth.getSession(), 8000, null);
  if (!result) {
    console.warn('[Tallyo] getSession() timed out — treating as signed out for this render.');
    return null;
  }
  return result.data.session;
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

export async function sendPasswordReset(email) {
  const supabase = await getSupabaseClient();
  const redirectTo = `${window.location.origin}/#/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function onAuthStateChange(callback) {
  const supabase = await getSupabaseClient();
  return supabase.auth.onAuthStateChange(callback);
}

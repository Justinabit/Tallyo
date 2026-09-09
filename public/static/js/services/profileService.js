// =============================================================================
// TALLYO — Profile & User Preferences Service
// =============================================================================
import { getSupabaseClient } from '../config/supabase.js';

export async function getProfile(userId) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPreferences(userId) {
  const supabase = await getSupabaseClient();
  let { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: created, error: insErr } = await supabase
      .from('user_preferences')
      .insert({ user_id: userId })
      .select()
      .maybeSingle();
    if (insErr) throw insErr;
    data = created;
  }
  return data;
}

export async function updatePreferences(userId, updates) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('user_preferences')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

// =============================================================================
// TALLYO — Savings Goals Service
// =============================================================================
import { getSupabaseClient } from '../config/supabase.js';

export async function listSavingsGoals() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('savings_goals').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createSavingsGoal(payload) {
  const supabase = await getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('savings_goals')
    .insert({ ...payload, user_id: userData.user.id })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSavingsGoal(id, updates) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('savings_goals').update(updates).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteSavingsGoal(id) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('savings_goals').delete().eq('id', id);
  if (error) throw error;
}

/** Add (or subtract, with a negative amount) a contribution to current_amount. */
export async function contributeSavings(id, currentAmount, delta) {
  const newAmount = Math.max(Number(currentAmount) + Number(delta), 0);
  return updateSavingsGoal(id, { current_amount: newAmount });
}

// =============================================================================
// TALLYO — Budget Service
// =============================================================================
import { getSupabaseClient } from '../config/supabase.js';

export async function listBudgets() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('budgets').select('*, budget_categories(category_id)').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createBudget({ name, amount, period, start_date, end_date, categoryIds }) {
  const supabase = await getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('budgets')
    .insert({ user_id: userData.user.id, name, amount, period, start_date, end_date: end_date || null })
    .select()
    .maybeSingle();
  if (error) throw error;

  if (categoryIds && categoryIds.length) {
    const rows = categoryIds.map((category_id) => ({ budget_id: data.id, category_id }));
    const { error: linkErr } = await supabase.from('budget_categories').insert(rows);
    if (linkErr) throw linkErr;
  }
  return data;
}

export async function updateBudget(id, updates, categoryIds) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('budgets').update(updates).eq('id', id).select().maybeSingle();
  if (error) throw error;

  if (categoryIds !== undefined) {
    await supabase.from('budget_categories').delete().eq('budget_id', id);
    if (categoryIds.length) {
      const rows = categoryIds.map((category_id) => ({ budget_id: id, category_id }));
      const { error: linkErr } = await supabase.from('budget_categories').insert(rows);
      if (linkErr) throw linkErr;
    }
  }
  return data;
}

export async function deleteBudget(id) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) throw error;
}

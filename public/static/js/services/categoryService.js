// =============================================================================
// TALLYO — Category Service
// =============================================================================
import { getSupabaseClient } from '../config/supabase.js';

/** Returns default categories (user_id null) + this user's custom categories. */
export async function listCategories() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function createCategory({ name, type, icon, color }) {
  const supabase = await getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: userData.user.id, name, type, icon: icon || 'fa-circle', color: color || '#6B7280' })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export function categoriesById(categories) {
  return new Map(categories.map((c) => [c.id, c]));
}

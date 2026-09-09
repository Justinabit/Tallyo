// =============================================================================
// TALLYO — Wallet Service
// =============================================================================
import { getSupabaseClient } from '../config/supabase.js';

export async function listWallets() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('wallets').select('*').order('created_at');
  if (error) throw error;
  return data || [];
}

export async function createWallet({ name, type, initial_balance }) {
  const supabase = await getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('wallets')
    .insert({ user_id: userData.user.id, name, type: type || 'cash', initial_balance: initial_balance || 0 })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateWallet(id, updates) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('wallets').update(updates).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteWallet(id) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('wallets').delete().eq('id', id);
  if (error) throw error;
}

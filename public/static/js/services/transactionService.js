// =============================================================================
// TALLYO — Transaction Service
// =============================================================================
import { getSupabaseClient } from '../config/supabase.js';

/**
 * Fetch transactions between two ISO dates (inclusive), with optional
 * filters. Everything is scoped to the current user automatically by RLS.
 */
export async function listTransactions({ start, end, type, categoryId, walletId, search } = {}) {
  const supabase = await getSupabaseClient();
  let query = supabase.from('transactions').select('*').order('transaction_date', { ascending: false }).order('created_at', { ascending: false });
  if (start) query = query.gte('transaction_date', start);
  if (end) query = query.lte('transaction_date', end);
  if (type) query = query.eq('type', type);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (walletId) query = query.eq('wallet_id', walletId);
  if (search) query = query.ilike('description', `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createTransaction(payload) {
  const supabase = await getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...payload, user_id: userData.user.id })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateTransaction(id, updates) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('transactions').update(updates).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function getRecentTransactions(limit = 6) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

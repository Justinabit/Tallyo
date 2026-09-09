// =============================================================================
// TALLYO — Upcoming Expenses Service
// =============================================================================
import { getSupabaseClient } from '../config/supabase.js';
import { todayISO } from '../utils/dates.js';

export async function listUpcoming() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('upcoming_expenses').select('*').order('due_date');
  if (error) throw error;

  // Recompute "overdue" status client-side for display without mutating stored value each load.
  const today = todayISO();
  return (data || []).map((u) => ({
    ...u,
    effective_status: u.status === 'paid' ? 'paid' : u.due_date < today ? 'overdue' : 'pending'
  }));
}

export async function createUpcoming(payload) {
  const supabase = await getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('upcoming_expenses')
    .insert({ ...payload, user_id: userData.user.id })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateUpcoming(id, updates) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('upcoming_expenses').update(updates).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteUpcoming(id) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('upcoming_expenses').delete().eq('id', id);
  if (error) throw error;
}

/** Mark as paid, and optionally create a matching real expense transaction. */
export async function markUpcomingPaid(item, createTransactionFn) {
  await updateUpcoming(item.id, { status: 'paid' });
  if (createTransactionFn) {
    await createTransactionFn({
      type: 'expense',
      amount: item.amount,
      category_id: item.category_id,
      description: item.name,
      transaction_date: todayISO()
    });
  }
}

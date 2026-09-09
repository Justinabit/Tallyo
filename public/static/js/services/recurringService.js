// =============================================================================
// TALLYO — Recurring Transactions Service
// =============================================================================
import { getSupabaseClient } from '../config/supabase.js';
import { createTransaction } from './transactionService.js';
import { todayISO, addDays, parseISO, toISODate } from '../utils/dates.js';

export async function listRecurring() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('recurring_transactions').select('*').order('next_run_date');
  if (error) throw error;
  return data || [];
}

export async function createRecurring(payload) {
  const supabase = await getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({ ...payload, user_id: userData.user.id, next_run_date: payload.start_date })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateRecurring(id, updates) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.from('recurring_transactions').update(updates).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteRecurring(id) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
  if (error) throw error;
}

function nextDate(dateISO, frequency) {
  const d = parseISO(dateISO);
  if (frequency === 'daily') d.setDate(d.getDate() + 1);
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return toISODate(d);
}

/**
 * Runs due recurring transactions (next_run_date <= today), creating a real
 * transaction for each occurrence and advancing next_run_date. Safe to call
 * every time the app loads (e.g. on Dashboard mount) — it is idempotent per
 * day because next_run_date only ever moves forward.
 */
export async function processDueRecurring() {
  const items = await listRecurring();
  const today = todayISO();
  const created = [];
  for (const item of items) {
    if (!item.is_active) continue;
    let next = item.next_run_date;
    let guard = 0;
    while (next <= today && (!item.end_date || next <= item.end_date) && guard < 366) {
      const tx = await createTransaction({
        type: item.type,
        amount: item.amount,
        category_id: item.category_id,
        wallet_id: item.wallet_id,
        description: item.description || 'Recurring transaction',
        transaction_date: next
      });
      created.push(tx);
      next = nextDate(next, item.frequency);
      guard++;
    }
    if (next !== item.next_run_date) {
      const stillActive = !item.end_date || next <= item.end_date;
      await updateRecurring(item.id, { next_run_date: next, is_active: stillActive });
    }
  }
  return created;
}

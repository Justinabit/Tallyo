// =============================================================================
// TALLYO — Data Export / Import Service
// =============================================================================

export function exportToJson(dataset, filename = 'tallyo-export.json') {
  const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function exportTransactionsToCsv(transactions, categoriesById, walletsById, filename = 'tallyo-transactions.csv') {
  const header = ['Date', 'Type', 'Category', 'Wallet', 'Amount', 'Description', 'Notes'];
  const rows = transactions.map((t) => [
    t.transaction_date,
    t.type,
    categoriesById?.get(t.category_id)?.name || '',
    walletsById?.get(t.wallet_id)?.name || '',
    t.amount,
    (t.description || '').replace(/,/g, ';'),
    (t.notes || '').replace(/,/g, ';')
  ]);
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv' }), filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseImportedJson(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object') throw new Error('Invalid file format.');
  return data;
}

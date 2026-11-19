import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { catByKey } from './categories';
import type { Jar, Tx } from './types';

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Writes the cycle's entries to a CSV and opens the share sheet. */
export async function exportCsv(txs: Tx[], jars: Jar[], currency: string) {
  const rows = [['Date', 'Merchant', 'Category', 'Jar', `Amount (${currency})`, 'Note']];
  for (const t of txs) rows.push([t.occurred_on, t.merchant ?? '', catByKey(t.category).label, jars.find((j) => j.id === t.jar_id)?.name ?? '', t.amount.toFixed(2), t.note ?? '']);
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const uri = `${FileSystem.cacheDirectory}kwik-budget-${new Date().toISOString().slice(0, 10)}.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export Kwik Budget entries', UTI: 'public.comma-separated-values-text' });
  return uri;
}

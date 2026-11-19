import * as ImagePicker from 'expo-image-picker';
import { aiReceipt } from './ai';
import { todayStr } from './money';
import { catByKey } from './categories';

export type Prefill = { amount?: number; merchant?: string; category?: string; date?: string };
export type ScanOutcome = { ok: true; prefill: Prefill } | { ok: false; reason: 'cancelled' | 'denied' | 'limit' | 'unreadable' | 'error'; message?: string };

/** Camera (or photo library as a fallback) → Kwik AI → a pre-filled expense. */
export async function scanReceipt(from: 'camera' | 'library' = 'camera'): Promise<ScanOutcome> {
  const perm = from === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: 'denied' };
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true, allowsEditing: false };
  const res = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]?.base64) return { ok: false, reason: 'cancelled' };
  const a = res.assets[0];
  const r = await aiReceipt(a.base64!, a.mimeType ?? 'image/jpeg');
  if (!r.ok) return { ok: false, reason: r.reason === 'limit' ? 'limit' : 'error', message: r.message };
  if (r.data.readable === false || !(r.data.total > 0)) return { ok: false, reason: 'unreadable' };
  const date = r.data.date && /^\d{4}-\d{2}-\d{2}$/.test(r.data.date) && r.data.date <= todayStr() ? r.data.date : todayStr();
  return { ok: true, prefill: { amount: r.data.total, merchant: r.data.merchant, category: catByKey(r.data.category).key, date } };
}

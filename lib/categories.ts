import type { JarKey } from './types';

export type CategoryKey =
  | 'groceries' | 'dining' | 'coffee' | 'rides' | 'transit' | 'fuel'
  | 'entertainment' | 'shopping' | 'subscriptions' | 'health' | 'personal' | 'other';

export type Category = { key: CategoryKey; label: string; jar: JarKey; tint: string; words: string[] };

/** Each category belongs to a jar by default; the user can still pick another jar. */
export const CATEGORIES: Category[] = [
  { key: 'groceries', label: 'Groceries', jar: 'food', tint: '#DDF7C8', words: ['groceries', 'grocery', 'market', 'supermarket', 'shoprite', 'bakery', 'food'] },
  { key: 'dining', label: 'Eating out', jar: 'food', tint: '#DDF7C8', words: ['lunch', 'dinner', 'breakfast', 'restaurant', 'pizza', 'burger', 'chicken', 'kfc', 'mama', 'mamas', 'takeout', 'snack', 'brunch', 'sushi', 'jollof', 'chop bar', 'chop', 'waakye', 'kenkey', 'banku', 'fufu', 'suya', 'shawarma', 'kfc', 'mcdonalds', 'dominos'] },
  { key: 'coffee', label: 'Coffee', jar: 'food', tint: '#F3E9D8', words: ['coffee', 'cafe', 'latte', 'tea', 'starbucks', 'espresso', 'drink', 'juice'] },
  { key: 'rides', label: 'Rides', jar: 'transport', tint: '#FFF1BF', words: ['uber', 'bolt', 'lyft', 'taxi', 'cab', 'ride', 'yango'] },
  { key: 'transit', label: 'Transit', jar: 'transport', tint: '#FFF1BF', words: ['bus', 'train', 'metro', 'tram', 'fare', 'trotro', 'okada', 'subway', 'ticket'] },
  { key: 'fuel', label: 'Fuel', jar: 'transport', tint: '#FFF1BF', words: ['fuel', 'gas', 'petrol', 'diesel', 'parking', 'toll', 'carwash'] },
  { key: 'entertainment', label: 'Going out', jar: 'fun', tint: '#E9E6FF', words: ['movie', 'cinema', 'bar', 'club', 'concert', 'party', 'beer', 'show', 'game', 'games', 'bowling', 'drinks', 'betting', 'bet'] },
  { key: 'shopping', label: 'Shopping', jar: 'fun', tint: '#FFE3EC', words: ['clothes', 'shoes', 'shopping', 'amazon', 'mall', 'gift', 'jumia', 'shirt', 'dress', 'temu', 'shein', 'sneakers'] },
  { key: 'subscriptions', label: 'Subscriptions', jar: 'fun', tint: '#E9E6FF', words: ['netflix', 'spotify', 'youtube', 'apple', 'subscription', 'icloud', 'prime', 'disney', 'showmax', 'dstv', 'chatgpt', 'claude', 'canva', 'adobe', 'hbo', 'max', 'hulu', 'gym membership'] },
  { key: 'health', label: 'Health', jar: 'buffer', tint: '#DFF1FF', words: ['pharmacy', 'doctor', 'medicine', 'gym', 'clinic', 'drugs', 'dentist', 'vitamins'] },
  { key: 'personal', label: 'Personal care', jar: 'buffer', tint: '#DFF1FF', words: ['haircut', 'barber', 'salon', 'nails', 'laundry', 'toiletries'] },
  { key: 'other', label: 'Other', jar: 'buffer', tint: '#EEF1EE', words: [] },
];
export const catByKey = (k: string | null | undefined) => CATEGORIES.find((c) => c.key === k) ?? CATEGORIES[CATEGORIES.length - 1];

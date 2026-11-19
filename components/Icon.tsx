import {
  AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Bell, Bus, CalendarDays, Car, Check, ChevronRight, Coffee,
  Crown, Download, Flame, Fuel, Gift, Heart, HeartPulse, Home, Lock, LogOut, LucideIcon, Mail, Minus, Pencil,
  PiggyBank, Plus, Receipt, Repeat, Scissors, Search, Send, Settings, Share2, ShieldCheck, ShoppingBag,
  ShoppingCart, Sparkles, Star, Target, Ticket, Trash2, TrendingDown, TrendingUp, Tv, Undo2, User, Utensils,
  Wallet, X, Zap, Globe, FileText, Clock, MessageCirclePlus, CircleDollarSign, Unlock, Camera, FileUp, Image as ImageIcon,
} from 'lucide-react-native';
import { C } from '@/lib/theme';
import { catByKey } from '@/lib/categories';

/** One consistent icon family (Lucide, 24px grid, 2px stroke, round caps) across the whole app. */
const MAP = {
  home: Home, jar: PiggyBank, wallet: Wallet, add: MessageCirclePlus, bills: CalendarDays, insights: BarChart3,
  back: ArrowLeft, arrow: ArrowRight, close: X, check: Check, lock: Lock, unlock: Unlock, bolt: Zap, warn: AlertTriangle,
  share: Share2, logout: LogOut, settings: Settings, bell: Bell, search: Search, trash: Trash2, edit: Pencil,
  star: Star, crown: Crown, sparkles: Sparkles, chevron: ChevronRight, shield: ShieldCheck, download: Download,
  heart: Heart, gift: Gift, repeat: Repeat, target: Target, flame: Flame, plus: Plus, minus: Minus, send: Send,
  receipt: Receipt, up: TrendingUp, down: TrendingDown, undo: Undo2, user: User, mail: Mail, globe: Globe,
  doc: FileText, clock: Clock, coin: CircleDollarSign, camera: Camera, upload: FileUp, image: ImageIcon,
  // categories
  groceries: ShoppingCart, dining: Utensils, coffee: Coffee, rides: Car, transit: Bus, fuel: Fuel,
  entertainment: Ticket, shopping: ShoppingBag, subscriptions: Tv, health: HeartPulse, personal: Scissors, other: Receipt,
} satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof MAP;

export function Icon({ name, color = C.ink, size = 22, sw = 2 }: { name: IconName; color?: string; size?: number; sw?: number }) {
  const Cmp = MAP[name] ?? Receipt;
  return <Cmp color={color} size={size} strokeWidth={sw} />;
}

export const categoryIcon = (k: string): IconName => (catByKey(k).key as IconName);

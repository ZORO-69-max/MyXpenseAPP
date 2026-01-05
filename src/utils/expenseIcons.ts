import {
  Smartphone,
  Bus,
  Utensils,
  ShoppingBag,
  Home,
  Car,
  Train,
  Plane,
  Hotel,
  Coffee,
  ShoppingCart,
  Fuel,
  Ticket,
  Pizza,
  Gift,
  Heart,
  Gamepad2,
  Film,
  Music,
  Dumbbell,
  Pill,
  GraduationCap,
  Book,
  Shirt,
  Zap,
  Droplet,
  Wifi,
  CreditCard,
  Coins,
  Briefcase,
  Wallet,
  Banknote,
  PartyPopper,
  Sparkles,
  Trophy,
  CircleDot,
  MoreHorizontal
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ExpenseIconConfig {
  icon: LucideIcon;
  color: string;
}

const expenseIconMap: Record<string, ExpenseIconConfig> = {
  // Transport
  cab: { icon: Car, color: 'from-yellow-500 to-amber-500' },
  auto: { icon: Car, color: 'from-green-500 to-emerald-500' },
  rickshaw: { icon: Car, color: 'from-green-500 to-lime-500' },
  bus: { icon: Bus, color: 'from-orange-500 to-red-500' },
  car: { icon: Car, color: 'from-red-600 to-orange-600' },
  taxi: { icon: Car, color: 'from-yellow-500 to-orange-500' },
  uber: { icon: Car, color: 'from-gray-800 to-black' },
  ola: { icon: Car, color: 'from-green-500 to-lime-500' },
  train: { icon: Train, color: 'from-purple-500 to-pink-500' },
  metro: { icon: Train, color: 'from-blue-500 to-indigo-500' },
  flight: { icon: Plane, color: 'from-blue-500 to-cyan-500' },

  // Food & Drinks
  food: { icon: Utensils, color: 'from-red-500 to-orange-500' },
  restaurant: { icon: Utensils, color: 'from-red-500 to-orange-500' },
  dinner: { icon: Utensils, color: 'from-red-500 to-orange-500' },
  lunch: { icon: Utensils, color: 'from-orange-500 to-yellow-500' },
  breakfast: { icon: Coffee, color: 'from-amber-600 to-orange-600' },
  snack: { icon: Pizza, color: 'from-orange-500 to-red-500' },
  coffee: { icon: Coffee, color: 'from-amber-700 to-orange-700' },
  tea: { icon: Coffee, color: 'from-amber-600 to-orange-600' },
  chai: { icon: Coffee, color: 'from-amber-700 to-yellow-600' },
  cafe: { icon: Coffee, color: 'from-amber-600 to-orange-600' },
  pizza: { icon: Pizza, color: 'from-red-500 to-yellow-500' },

  // Phone & Digital
  phone: { icon: Smartphone, color: 'from-blue-500 to-cyan-500' },
  mobile: { icon: Smartphone, color: 'from-blue-500 to-cyan-500' },
  recharge: { icon: Smartphone, color: 'from-blue-500 to-purple-500' },
  phonepay: { icon: Smartphone, color: 'from-purple-500 to-pink-500' },
  paytm: { icon: Wallet, color: 'from-blue-600 to-cyan-600' },
  gpay: { icon: Wallet, color: 'from-green-500 to-emerald-500' },

  // Money & Transfers
  transfer: { icon: Banknote, color: 'from-purple-500 to-indigo-500' },
  payment: { icon: CreditCard, color: 'from-blue-500 to-indigo-500' },
  parents: { icon: Coins, color: 'from-green-500 to-emerald-500' },
  pocket: { icon: Coins, color: 'from-green-500 to-emerald-500' },
  salary: { icon: Coins, color: 'from-yellow-600 to-amber-600' },
  income: { icon: Coins, color: 'from-green-600 to-emerald-600' },
  money: { icon: Banknote, color: 'from-green-500 to-emerald-500' },

  // Shopping
  shopping: { icon: ShoppingBag, color: 'from-pink-500 to-rose-500' },
  groceries: { icon: ShoppingCart, color: 'from-green-600 to-emerald-600' },
  clothing: { icon: Shirt, color: 'from-pink-500 to-purple-500' },
  clothes: { icon: Shirt, color: 'from-pink-500 to-purple-500' },

  // Accommodation
  hotel: { icon: Hotel, color: 'from-indigo-500 to-purple-500' },
  stay: { icon: Hotel, color: 'from-indigo-500 to-purple-500' },
  rent: { icon: Home, color: 'from-slate-600 to-gray-600' },
  house: { icon: Home, color: 'from-slate-600 to-gray-600' },

  // Fuel & Utilities
  fuel: { icon: Fuel, color: 'from-green-700 to-emerald-700' },
  petrol: { icon: Fuel, color: 'from-green-700 to-emerald-700' },
  gas: { icon: Fuel, color: 'from-green-700 to-emerald-700' },
  electricity: { icon: Zap, color: 'from-yellow-500 to-orange-500' },
  water: { icon: Droplet, color: 'from-blue-500 to-cyan-500' },
  internet: { icon: Wifi, color: 'from-blue-600 to-purple-600' },
  wifi: { icon: Wifi, color: 'from-blue-600 to-purple-600' },
  bill: { icon: CreditCard, color: 'from-gray-600 to-slate-600' },

  // Entertainment
  ticket: { icon: Ticket, color: 'from-purple-600 to-violet-600' },
  movie: { icon: Film, color: 'from-red-600 to-pink-600' },
  game: { icon: Gamepad2, color: 'from-purple-600 to-pink-600' },
  gaming: { icon: Gamepad2, color: 'from-purple-600 to-pink-600' },
  music: { icon: Music, color: 'from-purple-500 to-violet-500' },

  // Health & Fitness
  health: { icon: Heart, color: 'from-red-500 to-rose-500' },
  medical: { icon: Pill, color: 'from-blue-500 to-teal-500' },
  medicine: { icon: Pill, color: 'from-blue-500 to-teal-500' },
  gym: { icon: Dumbbell, color: 'from-orange-600 to-red-600' },
  fitness: { icon: Dumbbell, color: 'from-orange-600 to-red-600' },

  // Education
  education: { icon: GraduationCap, color: 'from-blue-600 to-indigo-600' },
  course: { icon: GraduationCap, color: 'from-blue-600 to-indigo-600' },
  book: { icon: Book, color: 'from-amber-600 to-orange-600' },

  // Activities & Sports
  activity: { icon: Trophy, color: 'from-amber-500 to-yellow-500' },
  activities: { icon: Trophy, color: 'from-amber-500 to-yellow-500' },
  sport: { icon: Trophy, color: 'from-blue-500 to-cyan-500' },
  sports: { icon: Trophy, color: 'from-blue-500 to-cyan-500' },
  party: { icon: PartyPopper, color: 'from-pink-500 to-purple-500' },
  celebration: { icon: PartyPopper, color: 'from-pink-500 to-purple-500' },
  event: { icon: Sparkles, color: 'from-purple-500 to-pink-500' },

  // Other
  gift: { icon: Gift, color: 'from-pink-500 to-red-500' },
  work: { icon: Briefcase, color: 'from-gray-700 to-slate-700' },
  other: { icon: CircleDot, color: 'from-gray-500 to-slate-500' },
  misc: { icon: MoreHorizontal, color: 'from-gray-500 to-slate-500' },
  general: { icon: CircleDot, color: 'from-gray-500 to-slate-500' },
};

const defaultExpenseIcon: ExpenseIconConfig = {
  icon: Wallet,
  color: 'from-blue-500 to-teal-500'
};

export const getExpenseIcon = (title: string, category?: string): ExpenseIconConfig => {
  const searchText = `${title} ${category || ''}`.toLowerCase();

  for (const [keyword, config] of Object.entries(expenseIconMap)) {
    if (searchText.includes(keyword)) {
      return config;
    }
  }

  return defaultExpenseIcon;
};

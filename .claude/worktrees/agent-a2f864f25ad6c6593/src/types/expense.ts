export type Category =
  | "Housing"
  | "Groceries"
  | "Dine Out"
  | "Takeaways"
  | "Food"
  | "Transport"
  | "Health"
  | "Shopping"
  | "Entertainment"
  | "Utilities"
  | "Education"
  | "Subscriptions"
  | "Travel"
  | "Fitness"
  | "Beauty"
  | "Pets"
  | "Insurance"
  | "Other";

export const CATEGORIES: Category[] = [
  "Housing",
  "Groceries",
  "Dine Out",
  "Takeaways",
  "Food",
  "Transport",
  "Health",
  "Shopping",
  "Entertainment",
  "Utilities",
  "Education",
  "Subscriptions",
  "Travel",
  "Fitness",
  "Beauty",
  "Pets",
  "Insurance",
  "Other",
];

export interface CategoryMeta {
  color: string;
  bg: string;
  text: string;
  light: string;
  emoji: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  Housing:       { color: "#4f46e5", bg: "bg-indigo-500",  text: "text-indigo-700",  light: "bg-indigo-50",  emoji: "🏠" },
  Groceries:     { color: "#16a34a", bg: "bg-green-600",   text: "text-green-700",   light: "bg-green-50",   emoji: "🛒" },
  "Dine Out":    { color: "#ea580c", bg: "bg-orange-500",  text: "text-orange-700",  light: "bg-orange-50",  emoji: "🍽️" },
  Takeaways:     { color: "#f59e0b", bg: "bg-amber-500",   text: "text-amber-700",   light: "bg-amber-50",   emoji: "🛵" },
  Food:          { color: "#dc2626", bg: "bg-red-500",     text: "text-red-700",     light: "bg-red-50",     emoji: "🍔" },
  Transport:     { color: "#0284c7", bg: "bg-sky-500",     text: "text-sky-700",     light: "bg-sky-50",     emoji: "🚗" },
  Health:        { color: "#059669", bg: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-50", emoji: "💊" },
  Shopping:      { color: "#e11d48", bg: "bg-rose-500",    text: "text-rose-700",    light: "bg-rose-50",    emoji: "🛍️" },
  Entertainment:  { color: "#9333ea", bg: "bg-purple-500",  text: "text-purple-700",  light: "bg-purple-50",  emoji: "🎬" },
  Utilities:      { color: "#475569", bg: "bg-slate-500",   text: "text-slate-700",   light: "bg-slate-50",   emoji: "💡" },
  Education:      { color: "#0d9488", bg: "bg-teal-500",    text: "text-teal-700",    light: "bg-teal-50",    emoji: "📚" },
  Subscriptions:  { color: "#7c3aed", bg: "bg-violet-600",  text: "text-violet-700",  light: "bg-violet-50",  emoji: "📱" },
  Travel:         { color: "#0891b2", bg: "bg-cyan-600",    text: "text-cyan-700",    light: "bg-cyan-50",    emoji: "✈️" },
  Fitness:        { color: "#15803d", bg: "bg-green-700",   text: "text-green-700",   light: "bg-green-50",   emoji: "🏋️" },
  Beauty:         { color: "#db2777", bg: "bg-pink-600",    text: "text-pink-700",    light: "bg-pink-50",    emoji: "💅" },
  Pets:           { color: "#92400e", bg: "bg-amber-800",   text: "text-amber-800",   light: "bg-amber-50",   emoji: "🐾" },
  Insurance:      { color: "#334155", bg: "bg-slate-700",   text: "text-slate-700",   light: "bg-slate-100",  emoji: "🛡️" },
  Other:          { color: "#71717a", bg: "bg-zinc-400",    text: "text-zinc-700",    light: "bg-zinc-50",    emoji: "📌" },
};

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string; // YYYY-MM-DD
  split: boolean; // true = shared household expense (split 50/50)
  is_recurring?: boolean;
}

export interface Budget {
  id: string;
  category: Category;
  amount: number;
}

export type MonthKey = string; // "YYYY-MM"

export interface ExpenseStore {
  [month: MonthKey]: Expense[];
}

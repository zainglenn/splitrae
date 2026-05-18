export interface Payer {
  id: string;
  name: string;
  color: string;
  is_owner: boolean;
  linked_user_id?: string | null;
}

export interface Payment {
  id: string;
  payer_id: string;
  amount: number;
  date: string;
  note: string | null;
  month: string;
}

export const PAYER_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#0ea5e9", // sky
  "#8b5cf6", // violet
  "#f97316", // orange
  "#14b8a6", // teal
];

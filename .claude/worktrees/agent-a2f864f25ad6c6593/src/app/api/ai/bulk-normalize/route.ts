import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CATEGORIES = [
  "Housing", "Groceries", "Dine Out", "Takeaways", "Food",
  "Transport", "Health", "Shopping", "Entertainment", "Utilities",
  "Education", "Subscriptions", "Travel", "Fitness", "Beauty",
  "Pets", "Insurance", "Other",
];

const SYSTEM_PROMPT = `You are an expense data normalizer for a household in the UAE. Given a list of expense entries, return corrections for any that have messy descriptions or wrong categories.

Rules:
- Clean up merchant names: remove branch codes, normalize casing (e.g. "MCDONALDS #1234 AE" → "McDonald's", "nflx" → "Netflix", "LULU HYPERMARKET" → "Lulu Hypermarket")
- Fix miscategorizations — use the most specific category available:
  - "Subscriptions" for Netflix, Spotify, iCloud, OSN, StarzPlay, app subscriptions (not Entertainment)
  - "Travel" for flights, hotels, Airbnb, Booking.com (not Transport)
  - "Fitness" for gym memberships, sports clubs (not Health)
  - "Beauty" for salons, barbers, cosmetics, skincare (not Shopping/Health)
  - "Pets" for vet visits, pet food, pet supplies (not Other)
  - "Insurance" for any insurance premium (not Utilities)
  - "Takeaways" for Talabat, Deliveroo, Noon Food, food delivery orders
  - "Dine Out" for restaurant meals eaten on-site
  - "Transport" for Careem rides, Uber rides, fuel, parking, salik toll
  - "Groceries" for Lulu, Carrefour, Spinneys, Waitrose UAE, Zoom (supermarket), Careem Quick, InstaShop, Kibsons

UAE vendor reference — common misclassified merchants:
  - Careem Quick → Groceries (grocery delivery app, NOT a ride)
  - Careem (without "Quick") → Transport (ride-hailing)
  - Noon → Shopping (e-commerce)
  - Noon Food → Takeaways
  - InstaShop → Groceries
  - Kibsons → Groceries
  - Talabat → Takeaways
  - Talabat Mart → Groceries
  - Deliveroo → Takeaways
  - OSN / StarzPlay → Subscriptions
  - Salik → Transport
  - DEWA → Utilities
  - Etisalat / du → Utilities

- Only output entries that need changes — skip correct ones
- Valid categories: Housing, Groceries, Dine Out, Takeaways, Food, Transport, Health, Shopping, Entertainment, Utilities, Education, Subscriptions, Travel, Fitness, Beauty, Pets, Insurance, Other

Output a JSON array of corrections. Each object must have "id" and only the changed fields ("description" and/or "category"):
[{"id":"uuid","description":"Clean Name","category":"Category"}]

If nothing needs correcting, return an empty array: []`;

interface ExpenseRow {
  id: string;
  description: string;
  category: string;
}

interface Correction {
  id: string;
  description?: string;
  category?: string;
}

async function normalizeBatch(batch: ExpenseRow[]): Promise<Correction[]> {
  const userMessage = batch
    .map((e, i) => `${i + 1}. id="${e.id}" | "${e.description}" [${e.category}]`)
    .join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0,
        max_tokens: 1200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return [];

    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content ?? "").trim();
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]) as Correction[];
    return parsed
      .filter((c) => typeof c.id === "string" && batch.some((e) => e.id === c.id))
      .map((c) => ({
        id: c.id,
        ...(c.description ? { description: String(c.description).trim() } : {}),
        ...(c.category && CATEGORIES.includes(c.category) ? { category: c.category } : {}),
      }))
      .filter((c) => c.description !== undefined || c.category !== undefined);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // Verify the session and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all expenses for this user
  const { data: expenses, error: fetchError } = await supabase
    .from("expenses")
    .select("id, description, category")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (fetchError) {
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }

  const rows = (expenses ?? []) as ExpenseRow[];
  const total = rows.length;
  const allCorrections: Correction[] = [];

  // Process in batches of 30
  const BATCH_SIZE = 30;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const corrections = await normalizeBatch(batch);
    allCorrections.push(...corrections);
  }

  // Apply corrections
  let fixed = 0;
  for (const correction of allCorrections) {
    const updates: Record<string, string> = {};
    if (correction.description) updates.description = correction.description;
    if (correction.category) updates.category = correction.category;

    const { error } = await supabase
      .from("expenses")
      .update(updates)
      .eq("id", correction.id)
      .eq("user_id", user.id);

    if (!error) fixed++;
  }

  return NextResponse.json({ total, fixed, changes: allCorrections });
}

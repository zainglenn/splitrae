import { NextRequest, NextResponse } from "next/server";

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
  - "Groceries" for Lulu, Carrefour, Spinneys, Waitrose UAE, Zoom (supermarket), Careem Quick, InstaShop, Kibsons (these are grocery delivery apps — NOT Transport)

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

interface ExpenseInput {
  id: string;
  description: string;
  category: string;
}

export async function POST(req: NextRequest) {
  const { expenses } = await req.json() as { expenses: ExpenseInput[] };
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return NextResponse.json({ corrections: [] });
  }

  // Limit to 30 expenses per call
  const batch = expenses.slice(0, 30);

  const userMessage = batch
    .map((e, i) => `${i + 1}. id="${e.id}" | "${e.description}" [${e.category}]`)
    .join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

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
        max_tokens: 800,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return NextResponse.json({ corrections: [] });

    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content ?? "").trim();

    // Extract JSON array from response
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ corrections: [] });

    const parsed = JSON.parse(match[0]) as { id: string; description?: string; category?: string }[];

    // Validate and sanitize
    const corrections = parsed
      .filter((c) => typeof c.id === "string" && batch.some((e) => e.id === c.id))
      .map((c) => ({
        id: c.id,
        ...(c.description ? { description: String(c.description).trim() } : {}),
        ...(c.category && CATEGORIES.includes(c.category) ? { category: c.category } : {}),
      }))
      .filter((c) => c.description !== undefined || (c as { category?: string }).category !== undefined);

    return NextResponse.json({ corrections });
  } catch {
    return NextResponse.json({ corrections: [] });
  } finally {
    clearTimeout(timeout);
  }
}

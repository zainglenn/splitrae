import { NextRequest, NextResponse } from "next/server";

const CATEGORIES = [
  "Housing", "Groceries", "Dine Out", "Takeaways", "Food",
  "Transport", "Health", "Shopping", "Entertainment", "Utilities",
  "Education", "Subscriptions", "Travel", "Fitness", "Beauty",
  "Pets", "Insurance", "Other",
];

const SYSTEM_PROMPT =
  "You are an expense categorization assistant for a household in the UAE. Classify the expense description into exactly one of these 18 categories: Housing, Groceries, Dine Out, Takeaways, Food, Transport, Health, Shopping, Entertainment, Utilities, Education, Subscriptions, Travel, Fitness, Beauty, Pets, Insurance, Other. Reply with the category name only — no punctuation, no explanation. Guidelines: 'Dine Out' for restaurant meals on-site; 'Takeaways' for delivery/takeout (Talabat, Deliveroo, Noon Food); 'Groceries' for supermarkets and grocery delivery (Lulu, Carrefour, Spinneys, Careem Quick, InstaShop, Kibsons, Talabat Mart); 'Subscriptions' for Netflix, Spotify, iCloud, OSN, StarzPlay, apps; 'Travel' for flights, hotels, Airbnb; 'Fitness' for gyms, sports clubs; 'Beauty' for salons, cosmetics, skincare; 'Pets' for vet, pet food; 'Insurance' for any insurance premium; 'Transport' for Careem rides, Uber, fuel, parking, Salik; 'Utilities' for DEWA, Etisalat, du, internet. IMPORTANT: Careem Quick = Groceries (NOT Transport). Careem without Quick = Transport. If uncertain, use 'Other'.";

export async function POST(req: NextRequest) {
  const { description } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: "description required" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

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
        max_tokens: 20,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: description.trim() },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return NextResponse.json({ error: "AI unavailable" }, { status: 502 });

    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content ?? "").trim();
    const matched = CATEGORIES.find(
      (c) => c.toLowerCase() === raw.toLowerCase()
    );
    return NextResponse.json({ category: matched ?? "Other" });
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

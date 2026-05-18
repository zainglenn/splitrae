import { NextRequest, NextResponse } from "next/server";

const CATEGORIES = [
  "Housing", "Groceries", "Dine Out", "Takeaways", "Food",
  "Transport", "Health", "Shopping", "Entertainment", "Utilities",
  "Education", "Other",
];

const SYSTEM_PROMPT =
  "You are an expense categorization assistant. Classify the user's expense description into exactly one of these 12 categories: Housing, Groceries, Dine Out, Takeaways, Food, Transport, Health, Shopping, Entertainment, Utilities, Education, Other. Reply with the category name only — no punctuation, no explanation. Use 'Dine Out' for restaurant meals eaten on-site. Use 'Takeaways' for delivery/takeout food orders. Use 'Groceries' for supermarket or general grocery shopping. Use 'Food' for general food purchases that don't fit the others. If uncertain, use 'Other'.";

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

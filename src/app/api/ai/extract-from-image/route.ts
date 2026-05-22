import { NextRequest, NextResponse } from "next/server";

const CATEGORIES = [
  "Housing", "Groceries", "Dine Out", "Takeaways", "Food",
  "Transport", "Health", "Shopping", "Entertainment", "Utilities",
  "Education", "Subscriptions", "Travel", "Fitness", "Beauty",
  "Pets", "Insurance", "Other",
];

const PROMPT = `You are a financial transaction extractor for a household in the UAE. The following is raw OCR text from a bank statement, credit card statement, or receipt.

Extract ALL transactions visible in the text.

Return ONLY a valid JSON array — no markdown fences, no explanation. Each object must have:
- "description": clean merchant or description name (string)
- "amount": positive number in AED (number only, no currency symbols or commas)
- "category": exactly one of: Housing, Groceries, Dine Out, Takeaways, Food, Transport, Health, Shopping, Entertainment, Utilities, Education, Subscriptions, Travel, Fitness, Beauty, Pets, Insurance, Other
- "date": YYYY-MM-DD format (use today if not visible)

Guidelines: Dine Out = restaurant on-site; Takeaways = delivery (Talabat, Deliveroo); Groceries = supermarkets/grocery delivery; Transport = Uber/Careem/fuel; Subscriptions = Netflix/Spotify/apps.

If no transactions are visible, return: []`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text } = body;

  if (!text?.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

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
        max_tokens: 2000,
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: text },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return NextResponse.json({ transactions: [], error: "AI service unavailable" }, { status: 502 });
    }

    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content ?? "").trim();
    const jsonStr = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();

    let parsed: Array<{ description: string; amount: number; category: string; date: string }>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ transactions: [], error: "Could not parse AI response" });
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ transactions: [] });
    }

    const today = new Date().toISOString().slice(0, 10);
    const transactions = parsed
      .filter((t) => t.description && typeof t.amount === "number" && t.amount > 0)
      .map((t) => ({
        _id: crypto.randomUUID(),
        description: String(t.description).trim(),
        amount: Number(t.amount),
        category: CATEGORIES.includes(t.category) ? t.category : "Other",
        date: /^\d{4}-\d{2}-\d{2}$/.test(t.date ?? "") ? t.date : today,
        split: true as const,
      }));

    return NextResponse.json({ transactions });
  } catch {
    return NextResponse.json({ transactions: [], error: "AI unavailable" });
  } finally {
    clearTimeout(timeout);
  }
}

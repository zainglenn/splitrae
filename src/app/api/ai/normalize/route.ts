import { NextRequest, NextResponse } from "next/server";

const CATEGORIES = [
  "Housing", "Groceries", "Dine Out", "Takeaways", "Food",
  "Transport", "Health", "Shopping", "Entertainment", "Utilities",
  "Education", "Other",
];

const SYSTEM_PROMPT = `You are an expense data normalizer. Given a list of expense entries, return corrections for any that have messy descriptions or wrong categories.

Rules:
- Clean up merchant names: remove branch codes, normalize casing (e.g. "MCDONALDS #1234 AE" → "McDonald's", "nflx" → "Netflix")
- Fix obvious miscategorizations (e.g. "Netflix" should be Entertainment not Other)
- Only output entries that need changes — skip correct ones
- Valid categories: Housing, Groceries, Dine Out, Takeaways, Food, Transport, Health, Shopping, Entertainment, Utilities, Education, Other
- Use "Dine Out" for restaurant meals, "Takeaways" for delivery/takeout, "Groceries" for supermarket shopping

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

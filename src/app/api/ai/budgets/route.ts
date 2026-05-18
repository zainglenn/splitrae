import { NextRequest, NextResponse } from "next/server";

const CATEGORIES = [
  "Housing", "Groceries", "Dine Out", "Takeaways", "Food",
  "Transport", "Health", "Shopping", "Entertainment", "Utilities",
  "Education", "Subscriptions", "Travel", "Fitness", "Beauty",
  "Pets", "Insurance", "Other",
];

const SYSTEM_PROMPT = `You are a personal finance advisor for a household in the UAE. You will receive a summary of the user's actual spending per category over recent months.

Your task: suggest a realistic monthly budget for each category that has spending history.

Rules:
- Only suggest budgets for categories that appear in the spending data (skip categories with zero spend)
- Base the budget on the average monthly spend, rounded to a sensible number (nearest 50 or 100 AED)
- Add a small buffer (~10–15%) above the average to account for variation — don't set a budget that will immediately be exceeded
- If a category has only one data point, treat that as the base
- Return ONLY a JSON object mapping category name to integer budget amount in AED. No explanation, no markdown.

Example output:
{"Groceries":2500,"Dine Out":1000,"Transport":800}`;

export async function POST(req: NextRequest) {
  const { monthlyTotals } = await req.json() as {
    // { "2026-04": { Groceries: 2300, Transport: 800 }, "2026-03": { ... } }
    monthlyTotals: Record<string, Record<string, number>>;
  };

  if (!monthlyTotals || Object.keys(monthlyTotals).length === 0) {
    return NextResponse.json({ error: "No data provided" }, { status: 400 });
  }

  // Compute average per category across months
  const sums: Record<string, number[]> = {};
  for (const monthly of Object.values(monthlyTotals)) {
    for (const [cat, amount] of Object.entries(monthly)) {
      if (!sums[cat]) sums[cat] = [];
      sums[cat].push(amount);
    }
  }

  const averages: Record<string, number> = {};
  for (const [cat, amounts] of Object.entries(sums)) {
    averages[cat] = amounts.reduce((s, v) => s + v, 0) / amounts.length;
  }

  const summaryLines = Object.entries(averages)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, avg]) => `${cat}: AED ${Math.round(avg)} avg/month (${sums[cat].length} month${sums[cat].length > 1 ? "s" : ""} of data)`)
    .join("\n");

  const prompt = `Here is the user's spending history:\n\n${summaryLines}\n\nSuggest a monthly budget for each category.`;

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";

  let budgets: Record<string, number> = {};
  try {
    const parsed = JSON.parse(content);
    // Validate: only known categories, only positive numbers
    for (const [cat, amount] of Object.entries(parsed)) {
      if (CATEGORIES.includes(cat) && typeof amount === "number" && amount > 0) {
        budgets[cat] = Math.round(amount as number);
      }
    }
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json({ budgets });
}

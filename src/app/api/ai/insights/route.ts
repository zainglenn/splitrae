import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "You are a personal finance analyst. The user will give you a compact summary of their household expenses for a month in UAE Dirhams (AED). Return a JSON array of exactly 2 or 3 short plain-English insights (each under 15 words) — focus on the top category, daily average, and any notable spending patterns. Reply with only a valid JSON array of strings — no markdown, no keys, no explanation.";

interface ExpenseRow {
  description: string;
  amount: number;
  category: string;
  date: string;
}

export async function POST(req: NextRequest) {
  const { expenses, month }: { expenses: ExpenseRow[]; month: string } = await req.json();
  if (!expenses?.length || !month) {
    return NextResponse.json({ error: "expenses and month required" }, { status: 400 });
  }

  // Build compact summary — don't send raw descriptions to save tokens
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const dates = expenses.map((e) => e.date).sort();
  const firstDate = new Date(dates[0] + "T00:00:00");
  const lastDate = new Date(dates[dates.length - 1] + "T00:00:00");
  const daySpan = Math.max(
    1,
    Math.round((lastDate.getTime() - firstDate.getTime()) / 86400000) + 1
  );
  const dailyAvg = total / daySpan;

  const categoryTotals: Record<string, { amount: number; count: number }> = {};
  for (const e of expenses) {
    if (!categoryTotals[e.category]) categoryTotals[e.category] = { amount: 0, count: 0 };
    categoryTotals[e.category].amount += e.amount;
    categoryTotals[e.category].count += 1;
  }
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([cat, { amount, count }]) => `${cat} AED ${amount.toFixed(0)} (${count} tx)`)
    .join(", ");

  const [year, mon] = month.split("-");
  const monthLabel = new Date(Number(year), Number(mon) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const summary = `Month: ${monthLabel}
Total: AED ${total.toFixed(2)}
Transactions: ${expenses.length} over ${daySpan} days (daily average: AED ${dailyAvg.toFixed(0)})
By category: ${sortedCategories}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.3,
        max_tokens: 200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: summary },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) return NextResponse.json({ error: "AI unavailable" }, { status: 502 });

    const data = await res.json();
    const content = (data.choices?.[0]?.message?.content ?? "").trim();

    let insights: string[];
    try {
      insights = JSON.parse(content);
    } catch {
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) return NextResponse.json({ error: "parse failed" }, { status: 502 });
      insights = JSON.parse(match[0]);
    }

    if (!Array.isArray(insights)) return NextResponse.json({ error: "invalid response" }, { status: 502 });
    return NextResponse.json({ insights: insights.slice(0, 3) });
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

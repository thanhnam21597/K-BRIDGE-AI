import { NextResponse } from "next/server";
import { fetchFlashcardStatsRows } from "@/lib/db-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const rows = await fetchFlashcardStatsRows(userId);
    const today = new Date().toISOString().slice(0, 10);
    const reviewedToday = rows.filter((row) => row.last_reviewed_at?.slice(0, 10) === today).length;
    const averageMastery =
      rows.length === 0
        ? 0
        : rows.reduce((acc, row) => acc + Number(row.mastery_score ?? 0), 0) / rows.length;

    const masteryByCategory = Object.fromEntries(
      rows.reduce<Map<string, { sum: number; count: number }>>((acc, row) => {
        const key = row.category ?? "Unknown";
        const existing = acc.get(key) ?? { sum: 0, count: 0 };
        existing.sum += Number(row.mastery_score ?? 0);
        existing.count += 1;
        acc.set(key, existing);
        return acc;
      }, new Map()).entries(),
    );

    const categories = Object.entries(masteryByCategory).map(([category, value]) => ({
      category,
      masteryRate: value.count === 0 ? 0 : value.sum / value.count,
    }));

    // Basic streak: count continuous days with at least one review.
    const reviewedDays = new Set(
      rows
        .map((row) => row.last_reviewed_at?.slice(0, 10))
        .filter((day): day is string => Boolean(day)),
    );
    let streak = 0;
    const cursor = new Date();
    while (true) {
      const day = cursor.toISOString().slice(0, 10);
      if (!reviewedDays.has(day)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return NextResponse.json({
      reviewedToday,
      masteryRate: averageMastery,
      streak,
      categories,
      dailyGoal: 10,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to get flashcard stats",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

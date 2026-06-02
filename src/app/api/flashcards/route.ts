import { NextResponse } from "next/server";
import { z } from "zod";
import { getDefaultFlashcards } from "@/lib/flashcards";
import {
  fetchFlashcardProgressByCardIds,
  fetchFlashcardProgressOne,
  mapFlashcardProgressRow,
  upsertFlashcardProgress,
} from "@/lib/db-store";
import { FlashcardProgress } from "@/lib/types";

const reviewSchema = z.object({
  userId: z.string().min(1),
  cardId: z.string().min(1),
  category: z.string().min(1),
  rating: z.enum(["easy", "hard", "forgot"]),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const mode = searchParams.get("mode") ?? "all";
    const category = searchParams.get("category");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const allCards = getDefaultFlashcards();
    const categoryCards = category
      ? allCards.filter((card) => card.category === category)
      : allCards;
    if (categoryCards.length === 0) {
      return NextResponse.json({ cards: [], mode, total: 0 });
    }

    const cardIds = categoryCards.map((card) => card.id);
    const progressRows = await fetchFlashcardProgressByCardIds(userId, cardIds);
    const progressById = new Map(
      progressRows.map((row) => [row.card_id, mapFlashcardProgressRow(row)]),
    );

    const cards = categoryCards.map((card) => ({
      ...card,
      progress:
        progressById.get(card.id) ??
        ({
          userId,
          cardId: card.id,
          reviewCount: 0,
          easyCount: 0,
          hardCount: 0,
          forgotCount: 0,
          masteryScore: 0,
          lastReviewedAt: null,
        } satisfies FlashcardProgress),
    }));

    const filtered = mode === "weak"
      ? cards.filter((card) => card.progress.masteryScore < 0.7)
      : cards;

    return NextResponse.json({
      cards: filtered,
      mode,
      total: filtered.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load flashcards",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = reviewSchema.parse(body);
    const existing = await fetchFlashcardProgressOne(parsed.userId, parsed.cardId);
    const reviewCount = (existing?.review_count ?? 0) + 1;
    const easyCount = (existing?.easy_count ?? 0) + (parsed.rating === "easy" ? 1 : 0);
    const hardCount = (existing?.hard_count ?? 0) + (parsed.rating === "hard" ? 1 : 0);
    const forgotCount = (existing?.forgot_count ?? 0) + (parsed.rating === "forgot" ? 1 : 0);
    const masteryScore = Math.max(
      0,
      Math.min(1, (easyCount - forgotCount * 0.6 + hardCount * 0.15) / Math.max(1, reviewCount)),
    );

    const row = {
      user_id: parsed.userId,
      card_id: parsed.cardId,
      category: parsed.category,
      review_count: reviewCount,
      easy_count: easyCount,
      hard_count: hardCount,
      forgot_count: forgotCount,
      mastery_score: masteryScore,
      last_reviewed_at: new Date().toISOString(),
    };

    await upsertFlashcardProgress(row);

    return NextResponse.json({ success: true, progress: row });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to update flashcard progress",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getDefaultFlashcards } from "@/lib/flashcards";
import { getSupabaseServerClient } from "@/lib/supabase";
import { FlashcardProgress } from "@/lib/types";

const reviewSchema = z.object({
  userId: z.string().min(1),
  cardId: z.string().min(1),
  category: z.string().min(1),
  rating: z.enum(["easy", "hard", "forgot"]),
});

function mapProgressRow(row: {
  user_id: string;
  card_id: string;
  review_count: number;
  easy_count: number;
  hard_count: number;
  forgot_count: number;
  mastery_score: number;
  last_reviewed_at: string | null;
}): FlashcardProgress {
  return {
    userId: row.user_id,
    cardId: row.card_id,
    reviewCount: row.review_count,
    easyCount: row.easy_count,
    hardCount: row.hard_count,
    forgotCount: row.forgot_count,
    masteryScore: row.mastery_score,
    lastReviewedAt: row.last_reviewed_at,
  };
}

type ProgressRow = {
  user_id: string;
  card_id: string;
  review_count: number;
  easy_count: number;
  hard_count: number;
  forgot_count: number;
  mastery_score: number;
  last_reviewed_at: string | null;
};

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

    const supabase = getSupabaseServerClient();
    const cardIds = categoryCards.map((card) => card.id);
    const { data, error } = await supabase
      .from("flashcard_progress")
      .select(
        "user_id,card_id,review_count,easy_count,hard_count,forgot_count,mastery_score,last_reviewed_at",
      )
      .eq("user_id", userId)
      .in("card_id", cardIds);

    const progressRows: ProgressRow[] = error ? [] : ((data ?? []) as ProgressRow[]);
    const progressById = new Map(
      progressRows.map((row) => [row.card_id, mapProgressRow(row)]),
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
    const supabase = getSupabaseServerClient();

    const { data: existingRows, error: existingError } = await supabase
      .from("flashcard_progress")
      .select(
        "user_id,card_id,review_count,easy_count,hard_count,forgot_count,mastery_score,last_reviewed_at",
      )
      .eq("user_id", parsed.userId)
      .eq("card_id", parsed.cardId)
      .limit(1);

    if (existingError) {
      throw new Error(existingError.message);
    }

    const existing = existingRows?.[0];
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

    const { error } = await supabase
      .from("flashcard_progress")
      .upsert(row, { onConflict: "user_id,card_id" });

    if (error) throw new Error(error.message);

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

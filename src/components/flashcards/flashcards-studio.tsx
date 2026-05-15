"use client";

import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { BookOpen, Flame, Sparkles, Target, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flashcard, FlashcardCategory, FlashcardProgress } from "@/lib/types";
import { cn } from "@/lib/utils";

type FlashcardWithProgress = Flashcard & { progress: FlashcardProgress };

type StudyMode = "all" | "weak";

const CATEGORY_OPTIONS: FlashcardCategory[] = [
  "Hierarchy & Respect",
  "Communication Style",
  "Meeting & Email Etiquette",
  "Feedback Culture",
  "Common Korean Business Terms",
  "Virtual Team Building",
];

type FlashcardsStudioProps = {
  userId: string;
};

export function FlashcardsStudio({ userId }: FlashcardsStudioProps) {
  const [studyMode, setStudyMode] = useState<StudyMode>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cards, setCards] = useState<FlashcardWithProgress[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    reviewedToday: number;
    masteryRate: number;
    streak: number;
    dailyGoal: number;
    categories: { category: string; masteryRate: number }[];
  }>({
    reviewedToday: 0,
    masteryRate: 0,
    streak: 0,
    dailyGoal: 10,
    categories: [],
  });
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const currentCard = cards[index];
  const total = cards.length;
  const masteryPercent = Math.round(stats.masteryRate * 100);

  const dailyGoalProgress = useMemo(
    () => Math.min(100, Math.round((stats.reviewedToday / Math.max(1, stats.dailyGoal)) * 100)),
    [stats.dailyGoal, stats.reviewedToday],
  );

  useEffect(() => {
    void loadCards();
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyMode, selectedCategory, userId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const targetTag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea" || targetTag === "select") return;

      if (event.code === "Space") {
        event.preventDefault();
        if (!currentCard || loading || sessionCompleted) return;
        setRevealed((prev) => !prev);
        return;
      }

      if (!revealed || !currentCard || loading || sessionCompleted) return;
      if (event.key === "1") void rateCard("easy");
      if (event.key === "2") void rateCard("hard");
      if (event.key === "3") void rateCard("forgot");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCard, revealed, loading, sessionCompleted]);

  async function loadCards() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId,
        mode: studyMode,
      });
      if (selectedCategory !== "all") {
        params.set("category", selectedCategory);
      }
      const response = await fetch(`/api/flashcards?${params.toString()}`);
      const data = await response.json();
      const nextCards = (Array.isArray(data.cards) ? data.cards : []) as FlashcardWithProgress[];
      setCards(nextCards);
      setIndex(0);
      setRevealed(false);
      setSessionReviewedCount(0);
      setSessionCompleted(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const response = await fetch(`/api/flashcards/stats?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();
      setStats({
        reviewedToday: Number(data.reviewedToday ?? 0),
        masteryRate: Number(data.masteryRate ?? 0),
        streak: Number(data.streak ?? 0),
        dailyGoal: Number(data.dailyGoal ?? 10),
        categories: Array.isArray(data.categories) ? data.categories : [],
      });
    } catch {
      // Keep defaults for non-blocking UX.
    }
  }

  async function rateCard(rating: "easy" | "hard" | "forgot") {
    if (!currentCard) return;
    await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        cardId: currentCard.id,
        category: currentCard.category,
        rating,
      }),
    });

    await loadStats();
    setSessionReviewedCount((prev) => prev + 1);
    const isLastCard = index >= total - 1;
    if (isLastCard) {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.7 },
      });
      setSessionCompleted(true);
    }

    setRevealed(false);
    if (!isLastCard) {
      setIndex((prev) => Math.min(prev + 1, Math.max(0, total - 1)));
    }
  }

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    setTouchStartX(event.touches[0].clientX);
  }

  function onTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX;
    if (delta > 70) {
      setIndex((prev) => Math.max(0, prev - 1));
      setRevealed(false);
    }
    if (delta < -70) {
      setIndex((prev) => Math.min(Math.max(0, total - 1), prev + 1));
      setRevealed(false);
    }
    setTouchStartX(null);
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-blue-100 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-blue-100">Study Deck</p>
              <h2 className="mt-1 text-2xl font-bold">Korean-Vietnamese Workplace Flashcards</h2>
              <p className="mt-1 text-sm text-blue-100">
                {studyMode === "all" ? "Study All Cards" : "Study Weak Areas"} • {selectedCategory === "all" ? "All Categories" : selectedCategory}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 text-right backdrop-blur">
              <p className="text-xs text-blue-100">Session Progress</p>
              <p className="text-xl font-semibold">{sessionReviewedCount}/{total || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="size-4 text-blue-600" />
            Flash Cards
          </CardTitle>
          <CardDescription>
            Self-test Korean workplace culture with spaced repetition and mastery tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200 shadow-none">
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Cards reviewed today</p>
                <p className="mt-1 text-xl font-semibold">{stats.reviewedToday}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-none">
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Mastery rate</p>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="relative size-12 rounded-full transition-all duration-500"
                    style={{
                      background: `conic-gradient(rgb(59,130,246) ${masteryPercent}%, rgb(226,232,240) ${masteryPercent}% 100%)`,
                    }}
                  >
                    <div className="absolute inset-[4px] rounded-full bg-white dark:bg-slate-900" />
                    <span className="absolute inset-0 grid place-items-center text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                      {masteryPercent}%
                    </span>
                  </div>
                  <p className="text-xl font-semibold">{masteryPercent}%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-none">
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">Streak</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xl font-semibold">
                  <Flame className="size-4 text-orange-500" />
                  {stats.streak} day
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-none">
              <CardContent className="space-y-1 p-3">
                <p className="text-xs text-slate-500">Daily goal</p>
                <p className="text-sm font-medium">{stats.reviewedToday}/{stats.dailyGoal}</p>
                <Progress value={dailyGoalProgress} />
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={studyMode === "all" ? "default" : "outline"}
              onClick={() => setStudyMode("all")}
            >
              Study All
            </Button>
            <Button
              variant={studyMode === "weak" ? "default" : "outline"}
              onClick={() => setStudyMode("weak")}
            >
              Study Weak Areas
            </Button>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="all">All Categories</option>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {stats.categories.map((entry) => (
              <div key={entry.category} className="rounded-lg border border-slate-200 p-2">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <span>{entry.category}</span>
                  <span>{Math.round(entry.masteryRate * 100)}%</span>
                </div>
                <Progress value={Math.round(entry.masteryRate * 100)} />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Shortcuts: <kbd className="rounded border px-1 py-0.5">Space</kbd> show/hide answer,{" "}
            <kbd className="rounded border px-1 py-0.5">1</kbd> Easy,{" "}
            <kbd className="rounded border px-1 py-0.5">2</kbd> Hard,{" "}
            <kbd className="rounded border px-1 py-0.5">3</kbd> Forgot
          </p>
        </CardContent>
      </Card>

      {sessionCompleted && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-2">
              <Trophy className="mt-0.5 size-5 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-800">Session completed!</p>
                <p className="text-sm text-emerald-700">
                  You reviewed {sessionReviewedCount} cards this round. Great consistency.
                </p>
              </div>
            </div>
            <Button
              onClick={() => void loadCards()}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              Start New Session
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Card {total === 0 ? 0 : index + 1} / {total}
            </span>
            <Badge variant="outline">{currentCard?.category ?? "No cards"}</Badge>
          </div>

          <div
            className="relative h-[320px] [perspective:1200px]"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <button
              className={cn(
                "absolute inset-0 w-full rounded-2xl border border-slate-200 bg-white p-5 text-left transition-transform duration-500 [transform-style:preserve-3d] dark:bg-slate-900",
                revealed && "[transform:rotateY(180deg)]",
              )}
              onClick={() => setRevealed((prev) => !prev)}
              disabled={!currentCard || loading || sessionCompleted}
            >
              <div className="absolute inset-0 rounded-2xl p-5 [backface-visibility:hidden]">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Front</p>
                <p className="whitespace-pre-line text-base font-medium text-slate-800 dark:text-slate-100">
                  {loading
                    ? "Loading cards..."
                    : currentCard?.front || "No flashcards available for current filter."}
                </p>
                {currentCard && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {currentCard.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="accent">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="absolute inset-0 rounded-2xl p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Back</p>
                <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">
                  {currentCard?.back}
                </p>
              </div>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setRevealed((prev) => !prev)}
                disabled={!currentCard || loading || sessionCompleted}
            >
              Show Answer
            </Button>
            <Button
              variant="secondary"
              onClick={() => void rateCard("easy")}
                disabled={!currentCard || !revealed || loading || sessionCompleted}
            >
              <Sparkles className="size-4" />
              I Know It
            </Button>
            <Button
              variant="outline"
              onClick={() => void rateCard("hard")}
                disabled={!currentCard || !revealed || loading || sessionCompleted}
            >
              Hard
            </Button>
            <Button
              variant="ghost"
              onClick={() => void rateCard("forgot")}
                disabled={!currentCard || !revealed || loading || sessionCompleted}
            >
              Forgot
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIndex((prev) => Math.min(Math.max(0, total - 1), prev + 1));
                setRevealed(false);
              }}
              disabled={!currentCard || loading || sessionCompleted}
            >
              <Target className="size-4" />
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

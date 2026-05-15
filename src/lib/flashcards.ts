import {
  KoreanVietnameseKbEntry,
  KoreanVietnameseKbTag,
  KOREAN_VIETNAMESE_WORKPLACE_KB,
} from "@/lib/korean-vietnamese-kb";
import {
  Flashcard,
  FlashcardCategory,
  FlashcardDifficulty,
} from "@/lib/types";

const TAG_TO_FLASHCARD_CATEGORY: Partial<
  Record<KoreanVietnameseKbTag, FlashcardCategory>
> = {
  hierarchy: "Hierarchy & Respect",
  "addressing-seniors": "Hierarchy & Respect",
  "communication-style": "Communication Style",
  "meeting-etiquette": "Meeting & Email Etiquette",
  "feedback-culture": "Feedback Culture",
  glossary: "Common Korean Business Terms",
  misunderstanding: "Communication Style",
  "reporting-delay": "Communication Style",
  "virtual-team-building": "Virtual Team Building",
  "remote-collaboration": "Virtual Team Building",
};

const FALLBACK_CATEGORY: FlashcardCategory = "Communication Style";

function inferCategory(entry: KoreanVietnameseKbEntry): FlashcardCategory {
  for (const tag of entry.tags) {
    const mapped = TAG_TO_FLASHCARD_CATEGORY[tag];
    if (mapped) return mapped;
  }
  return FALLBACK_CATEGORY;
}

function inferDifficulty(entry: KoreanVietnameseKbEntry): FlashcardDifficulty {
  if (entry.tags.includes("misunderstanding") || entry.tags.includes("reporting-delay")) {
    return "hard";
  }
  if (entry.tags.includes("meeting-etiquette") || entry.tags.includes("feedback-culture")) {
    return "medium";
  }
  return "easy";
}

function makeQuestionCard(entry: KoreanVietnameseKbEntry, index: number): Flashcard {
  const category = inferCategory(entry);
  const difficulty = inferDifficulty(entry);
  return {
    id: `fc-q-${entry.id}`,
    front: `VN: Tinh huong #${index + 1}: ${entry.title}\nEN: How should you handle this in a Korean workplace?`,
    back: [
      `Answer: ${entry.content}`,
      "Cultural Explanation: Korean teams value clarity with respect, social awareness, and structured follow-up.",
      "Example: Draft a concise update with context, impact, and next action, then ask for confirmation politely.",
    ].join("\n\n"),
    category,
    tags: entry.tags,
    difficulty,
  };
}

function makeTermCard(entry: KoreanVietnameseKbEntry): Flashcard {
  const category = inferCategory(entry);
  const difficulty = inferDifficulty(entry);
  return {
    id: `fc-t-${entry.id}`,
    front: `VN/EN Term: ${entry.title}\nWhat does this mean in Korean-Vietnamese work context?`,
    back: [
      `Answer: ${entry.content}`,
      "Cultural Explanation: Apply this concept with hierarchy awareness and indirect-yet-clear communication.",
      "Example: In weekly sync, summarize status in 3 bullets and confirm owner + deadline in writing.",
    ].join("\n\n"),
    category,
    tags: [...entry.tags, "term"],
    difficulty,
  };
}

/**
 * Source of truth is local KB. We generate deterministic cards so progress IDs stay stable.
 */
export function getDefaultFlashcards(): Flashcard[] {
  const generated: Flashcard[] = [];
  KOREAN_VIETNAMESE_WORKPLACE_KB.forEach((entry, index) => {
    generated.push(makeQuestionCard(entry, index));
    generated.push(makeTermCard(entry));
  });

  // Ensure at least 30 cards for initial training set.
  return generated.slice(0, 30);
}

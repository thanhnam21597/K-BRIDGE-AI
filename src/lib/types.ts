export type FeatureKey =
  | "demo-flow"
  | "cultural-coach"
  | "onboarding-kpi"
  | "translator"
  | "role-play"
  | "flashcards"
  | "ask-who"
  | "weekly-timeline";

export type LanguageCode = "vi" | "en" | "ko";

export type UserProfile = {
  name: string;
  role: "engineer" | "qa" | "designer" | "pm" | "operations";
  koreanLevel: "beginner" | "intermediate" | "advanced";
  workStyle: "onsite" | "hybrid" | "remote";
};

export type OnboardingTask = {
  id: string;
  day: number;
  title: string;
  description: string;
  category: "culture" | "technical" | "communication" | "compliance";
  roleTags: UserProfile["role"][];
  priority: "high" | "medium" | "low";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type DailyTip = {
  id: string;
  title: string;
  content: string;
  category: "culture" | "language" | "career";
};

export type ChecklistCategory =
  | "First Week"
  | "First Month"
  | "Cultural Adaptation"
  | "Technical Setup"
  | "Relationship Building";

export type DynamicChecklistTask = {
  id: string;
  day: number;
  title: string;
  description: string;
  category: ChecklistCategory;
};

export type FlashcardCategory =
  | "Hierarchy & Respect"
  | "Communication Style"
  | "Meeting & Email Etiquette"
  | "Feedback Culture"
  | "Common Korean Business Terms"
  | "Virtual Team Building";

export type FlashcardDifficulty = "easy" | "medium" | "hard";

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  category: FlashcardCategory;
  tags: string[];
  difficulty: FlashcardDifficulty;
};

export type FlashcardProgress = {
  userId: string;
  cardId: string;
  reviewCount: number;
  easyCount: number;
  hardCount: number;
  forgotCount: number;
  masteryScore: number;
  lastReviewedAt: string | null;
};

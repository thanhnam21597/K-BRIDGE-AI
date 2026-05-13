export type FeatureKey =
  | "cultural-coach"
  | "translator"
  | "role-play"
  | "daily-tips";

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

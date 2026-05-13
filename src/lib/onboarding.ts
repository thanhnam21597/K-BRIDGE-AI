import { DailyTip, OnboardingTask, UserProfile } from "@/lib/types";

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "Nguyen An",
  role: "engineer",
  koreanLevel: "beginner",
  workStyle: "hybrid",
};

export const ONBOARDING_TASKS: OnboardingTask[] = [
  {
    id: "d1-culture-intro",
    day: 1,
    title: "Understand Korean workplace hierarchy",
    description: "Learn job titles, decision flow, and meeting etiquette.",
    category: "culture",
    roleTags: ["engineer", "qa", "designer", "pm", "operations"],
    priority: "high",
  },
  {
    id: "d2-compliance-docs",
    day: 2,
    title: "Submit onboarding documents",
    description: "Upload passport, contract signatures, and tax details.",
    category: "compliance",
    roleTags: ["engineer", "qa", "designer", "pm", "operations"],
    priority: "high",
  },
  {
    id: "d3-tools-setup",
    day: 3,
    title: "Set up collaboration tools",
    description: "Configure email, Slack, Jira, Notion, and VPN access.",
    category: "technical",
    roleTags: ["engineer", "qa", "designer", "pm", "operations"],
    priority: "high",
  },
  {
    id: "d5-daily-standup",
    day: 5,
    title: "Practice standup update in Korean style",
    description: "Use concise status, blocker, and next-step format.",
    category: "communication",
    roleTags: ["engineer", "qa", "designer", "pm"],
    priority: "medium",
  },
  {
    id: "d7-org-map",
    day: 7,
    title: "Map your stakeholders",
    description: "Identify your manager, mentor, and cross-team partners.",
    category: "communication",
    roleTags: ["engineer", "qa", "designer", "pm", "operations"],
    priority: "medium",
  },
  {
    id: "d10-code-review",
    day: 10,
    title: "Understand review expectations",
    description: "Learn quality standards and response etiquette in reviews.",
    category: "technical",
    roleTags: ["engineer", "qa"],
    priority: "high",
  },
  {
    id: "d12-design-sync",
    day: 12,
    title: "Present a design rationale",
    description: "Explain trade-offs and user impact in a cross-team sync.",
    category: "communication",
    roleTags: ["designer", "pm"],
    priority: "medium",
  },
  {
    id: "d14-reporting",
    day: 14,
    title: "Share weekly progress update",
    description: "Write a weekly summary with achievements and risks.",
    category: "communication",
    roleTags: ["engineer", "qa", "designer", "pm", "operations"],
    priority: "medium",
  },
  {
    id: "d18-handbook",
    day: 18,
    title: "Review HR policy handbook",
    description: "Focus on leave policy, overtime, and conflict procedure.",
    category: "compliance",
    roleTags: ["engineer", "qa", "designer", "pm", "operations"],
    priority: "medium",
  },
  {
    id: "d21-customer-context",
    day: 21,
    title: "Study customer persona in Korea market",
    description: "Understand user behavior and market expectations.",
    category: "culture",
    roleTags: ["designer", "pm", "operations"],
    priority: "medium",
  },
  {
    id: "d24-escalation",
    day: 24,
    title: "Learn escalation protocol",
    description: "Know who to notify and when incidents happen.",
    category: "compliance",
    roleTags: ["engineer", "qa", "operations", "pm"],
    priority: "high",
  },
  {
    id: "d27-feedback",
    day: 27,
    title: "Ask for 1:1 feedback",
    description: "Prepare structured questions for your manager.",
    category: "culture",
    roleTags: ["engineer", "qa", "designer", "pm", "operations"],
    priority: "low",
  },
  {
    id: "d30-final-review",
    day: 30,
    title: "Complete 30-day retrospective",
    description: "Document wins, challenges, and next-month goals.",
    category: "communication",
    roleTags: ["engineer", "qa", "designer", "pm", "operations"],
    priority: "high",
  },
];

export const DAILY_TIPS: DailyTip[] = [
  {
    id: "tip-1",
    title: "Use concise updates in meetings",
    content:
      "Korean teams value short and clear reports. Use: progress, blocker, next action.",
    category: "culture",
  },
  {
    id: "tip-2",
    title: "Learn two honorific phrases",
    content:
      "Adding polite endings such as '...seumnida' can build immediate trust with senior peers.",
    category: "language",
  },
  {
    id: "tip-3",
    title: "Confirm decisions in writing",
    content:
      "After calls, send a short summary in Slack or email to avoid ambiguity across languages.",
    category: "career",
  },
];

export function buildAdaptiveChecklist(profile: UserProfile): OnboardingTask[] {
  const base = ONBOARDING_TASKS.filter((task) => task.roleTags.includes(profile.role));

  if (profile.koreanLevel === "beginner") {
    return base.map((task) =>
      task.category === "communication"
        ? {
            ...task,
            description: `${task.description} Add translation support before sharing.`,
          }
        : task,
    );
  }

  return base;
}

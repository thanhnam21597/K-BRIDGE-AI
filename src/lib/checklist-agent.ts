import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { DynamicChecklistTask } from "@/lib/types";

const checklistSchema = z.object({
  tasks: z
    .array(
      z.object({
        day: z.number().int().min(1).max(30),
        title: z.string().min(3),
        description: z.string().min(8),
        category: z.enum([
          "First Week",
          "First Month",
          "Cultural Adaptation",
          "Technical Setup",
          "Relationship Building",
        ]),
      }),
    )
    .length(30),
});

function getModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    return new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-3-5-sonnet-latest",
      temperature: 0.2,
    });
  }

  if (process.env.GROQ_API_KEY) {
    return new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });
  }

  return new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0.2,
  });
}

type GenerateChecklistInput = {
  position: string;
  company: string;
  startDate: string;
};

export async function generatePersonalizedChecklist({
  position,
  company,
  startDate,
}: GenerateChecklistInput): Promise<DynamicChecklistTask[]> {
  try {
    const model = getModel();
    const response = await model.invoke([
      new SystemMessage(
        [
          "You are an onboarding planner for Vietnamese remote employees joining Korean companies.",
          "Generate exactly 30 tasks for day 1 to day 30.",
          "Categories must only be:",
          "First Week, First Month, Cultural Adaptation, Technical Setup, Relationship Building.",
          "Return strict JSON only with shape: {\"tasks\":[{day,title,description,category}]}",
          "Keep tasks practical and specific to Korean work culture and remote collaboration.",
        ].join("\n"),
      ),
      new HumanMessage(
        `Position: ${position}\nCompany: ${company}\nStart date: ${startDate}`,
      ),
    ]);

    const parsed = checklistSchema.parse(JSON.parse(response.content.toString()));
    const normalizedTasks = parsed.tasks.map((task) => ({
      id: `day-${task.day}-${slugify(task.title)}`,
      ...task,
    }));
    return enforceWeeklyCheckpointTasks(normalizedTasks, position, company);
  } catch {
    // Safe fallback keeps feature usable even if model key is missing.
    return enforceWeeklyCheckpointTasks(
      buildFallbackChecklist(position, company),
      position,
      company,
    );
  }
}

export async function generateCongratsTip(task: DynamicChecklistTask) {
  try {
    const model = getModel();
    const response = await model.invoke([
      new SystemMessage(
        [
          "You are a supportive onboarding coach.",
          "Reply in Vietnamese first, then short English in parentheses.",
          "Give one congratulatory line and one practical next tip.",
          "Keep under 80 words total.",
        ].join("\n"),
      ),
      new HumanMessage(
        `User completed: Day ${task.day} - ${task.title}. Category: ${task.category}.`,
      ),
    ]);
    return response.content.toString();
  } catch {
    return `Tuyet voi! Ban vua hoan thanh "${task.title}". Goi y tiep theo: hay chuan bi truoc 1-2 cau hoi cho buoi hop ke tiep de tao an tuong chu dong. (Great work! Prepare 1-2 clear questions for your next meeting.)`;
  }
}

type RegenerateCategoryInput = {
  position: string;
  company: string;
  startDate: string;
  category: DynamicChecklistTask["category"];
  targetDays: number[];
};

export async function regenerateChecklistCategory({
  position,
  company,
  startDate,
  category,
  targetDays,
}: RegenerateCategoryInput): Promise<DynamicChecklistTask[]> {
  const normalizedDays = [...new Set(targetDays)].sort((a, b) => a - b);
  if (normalizedDays.length === 0) return [];

  const regenerateSchema = z.object({
    tasks: z.array(
      z.object({
        day: z.number().int().min(1).max(30),
        title: z.string().min(3),
        description: z.string().min(8),
      }),
    ),
  });

  try {
    const model = getModel();
    const response = await model.invoke([
      new SystemMessage(
        [
          "You generate onboarding tasks for a specific category only.",
          "Return strict JSON only with shape: {\"tasks\":[{day,title,description}]}",
          "Generate one task for each requested day exactly.",
          "Do not include days outside the requested set.",
          `The category for all tasks must conceptually fit: ${category}.`,
        ].join("\n"),
      ),
      new HumanMessage(
        [
          `Position: ${position}`,
          `Company: ${company}`,
          `Start date: ${startDate}`,
          `Category: ${category}`,
          `Requested days: ${normalizedDays.join(", ")}`,
        ].join("\n"),
      ),
    ]);

    const parsed = regenerateSchema.parse(JSON.parse(response.content.toString()));
    const byDay = new Map(parsed.tasks.map((task) => [task.day, task]));

    return normalizedDays.map((day) => {
      const task = byDay.get(day);
      if (!task) {
        const fallbackTask: DynamicChecklistTask = {
          id: `day-${day}-${slugify(`${category}-${position}`)}`,
          day,
          category,
          title: `${category} task for day ${day}`,
          description: `Prepare one concrete ${category.toLowerCase()} deliverable for your ${position} role at ${company}.`,
        };
        return isWeeklyCheckpointDay(day)
          ? buildWeeklyCheckpointTask(day, position, company, category)
          : fallbackTask;
      }

      const generatedTask: DynamicChecklistTask = {
        id: `day-${day}-${slugify(task.title)}`,
        day,
        category,
        title: task.title,
        description: task.description,
      };
      return isWeeklyCheckpointDay(day)
        ? buildWeeklyCheckpointTask(day, position, company, category)
        : generatedTask;
    });
  } catch {
    return normalizedDays.map((day) => ({
      id: `day-${day}-${slugify(`${category}-${day}`)}`,
      day,
      category,
      title: `${category} focus for day ${day}`,
      description: `Update your ${category.toLowerCase()} plan for ${position} at ${company}, then share one measurable next step.`,
    }));
  }
}

function buildFallbackChecklist(position: string, company: string): DynamicChecklistTask[] {
  const categoryByDay = (day: number): DynamicChecklistTask["category"] => {
    if (day <= 7) return "First Week";
    if (day <= 14) return "Technical Setup";
    if (day <= 20) return "Cultural Adaptation";
    if (day <= 26) return "Relationship Building";
    return "First Month";
  };

  return Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const category = categoryByDay(day);
    return {
      id: `day-${day}`,
      day,
      category,
      title: `${position} onboarding task ${day}`,
      description: `Complete a ${category.toLowerCase()} milestone for your ${position} role at ${company}, including one concrete output to share with your manager.`,
    };
  });
}

function isWeeklyCheckpointDay(day: number) {
  return day === 7 || day === 14 || day === 21 || day === 28;
}

function buildWeeklyCheckpointTask(
  day: number,
  position: string,
  company: string,
  category: DynamicChecklistTask["category"],
): DynamicChecklistTask {
  const week = Math.ceil(day / 7);
  const title = `Weekly checkpoint quiz - Week ${week}`;
  return {
    id: `day-${day}-${slugify(title)}`,
    day,
    category,
    title,
    description: `Take a 15-minute self-test on your Week ${week} onboarding progress for ${position} at ${company}: culture understanding, communication quality, and next-week action plan.`,
  };
}

function enforceWeeklyCheckpointTasks(
  tasks: DynamicChecklistTask[],
  position: string,
  company: string,
) {
  return tasks.map((task) =>
    isWeeklyCheckpointDay(task.day)
      ? buildWeeklyCheckpointTask(task.day, position, company, task.category)
      : task,
  );
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

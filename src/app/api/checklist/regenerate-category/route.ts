import { NextResponse } from "next/server";
import { z } from "zod";
import { regenerateChecklistCategory } from "@/lib/checklist-agent";

const requestSchema = z.object({
  position: z.string().min(2),
  company: z.string().min(2),
  startDate: z.string().min(4),
  category: z.enum([
    "First Week",
    "First Month",
    "Cultural Adaptation",
    "Technical Setup",
    "Relationship Building",
  ]),
  targetDays: z.array(z.number().int().min(1).max(30)).min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = requestSchema.parse(body);
    const tasks = await regenerateChecklistCategory(input);
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to regenerate category tasks",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

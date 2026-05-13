import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCongratsTip } from "@/lib/checklist-agent";

const requestSchema = z.object({
  task: z.object({
    id: z.string(),
    day: z.number().int().min(1).max(30),
    title: z.string(),
    description: z.string(),
    category: z.enum([
      "First Week",
      "First Month",
      "Cultural Adaptation",
      "Technical Setup",
      "Relationship Building",
    ]),
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task } = requestSchema.parse(body);
    const message = await generateCongratsTip(task);
    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to generate congratulatory tip",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

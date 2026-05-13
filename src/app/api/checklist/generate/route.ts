import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePersonalizedChecklist } from "@/lib/checklist-agent";

const requestSchema = z.object({
  position: z.string().min(2),
  company: z.string().min(2),
  startDate: z.string().min(4),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = requestSchema.parse(body);
    const tasks = await generatePersonalizedChecklist(input);
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to generate checklist",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

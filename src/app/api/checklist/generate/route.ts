import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePersonalizedChecklist } from "@/lib/checklist-agent";
import { checkRateLimit, createRateLimitKey } from "@/lib/rate-limit";
import { logApiError } from "@/lib/server-log";

const requestSchema = z.object({
  position: z.string().min(2),
  company: z.string().min(2),
  startDate: z.string().min(4),
});

export async function POST(request: Request) {
  try {
    const limiter = checkRateLimit(createRateLimitKey(request, "checklist-generate-post"), 10, 60_000);
    if (!limiter.ok) {
      return NextResponse.json(
        { error: "Too many checklist generations. Please retry shortly." },
        { status: 429 },
      );
    }
    const body = await request.json();
    const input = requestSchema.parse(body);
    const tasks = await generatePersonalizedChecklist(input);
    return NextResponse.json({ tasks });
  } catch (error) {
    logApiError("api/checklist/generate:POST", error);
    return NextResponse.json(
      {
        error: "Unable to generate checklist",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

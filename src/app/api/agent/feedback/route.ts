import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertCoachFeedback } from "@/lib/db-store";
import { checkRateLimit, createRateLimitKey } from "@/lib/rate-limit";
import { logApiError } from "@/lib/server-log";

const requestSchema = z.object({
  userId: z.string().min(1),
  messageId: z.string().min(1),
  rating: z.enum(["up", "down"]),
  reason: z.string().max(400).optional(),
  userMessage: z.string().max(3000).optional(),
  assistantMessage: z.string().min(1).max(8000),
});

export async function POST(request: Request) {
  try {
    const limiter = checkRateLimit(createRateLimitKey(request, "agent-feedback-post"), 50, 60_000);
    if (!limiter.ok) {
      return NextResponse.json(
        { error: "Too many feedback requests. Please retry shortly." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const input = requestSchema.parse(body);
    await upsertCoachFeedback({
      userId: input.userId,
      messageId: input.messageId,
      rating: input.rating,
      reason: input.reason,
      userMessage: input.userMessage,
      assistantMessage: input.assistantMessage,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/agent/feedback:POST", error);
    return NextResponse.json(
      {
        error: "Unable to save coach feedback",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

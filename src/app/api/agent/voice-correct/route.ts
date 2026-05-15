import { NextResponse } from "next/server";
import { z } from "zod";
import { autoCorrectTranscript } from "@/lib/llm";
import { checkRateLimit, createRateLimitKey } from "@/lib/rate-limit";
import { logApiError } from "@/lib/server-log";

const requestSchema = z.object({
  transcript: z.string().min(1).max(4000),
  language: z.enum(["vi-VN", "en-US"]),
});

export async function POST(request: Request) {
  try {
    const limiter = checkRateLimit(createRateLimitKey(request, "voice-correct-post"), 25, 60_000);
    if (!limiter.ok) {
      return NextResponse.json(
        { error: "Too many voice correction requests. Please retry shortly." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { transcript, language } = requestSchema.parse(body);
    const corrected = await autoCorrectTranscript(transcript, language);

    return NextResponse.json({ corrected });
  } catch (error) {
    logApiError("api/agent/voice-correct:POST", error);
    return NextResponse.json(
      {
        error: "Unable to auto-correct transcript",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

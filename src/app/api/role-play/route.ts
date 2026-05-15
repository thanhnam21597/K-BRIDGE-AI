import { NextResponse } from "next/server";
import { z } from "zod";
import { runRolePlay } from "@/lib/llm";
import { checkRateLimit, createRateLimitKey } from "@/lib/rate-limit";
import { logApiError } from "@/lib/server-log";

const requestSchema = z.object({
  scenario: z.string().min(5),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const limiter = checkRateLimit(createRateLimitKey(request, "role-play-post"), 20, 60_000);
    if (!limiter.ok) {
      return NextResponse.json(
        { error: "Too many simulation requests. Please retry shortly." },
        { status: 429 },
      );
    }
    const body = await request.json();
    const { scenario, message } = requestSchema.parse(body);
    const reply = await runRolePlay(scenario, message);

    return NextResponse.json({ reply });
  } catch (error) {
    logApiError("api/role-play:POST", error);
    return NextResponse.json(
      {
        error: "Unable to run role-play simulation",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

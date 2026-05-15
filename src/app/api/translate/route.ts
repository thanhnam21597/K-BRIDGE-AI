import { NextResponse } from "next/server";
import { z } from "zod";
import { translateBusinessText } from "@/lib/llm";
import { checkRateLimit, createRateLimitKey } from "@/lib/rate-limit";
import { logApiError } from "@/lib/server-log";

const requestSchema = z.object({
  text: z.string().min(1),
  from: z.enum(["vi", "en", "ko", "auto"]),
  to: z.enum(["vi", "en", "ko"]),
});

export async function POST(request: Request) {
  try {
    const limiter = checkRateLimit(createRateLimitKey(request, "translate-post"), 30, 60_000);
    if (!limiter.ok) {
      return NextResponse.json(
        { error: "Too many translation requests. Please retry shortly." },
        { status: 429 },
      );
    }
    const body = await request.json();
    const { text, from, to } = requestSchema.parse(body);
    const translatedText = await translateBusinessText(text, from, to);

    return NextResponse.json({ translatedText });
  } catch (error) {
    logApiError("api/translate:POST", error);
    return NextResponse.json(
      {
        error: "Unable to translate text",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

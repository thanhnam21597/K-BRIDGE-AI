import { NextResponse } from "next/server";
import { z } from "zod";
import {
  chatWithKBridgeAgent,
  clearUserConversationHistory,
  loadUserConversationHistory,
} from "@/lib/kbridge-agent";
import { checkRateLimit, createRateLimitKey } from "@/lib/rate-limit";
import { logApiError } from "@/lib/server-log";

const requestSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1),
  responseLanguage: z.enum(["vi", "en"]).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, message, responseLanguage } = requestSchema.parse(body);
    const limiter = checkRateLimit(
      createRateLimitKey(request, "agent-chat-post", userId),
      20,
      60_000,
    );
    if (!limiter.ok) {
      return NextResponse.json(
        {
          error: "Too many requests. Please retry shortly.",
          retryAfterMs: limiter.retryAfterMs,
        },
        { status: 429 },
      );
    }
    const reply = await chatWithKBridgeAgent(userId, message, responseLanguage ?? "vi");

    return NextResponse.json({ reply });
  } catch (error) {
    logApiError("api/agent/chat:POST", error);
    return NextResponse.json(
      {
        error: "Unable to chat with K-Bridge agent",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    const limiter = checkRateLimit(
      createRateLimitKey(request, "agent-chat-get", userId),
      40,
      60_000,
    );
    if (!limiter.ok) {
      return NextResponse.json(
        {
          error: "Too many history requests. Please retry shortly.",
          retryAfterMs: limiter.retryAfterMs,
        },
        { status: 429 },
      );
    }

    const messages = await loadUserConversationHistory(userId);
    return NextResponse.json({ messages });
  } catch (error) {
    logApiError("api/agent/chat:GET", error);
    return NextResponse.json(
      {
        error: "Unable to load conversation history",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    const limiter = checkRateLimit(
      createRateLimitKey(request, "agent-chat-delete", userId),
      10,
      60_000,
    );
    if (!limiter.ok) {
      return NextResponse.json(
        {
          error: "Too many clear-history attempts. Please retry shortly.",
          retryAfterMs: limiter.retryAfterMs,
        },
        { status: 429 },
      );
    }

    await clearUserConversationHistory(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError("api/agent/chat:DELETE", error);
    return NextResponse.json(
      {
        error: "Unable to clear conversation history",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

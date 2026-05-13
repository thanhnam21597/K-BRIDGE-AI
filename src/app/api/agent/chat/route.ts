import { NextResponse } from "next/server";
import { z } from "zod";
import {
  chatWithKBridgeAgent,
  clearUserConversationHistory,
  loadUserConversationHistory,
} from "@/lib/kbridge-agent";

const requestSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, message } = requestSchema.parse(body);
    const reply = await chatWithKBridgeAgent(userId, message);

    return NextResponse.json({ reply });
  } catch (error) {
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

    const messages = await loadUserConversationHistory(userId);
    return NextResponse.json({ messages });
  } catch (error) {
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

    await clearUserConversationHistory(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to clear conversation history",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

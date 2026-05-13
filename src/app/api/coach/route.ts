import { NextResponse } from "next/server";
import { z } from "zod";
import { chatWithKBridgeAgent } from "@/lib/kbridge-agent";

const requestSchema = z.object({
  userId: z.string().default("legacy-demo-user"),
  message: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, message, messages } = requestSchema.parse(body);

    const resolvedMessage =
      message ??
      messages
        ?.slice()
        .reverse()
        .find((entry) => entry.role === "user")?.content;

    if (!resolvedMessage) {
      return NextResponse.json(
        { error: "Missing message content" },
        { status: 400 },
      );
    }

    const reply = await chatWithKBridgeAgent(userId, resolvedMessage);

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to generate coach response",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

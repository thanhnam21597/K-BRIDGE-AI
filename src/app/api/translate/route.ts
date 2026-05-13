import { NextResponse } from "next/server";
import { z } from "zod";
import { translateBusinessText } from "@/lib/llm";

const requestSchema = z.object({
  text: z.string().min(1),
  from: z.enum(["vi", "en", "ko"]),
  to: z.enum(["vi", "en", "ko"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, from, to } = requestSchema.parse(body);
    const translatedText = await translateBusinessText(text, from, to);

    return NextResponse.json({ translatedText });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to translate text",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

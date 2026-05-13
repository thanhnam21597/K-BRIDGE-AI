import { NextResponse } from "next/server";
import { z } from "zod";
import { runRolePlay } from "@/lib/llm";

const requestSchema = z.object({
  scenario: z.string().min(5),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scenario, message } = requestSchema.parse(body);
    const reply = await runRolePlay(scenario, message);

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to run role-play simulation",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

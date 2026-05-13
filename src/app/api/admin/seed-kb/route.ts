import { NextResponse } from "next/server";
import { seedKoreanVietnameseKnowledgeBase } from "@/lib/seed-kb";

export async function POST(request: Request) {
  try {
    const secretFromEnv = process.env.SEED_API_KEY;
    if (secretFromEnv) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");
      if (!token || token !== secretFromEnv) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await seedKoreanVietnameseKnowledgeBase();
    return NextResponse.json({
      message: "Knowledge base seeded successfully.",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to seed knowledge base",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

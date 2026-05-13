import { NextResponse } from "next/server";
import { z } from "zod";
import { uploadUserDocuments } from "@/lib/kbridge-agent";

export const runtime = "nodejs";

const schema = z.object({
  userId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const userId = formData.get("userId");
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    const parsed = schema.parse({ userId });

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded." },
        { status: 400 },
      );
    }

    const result = await uploadUserDocuments(parsed.userId, files);
    return NextResponse.json({
      message: "Documents uploaded for RAG context.",
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to process uploaded documents",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

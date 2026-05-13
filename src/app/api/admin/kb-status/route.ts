import { NextResponse } from "next/server";
import { getGlobalKbStatus } from "@/lib/seed-kb";

export async function GET() {
  try {
    const status = await getGlobalKbStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to get KB status",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";
import { DAILY_TIPS } from "@/lib/onboarding";

export async function GET() {
  return NextResponse.json({
    tips: DAILY_TIPS,
    generatedAt: new Date().toISOString(),
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, createRateLimitKey } from "@/lib/rate-limit";
import { logApiError } from "@/lib/server-log";

export const runtime = "nodejs";

const requestSchema = z.object({
  language: z.enum(["vi", "en"]).default("vi"),
});

function buildValseaEndpoint(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (normalized.endsWith("/transcribe")) return normalized;
  if (normalized.endsWith("/speech-to-text")) return normalized;
  return `${normalized}/v1/transcribe`;
}

function extractTranscript(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;

  const directCandidates = [
    record.transcript,
    record.text,
    record.output,
    record.result,
  ];
  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      const nestedText = nested.transcript ?? nested.text;
      if (typeof nestedText === "string" && nestedText.trim()) {
        return nestedText.trim();
      }
    }
  }

  const data = record.data;
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    const nestedText = nested.transcript ?? nested.text;
    if (typeof nestedText === "string" && nestedText.trim()) {
      return nestedText.trim();
    }
  }

  return "";
}

export async function POST(request: Request) {
  try {
    const limiter = checkRateLimit(createRateLimitKey(request, "agent-transcribe-post"), 20, 60_000);
    if (!limiter.ok) {
      return NextResponse.json(
        { error: "Too many transcription requests. Please retry shortly." },
        { status: 429 },
      );
    }

    const apiKey = process.env.VALSEA_API_KEY;
    const baseUrl = process.env.VALSEA_BASE_URL;
    if (!apiKey || !baseUrl) {
      return NextResponse.json(
        {
          error: "VALSEA is not configured",
          detail: "Set VALSEA_API_KEY and VALSEA_BASE_URL in environment variables.",
        },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const audio = formData.get("audio");
    const parsed = requestSchema.parse({
      language: formData.get("language") ?? "vi",
    });

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    const providerFormData = new FormData();
    providerFormData.append("file", audio, audio.name || "recording.webm");
    providerFormData.append("language", parsed.language);
    providerFormData.append("response_format", "json");

    const response = await fetch(buildValseaEndpoint(baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: providerFormData,
    });

    const responseText = await response.text();
    let responsePayload: unknown = {};
    try {
      responsePayload = responseText ? JSON.parse(responseText) : {};
    } catch {
      responsePayload = { text: responseText };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "VALSEA transcription failed",
          detail:
            (responsePayload as Record<string, unknown>)?.error ??
            (responsePayload as Record<string, unknown>)?.message ??
            "Unknown provider error",
        },
        { status: 502 },
      );
    }

    const transcript = extractTranscript(responsePayload);
    if (!transcript) {
      return NextResponse.json(
        {
          error: "No transcript returned from VALSEA",
          detail: "Provider response did not include transcript text.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    logApiError("api/agent/transcribe:POST", error);
    return NextResponse.json(
      {
        error: "Unable to transcribe audio",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

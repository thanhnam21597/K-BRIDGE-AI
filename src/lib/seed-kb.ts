import { OpenAIEmbeddings } from "@langchain/openai";
import { getSupabaseServerClient } from "@/lib/supabase";
import {
  getKbCategoryFromTags,
  KOREAN_VIETNAMESE_WORKPLACE_KB,
} from "@/lib/korean-vietnamese-kb";

export const GLOBAL_KB_USER_ID = "__kb_global__";
export const KB_SOURCE = "korean-vietnamese-kb";

type SeedResult = {
  seeded: number;
  source: string;
};

export type GlobalKbStatus = {
  seeded: boolean;
  count: number;
  source: string;
};

function getEmbeddingModel() {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      model: "text-embedding-3-small",
    });
  }

  if (process.env.GROQ_API_KEY) {
    return new OpenAIEmbeddings({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_EMBEDDING_MODEL || "nomic-embed-text-v1.5",
      configuration: {
        baseURL: "https://api.groq.com/openai/v1",
      },
    });
  }

  throw new Error(
    "Missing embedding provider key. Set OPENAI_API_KEY or GROQ_API_KEY before seeding KB.",
  );
}

/**
 * Seed the Korean-Vietnamese workplace KB into Supabase documents table.
 * Upsert is keyed by (user_id, file_name), so re-run safely updates embeddings/content.
 */
export async function seedKoreanVietnameseKnowledgeBase(): Promise<SeedResult> {
  const supabase = getSupabaseServerClient();
  const embeddingModel = getEmbeddingModel();

  const payloads = KOREAN_VIETNAMESE_WORKPLACE_KB.map((entry) => ({
    fileName: `kb:${entry.id}`,
    text: `${entry.title}\n\n${entry.content}`,
    metadata: {
      category: getKbCategoryFromTags(entry.tags),
      tags: entry.tags,
      source: KB_SOURCE,
      title: entry.title,
      kbId: entry.id,
    },
  }));

  const vectors = await embeddingModel.embedDocuments(payloads.map((item) => item.text));

  const rows = payloads.map((item, index) => ({
    user_id: GLOBAL_KB_USER_ID,
    file_name: item.fileName,
    content_text: item.text,
    embedding: vectors[index],
    metadata: item.metadata,
  }));

  const { error } = await supabase
    .from("documents")
    .upsert(rows, { onConflict: "user_id,file_name" });

  if (error) {
    throw new Error(`KB seeding failed: ${error.message}`);
  }

  return { seeded: rows.length, source: KB_SOURCE };
}

export async function getGlobalKbStatus(): Promise<GlobalKbStatus> {
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", GLOBAL_KB_USER_ID)
    .contains("metadata", { source: KB_SOURCE });

  if (error) {
    throw new Error(`Unable to read global KB status: ${error.message}`);
  }

  return {
    seeded: Boolean(count && count > 0),
    count: count ?? 0,
    source: KB_SOURCE,
  };
}

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { GLOBAL_KB_USER_ID, KB_SOURCE } from "@/lib/seed-kb";
import { getSupabaseServerClient } from "@/lib/supabase";

const KBRIDGE_SYSTEM_PROMPT = `You are K-Bridge AI, a friendly, patient, and culturally intelligent onboarding buddy for Vietnamese people working remotely at Korean companies.

Core rules:
- ALWAYS reply in Vietnamese first, then English translation in parentheses if needed.
- Be encouraging and reduce anxiety.
- Explain both "What" and "Why" behind Korean workplace culture (hierarchy, nunchi, indirect communication, face-saving, punctuality, jeong, etc.).
- Provide ready-to-copy email/scripts.
- Never give direct criticism, always use gentle suggestions.

Knowledge focus:
- Korean management style vs Vietnamese style
- Common scenarios: reporting delay, asking for help, weekly meeting, giving/receiving feedback, virtual team building
- Tech & business glossary (VN - EN - KR)

Tone: Warm, supportive, like a trusted senior colleague.`;

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 800,
  chunkOverlap: 120,
});

type ChatRole = "user" | "assistant";
let globalKbSeedCheckPromise: Promise<void> | null = null;

export type ConversationTurn = {
  role: ChatRole;
  content: string;
  createdAt?: string;
};

function getChatModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    return new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-3-5-sonnet-latest",
      temperature: 0.3,
    });
  }

  if (process.env.GROQ_API_KEY) {
    return new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
    });
  }

  return new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0.3,
  });
}

function getEmbeddingModel() {
  // Default path: OpenAI embeddings.
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      model: "text-embedding-3-small",
    });
  }

  // Optional Groq-compatible embedding path (OpenAI compatible API shape).
  if (process.env.GROQ_API_KEY) {
    return new OpenAIEmbeddings({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_EMBEDDING_MODEL || "nomic-embed-text-v1.5",
      configuration: {
        baseURL: "https://api.groq.com/openai/v1",
      },
    });
  }

  throw new Error("Missing embedding provider key. Set OPENAI_API_KEY or GROQ_API_KEY.");
}

export async function loadUserConversationHistory(userId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("messages,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load conversation history: ${error.message}`);
  if (!data) return [];

  return data.flatMap((row) => {
    const messages = Array.isArray(row.messages) ? row.messages : [];
    return messages.map((message) => ({
      role: message.role as ChatRole,
      content: String(message.content ?? ""),
      createdAt: row.created_at,
    }));
  }) as ConversationTurn[];
}

export async function clearUserConversationHistory(userId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to clear conversation history: ${error.message}`);
}

function checkGlobalKbSeedStatusOnce() {
  if (globalKbSeedCheckPromise) return globalKbSeedCheckPromise;

  globalKbSeedCheckPromise = (async () => {
    try {
      const supabase = getSupabaseServerClient();
      const { count, error } = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", GLOBAL_KB_USER_ID)
        .contains("metadata", { source: KB_SOURCE });

      if (error) {
        console.warn(
          `[K-Bridge AI] Startup check could not verify global KB seed status: ${error.message}`,
        );
        return;
      }

      if (!count || count === 0) {
        console.warn(
          [
            "[K-Bridge AI] Global knowledge base has not been seeded yet.",
            "Chat can still run but initial cultural context may be weaker.",
            "Run: POST /api/admin/seed-kb to seed KB into Supabase documents.",
          ].join(" "),
        );
      }
    } catch (error) {
      console.warn(
        `[K-Bridge AI] Startup check failed while verifying global KB: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  })();

  return globalKbSeedCheckPromise;
}

async function retrieveRelevantContext(userId: string, query: string) {
  const embeddings = getEmbeddingModel();
  const queryEmbedding = await embeddings.embedQuery(query);
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase.rpc("match_documents_scoped", {
    query_embedding: queryEmbedding,
    match_count: 5,
    filter_user_ids: [userId, GLOBAL_KB_USER_ID],
    source_filter: null,
  });

  if (error) {
    throw new Error(`Failed to retrieve RAG context: ${error.message}`);
  }

  const retrieved = (data ?? []) as Array<{
    file_name: string;
    content_text: string;
    metadata?: { source?: string; tags?: string[]; category?: string };
    similarity: number;
  }>;

  const dynamicContext = retrieved
    .map(
      (doc, idx) =>
        `[Doc ${idx + 1}] source=${doc.metadata?.source ?? "user-upload"} file=${doc.file_name} category=${doc.metadata?.category ?? "general"} score=${doc.similarity.toFixed(3)}\n${doc.content_text}`,
    )
    .join("\n\n");

  // Unified pipeline: all retrieval context comes from Supabase vector table.
  return dynamicContext || "No relevant vector documents found yet.";
}

async function saveConversationTurn(userId: string, userMessage: string, assistantReply: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("conversations").insert({
    user_id: userId,
    messages: [
      { role: "user", content: userMessage },
      { role: "assistant", content: assistantReply },
    ],
  });

  if (error) throw new Error(`Failed to save conversation: ${error.message}`);
}

export async function chatWithKBridgeAgent(userId: string, message: string) {
  // Fire startup verification once per server process.
  void checkGlobalKbSeedStatusOnce();

  const retrieverContext = await retrieveRelevantContext(userId, message);
  const history = await loadUserConversationHistory(userId);
  const historyWindow = history.slice(-12);

  const historyMessages = historyWindow.map((turn) =>
    turn.role === "assistant"
      ? new AIMessage(turn.content)
      : new HumanMessage(turn.content),
  );

  const model = getChatModel();
  const response = await model.invoke([
    new SystemMessage(KBRIDGE_SYSTEM_PROMPT),
    new SystemMessage(
      [
        "Use the following retrieved context from JD/company docs and onboarding knowledge.",
        "If context is missing, state assumptions and provide practical template scripts.",
        "",
        retrieverContext || "No uploaded documents yet.",
      ].join("\n"),
    ),
    ...historyMessages,
    new HumanMessage(message),
  ]);

  const reply = response.content.toString();
  await saveConversationTurn(userId, message, reply);
  return reply;
}

export async function uploadUserDocuments(userId: string, files: File[]) {
  const supabase = getSupabaseServerClient();
  const embeddingModel = getEmbeddingModel();
  let uploadedChunks = 0;

  for (const file of files) {
    const extractedText = await extractTextFromFile(file);
    if (!extractedText.trim()) continue;

    const chunks = await textSplitter.splitText(extractedText);
    if (chunks.length === 0) continue;
    const vectors = await embeddingModel.embedDocuments(chunks);

    const rows = chunks.map((chunk, index) => ({
      user_id: userId,
      file_name: `${file.name}#chunk-${index + 1}`,
      content_text: chunk,
      metadata: {
        source: "user-upload",
        tags: ["user-document"],
        category: "User Upload",
        originalFileName: file.name,
      },
      embedding: vectors[index],
    }));

    const { error } = await supabase.from("documents").insert(rows);
    if (error) throw new Error(`Failed to save document embeddings: ${error.message}`);
    uploadedChunks += rows.length;
  }

  return { uploadedChunks };
}

async function extractTextFromFile(file: File) {
  const mimeType = file.type.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (mimeType.includes("pdf") || file.name.toLowerCase().endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return parsed.text ?? "";
  }

  if (
    mimeType.includes("word") ||
    file.name.toLowerCase().endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value ?? "";
  }

  return buffer.toString("utf-8");
}

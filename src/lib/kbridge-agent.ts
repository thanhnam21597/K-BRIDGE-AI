import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import {
  deleteConversationHistory,
  countDocumentsBySource,
  fetchConversationHistory,
  insertConversationTurn,
  insertDocumentRows,
  matchDocumentsScoped,
} from "@/lib/db-store";
import { GLOBAL_KB_USER_ID, KB_SOURCE } from "@/lib/seed-kb";

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
export type ResponseLanguage = "vi" | "en";
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
  const data = await fetchConversationHistory(userId);

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
  await deleteConversationHistory(userId);
}

function checkGlobalKbSeedStatusOnce() {
  if (globalKbSeedCheckPromise) return globalKbSeedCheckPromise;

  globalKbSeedCheckPromise = (async () => {
    try {
      const count = await countDocumentsBySource(GLOBAL_KB_USER_ID, KB_SOURCE);

      if (count === 0) {
        console.warn(
          [
            "[K-Bridge AI] Global knowledge base has not been seeded yet.",
            "Chat can still run but initial cultural context may be weaker.",
            "Run: POST /api/admin/seed-kb to seed KB into Neon documents.",
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
  const retrieved = await matchDocumentsScoped(
    queryEmbedding,
    5,
    [userId, GLOBAL_KB_USER_ID],
    null,
  );

  const dynamicContext = retrieved
    .map(
      (doc, idx) =>
        `[Doc ${idx + 1}] source=${doc.metadata?.source ?? "user-upload"} file=${doc.file_name} category=${doc.metadata?.category ?? "general"} score=${doc.similarity.toFixed(3)}\n${doc.content_text}`,
    )
    .join("\n\n");

  // Unified pipeline: all retrieval context comes from Postgres vector table.
  return dynamicContext || "No relevant vector documents found yet.";
}

async function saveConversationTurn(userId: string, userMessage: string, assistantReply: string) {
  await insertConversationTurn(userId, [
    { role: "user", content: userMessage },
    { role: "assistant", content: assistantReply },
  ]);
}

function buildLanguageInstruction(responseLanguage: ResponseLanguage) {
  if (responseLanguage === "en") {
    return [
      "Language override for this turn (highest priority): English.",
      "If any previous instruction conflicts with language choice, follow this override.",
      "Respond fully in natural professional English.",
      "Do not add Vietnamese translation unless user explicitly asks for bilingual output.",
    ].join(" ");
  }

  return [
    "Language override for this turn (highest priority): Vietnamese.",
    "If any previous instruction conflicts with language choice, follow this override.",
    "Respond fully in natural Vietnamese.",
    "Do not add English translation unless user explicitly asks for bilingual output.",
  ].join(" ");
}

export async function chatWithKBridgeAgent(
  userId: string,
  message: string,
  responseLanguage: ResponseLanguage = "vi",
) {
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
    new SystemMessage(buildLanguageInstruction(responseLanguage)),
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

    await insertDocumentRows(rows);
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

import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";

const seedDocs = [
  "Korean workplaces often value hierarchy and concise communication.",
  "In Vietnam to Korea onboarding, respectful language and timely updates build trust.",
  "Business translations should preserve intent and level of formality.",
  "Role-play simulations help new hires practice meetings and status reporting.",
];

let memoryStore: MemoryVectorStore | null = null;

export async function getInMemoryVectorStore() {
  if (memoryStore) return memoryStore;

  const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
    model: "text-embedding-3-small",
  });

  memoryStore = await MemoryVectorStore.fromTexts(
    seedDocs,
    seedDocs.map((_, idx) => ({ id: `seed-${idx}` })),
    embeddings,
  );

  return memoryStore;
}

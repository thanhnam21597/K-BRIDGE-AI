import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getInMemoryVectorStore } from "@/lib/vector-store";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

function getModel() {
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

export async function generateCoachReply(messages: ChatTurn[]) {
  const model = getModel();
  let context = "";

  try {
    const vectorStore = await getInMemoryVectorStore();
    const docs = await vectorStore.similaritySearch(
      messages.at(-1)?.content ?? "onboarding guidance",
      2,
    );
    context = docs.map((doc) => doc.pageContent).join("\n");
  } catch {
    context = "Provide practical onboarding guidance for Vietnamese employees in Korean companies.";
  }

  const systemPrompt = new SystemMessage(
    [
      "You are K-Bridge AI, a bilingual cultural coach.",
      "Respond in Vietnamese first, then provide concise English support notes.",
      "Focus on Korean work culture, practical onboarding, and respectful communication.",
      "Use this context:",
      context,
    ].join("\n"),
  );

  const convoMessages = messages.map((message) =>
    message.role === "assistant"
      ? new AIMessage(message.content)
      : new HumanMessage(message.content),
  );

  const response = await model.invoke([systemPrompt, ...convoMessages]);
  return response.content.toString();
}

export async function translateBusinessText(
  text: string,
  fromLang: string,
  toLang: string,
) {
  const model = getModel();
  const response = await model.invoke([
    new SystemMessage(
      "You are a professional business translator. Keep tone formal and clear.",
    ),
    new HumanMessage(
      `Translate from ${fromLang} to ${toLang}. Keep business meaning exact.\n\n${text}`,
    ),
  ]);

  return response.content.toString();
}

export async function runRolePlay(scenario: string, userMessage: string) {
  const model = getModel();
  const response = await model.invoke([
    new SystemMessage(
      `You are role-playing a Korean colleague. Scenario: ${scenario}. Keep answers realistic and concise.`,
    ),
    new HumanMessage(userMessage),
  ]);

  return response.content.toString();
}

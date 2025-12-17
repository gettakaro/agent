import OpenAI from "openai";

const TITLE_MODEL = "meta-llama/llama-3.2-3b-instruct";
const MAX_CONTENT_LENGTH = 500;

const SYSTEM_PROMPT = `Generate a brief, descriptive title (3-6 words) for this conversation based on the user's question and assistant's response. Return only the title text, no quotes, punctuation, or explanation.`;

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export async function generateTitle(userMessage: string, assistantMessage: string, apiKey: string): Promise<string> {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });

  const userContent = truncate(userMessage, MAX_CONTENT_LENGTH);
  const assistantContent = truncate(assistantMessage, MAX_CONTENT_LENGTH);

  const response = await client.chat.completions.create({
    model: TITLE_MODEL,
    max_tokens: 30,
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `User: ${userContent}\n\nAssistant: ${assistantContent}` },
    ],
  });

  const title = response.choices[0]?.message?.content?.trim() || "Untitled Conversation";

  // Clean up any quotes or trailing punctuation the model might add
  return title.replace(/^["']|["']$/g, "").replace(/[.!?]$/, "");
}

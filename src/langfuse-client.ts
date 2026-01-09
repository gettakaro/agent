import { Langfuse } from "langfuse";

let langfuseClient: Langfuse | null = null;

export function initializeLangfuse(): void {
  if (process.env.TRACING_ENABLED !== "true") {
    console.log("[Langfuse] Tracing disabled");
    return;
  }

  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const baseUrl = process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";
  const flushAt = process.env.LANGFUSE_FLUSH_AT ? Number.parseInt(process.env.LANGFUSE_FLUSH_AT, 10) : 10;
  const flushInterval = process.env.LANGFUSE_FLUSH_INTERVAL
    ? Number.parseInt(process.env.LANGFUSE_FLUSH_INTERVAL, 10)
    : 10000;

  if (!secretKey || !publicKey) {
    console.warn("[Langfuse] Missing credentials, LLM tracing disabled");
    return;
  }

  langfuseClient = new Langfuse({
    secretKey,
    publicKey,
    baseUrl,
    flushAt,
    flushInterval,
  });

  console.log("┌─────────────────────────────────────────┐");
  console.log("│  Langfuse SDK Initialized              │");
  console.log("├─────────────────────────────────────────┤");
  console.log(`│  Base URL: ${baseUrl.padEnd(28)} │`);
  console.log("└─────────────────────────────────────────┘");
}

export function getLangfuseClient(): Langfuse | null {
  return langfuseClient;
}

export async function shutdownLangfuse(): Promise<void> {
  if (langfuseClient) {
    await langfuseClient.shutdown();
  }
}

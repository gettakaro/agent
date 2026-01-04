import type {
  ApiProvider,
  ProviderOptions,
  ProviderResponse,
  CallApiContextParams,
} from 'promptfoo';

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResult {
  id: string;
  name: string;
  success: boolean;
  output: unknown;
  error?: string;
  durationMs: number;
}

interface SSEEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'done' | 'error';
  content?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  result?: {
    success: boolean;
    output: unknown;
    error?: string;
  };
  durationMs?: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
}

export default class TakaroAgentProvider implements ApiProvider {
  private baseUrl: string;
  private agentId: string;

  constructor(options: ProviderOptions) {
    this.baseUrl = (options.config?.baseUrl as string) || 'http://localhost:3100';
    this.agentId = (options.config?.agentId as string) || 'module-writer';
  }

  id(): string {
    return `takaro-agent:${this.agentId}`;
  }

  async callApi(
    prompt: string,
    _context?: CallApiContextParams,
  ): Promise<ProviderResponse> {
    const startTime = Date.now();

    try {
      // 1. Create conversation
      const convRes = await fetch(`${this.baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: this.agentId }),
      });

      if (!convRes.ok) {
        const errorText = await convRes.text();
        return {
          error: `Failed to create conversation: ${convRes.status} ${errorText}`,
        };
      }

      const convData = (await convRes.json()) as { data: { id: string } };
      const conversationId = convData.data.id;

      // 2. Send message and parse SSE stream
      const msgRes = await fetch(
        `${this.baseUrl}/api/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: prompt }),
        },
      );

      if (!msgRes.ok) {
        const errorText = await msgRes.text();
        return {
          error: `Failed to send message: ${msgRes.status} ${errorText}`,
        };
      }

      // Parse SSE stream
      const reader = msgRes.body?.getReader();
      if (!reader) {
        return { error: 'No response body reader available' };
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let outputText = '';
      const toolCalls: ToolCall[] = [];
      const toolResults: ToolResult[] = [];
      let tokenUsage = { prompt: 0, completion: 0, total: 0 };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          // SSE format: "event: type\ndata: {json}"
          // Our API uses simplified format: "data: {type: ..., ...}"
          if (!line.startsWith('data:')) continue;

          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as SSEEvent;

            switch (event.type) {
              case 'text':
                outputText += event.content || '';
                break;

              case 'tool_use':
                if (event.id && event.name) {
                  toolCalls.push({
                    id: event.id,
                    name: event.name,
                    input: event.input || {},
                  });
                }
                break;

              case 'tool_result':
                if (event.id && event.name && event.result) {
                  toolResults.push({
                    id: event.id,
                    name: event.name,
                    success: event.result.success,
                    output: event.result.output,
                    error: event.result.error,
                    durationMs: event.durationMs || 0,
                  });
                }
                break;

              case 'done':
                if (event.usage) {
                  tokenUsage = {
                    prompt: event.usage.inputTokens,
                    completion: event.usage.outputTokens,
                    total: event.usage.inputTokens + event.usage.outputTokens,
                  };
                }
                break;

              case 'error':
                return {
                  error: event.error || 'Unknown error from agent',
                  metadata: { conversationId, toolCalls, toolResults },
                };
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      const latencyMs = Date.now() - startTime;

      return {
        output: outputText,
        tokenUsage,
        metadata: {
          conversationId,
          toolCalls,
          toolResults,
          latencyMs,
        },
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Check if it's a connection error
      if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('fetch failed')) {
        return {
          error: `Failed to connect to Takaro agent server at ${this.baseUrl}. ` +
                 `Ensure the server is running:\n` +
                 `  - Local: npm run dev\n` +
                 `  - Docker: docker compose up\n` +
                 `\nCheck server health: curl ${this.baseUrl}/health`,
        };
      }

      return {
        error: `Provider error: ${errorMsg}`,
      };
    }
  }
}

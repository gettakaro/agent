import { getLangfuseClient } from "../langfuse-client.js";
import { formatError } from "../utils/formatError.js";
import { MockLLMProvider } from "./providers/MockLLMProvider.js";
import { OpenRouterProvider } from "./providers/OpenRouterProvider.js";
import type { ILLMProvider } from "./providers/types.js";
import type {
  AgentResponse,
  AgentVersionConfig,
  IAgent,
  Message,
  StreamChunk,
  ToolContext,
  ToolExecution,
  ToolResult,
} from "./types.js";

export class AgentRuntime implements IAgent {
  readonly id: string;
  readonly version: string;
  readonly config: AgentVersionConfig;

  constructor(id: string, version: string, config: AgentVersionConfig) {
    this.id = id;
    this.version = version;
    this.config = config;
  }

  private getProvider(context: ToolContext): ILLMProvider {
    if (process.env.USE_MOCK_PROVIDER === "true") {
      const mockProvider = MockLLMProvider.getInstance();
      // Enable fallback responses for E2E tests (when no explicit responses configured)
      mockProvider.enableFallbackResponse();
      return mockProvider;
    }
    return new OpenRouterProvider(context.openrouterApiKey!);
  }

  async chat(
    messages: Message[],
    context: ToolContext,
    onChunk?: (chunk: StreamChunk) => void,
  ): Promise<AgentResponse> {
    const langfuse = getLangfuseClient();
    const startTime = Date.now();

    // Create Langfuse trace
    const trace = langfuse?.trace({
      name: "agent-conversation",
      userId: context.userId || "anonymous",
      sessionId: context.conversationId,
      metadata: {
        agentId: this.id,
        agentVersion: this.version,
        model: this.config.model,
      },
    });

    const conversationMessages = [...messages];
    const responseMessages: Message[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    let continueLoop = true;
    const maxIterations = 10;
    let iterations = 0;

    const provider = this.getProvider(context);

    while (continueLoop && iterations < maxIterations) {
      iterations++;

      // Create iteration span
      const iterationSpan = trace?.span({
        name: `agent-iteration-${iterations}`,
        metadata: {
          iteration: iterations,
          messageCount: conversationMessages.length,
        },
      });

      // Call LLM provider (passing trace for generation tracking)
      const response = await provider.chat(
        conversationMessages,
        this.config.systemPrompt,
        this.config.tools,
        {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        },
        onChunk,
        trace, // Pass trace to provider
      );

      totalInputTokens += response.usage.inputTokens;
      totalOutputTokens += response.usage.outputTokens;

      // Update iteration span
      if (iterationSpan) {
        iterationSpan.update({
          output: {
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
            toolCallsCount: response.toolCalls.length,
          },
        });
        iterationSpan.end();
      }

      // Tool execution
      if (response.toolCalls.length > 0) {
        const assistantContent = response.content || "";
        if (assistantContent) {
          conversationMessages.push({
            role: "assistant",
            content: assistantContent,
          });
        }

        const toolExecutions: ToolExecution[] = [];

        for (const toolCall of response.toolCalls) {
          const tool = this.config.tools.find((t) => t.name === toolCall.name);
          let result: ToolResult;
          const startedAt = new Date();
          const toolStartTime = Date.now();

          if (!tool) {
            result = {
              success: false,
              output: null,
              error: `Unknown tool: ${toolCall.name}`,
            };
          } else {
            // Create tool span
            const toolSpan = trace?.span({
              name: `tool:${toolCall.name}`,
              input: toolCall.input,
            });

            try {
              result = await tool.execute(toolCall.input, context);

              if (toolSpan) {
                toolSpan.update({
                  output: result,
                  metadata: { success: result.success },
                });
              }
            } catch (err) {
              const errorMessage = formatError(err);
              result = {
                success: false,
                output: null,
                error: errorMessage,
              };

              if (toolSpan) {
                toolSpan.update({
                  output: result,
                  metadata: { success: false, error: errorMessage },
                });
              }
            } finally {
              toolSpan?.end();
            }
          }

          const durationMs = Date.now() - toolStartTime;

          toolExecutions.push({
            id: toolCall.id,
            name: toolCall.name,
            input: toolCall.input,
            result,
            durationMs,
            startedAt,
          });

          if (onChunk) {
            onChunk({
              type: "tool_result",
              id: toolCall.id,
              name: toolCall.name,
              result,
              durationMs,
            });
          }

          conversationMessages.push({
            role: "user",
            content: `Tool result for ${toolCall.name} (id: ${toolCall.id}):\n${JSON.stringify(result, null, 2)}`,
          });
        }

        if (assistantContent) {
          responseMessages.push({
            role: "assistant",
            content: assistantContent,
            toolExecutions,
          });
        } else if (toolExecutions.length > 0) {
          responseMessages.push({
            role: "assistant",
            content: "",
            toolExecutions,
          });
        }

        continueLoop = true;
      } else {
        continueLoop = false;

        if (response.content) {
          responseMessages.push({
            role: "assistant",
            content: response.content,
          });
        }
      }
    }

    const latencyMs = Date.now() - startTime;

    // Update final trace
    if (trace) {
      trace.update({
        output: {
          iterations,
          latencyMs,
          totalInputTokens,
          totalOutputTokens,
        },
      });
    }

    if (onChunk) {
      onChunk({
        type: "done",
        usage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
        },
      });
    }

    return {
      messages: responseMessages,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
      latencyMs,
    };
  }
}

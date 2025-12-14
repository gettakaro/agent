import type {
  IAgent,
  AgentVersionConfig,
  Message,
  StreamChunk,
  AgentResponse,
  ToolContext,
  ToolResult,
  ToolExecution,
} from './types.js';
import type { ILLMProvider } from './providers/types.js';
import { OpenRouterProvider } from './providers/OpenRouterProvider.js';

export class AgentRuntime implements IAgent {
  readonly id: string;
  readonly version: string;
  readonly config: AgentVersionConfig;
  private provider: ILLMProvider;

  constructor(id: string, version: string, config: AgentVersionConfig) {
    this.id = id;
    this.version = version;
    this.config = config;
    this.provider = new OpenRouterProvider();
  }

  async chat(
    messages: Message[],
    context: ToolContext,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    const conversationMessages = [...messages];
    const responseMessages: Message[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Conversation loop - keep going until agent stops using tools
    let continueLoop = true;
    const maxIterations = 10; // Safety limit
    let iterations = 0;

    while (continueLoop && iterations < maxIterations) {
      iterations++;

      const response = await this.provider.chat(
        conversationMessages,
        this.config.systemPrompt,
        this.config.tools,
        {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        },
        onChunk
      );

      totalInputTokens += response.usage.inputTokens;
      totalOutputTokens += response.usage.outputTokens;

      // If there are tool calls, execute them
      if (response.toolCalls.length > 0) {
        // Build assistant message with tool use
        const assistantContent = response.content || '';

        // Add assistant message to conversation
        if (assistantContent) {
          conversationMessages.push({
            role: 'assistant',
            content: assistantContent,
          });
        }

        // Execute each tool and collect results
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
            try {
              result = await tool.execute(toolCall.input, context);
            } catch (err) {
              result = {
                success: false,
                output: null,
                error: err instanceof Error ? err.message : String(err),
              };
            }
          }

          const durationMs = Date.now() - toolStartTime;

          // Track tool execution
          toolExecutions.push({
            id: toolCall.id,
            name: toolCall.name,
            input: toolCall.input,
            result,
            durationMs,
            startedAt,
          });

          // Emit tool result with timing
          if (onChunk) {
            onChunk({
              type: 'tool_result',
              id: toolCall.id,
              name: toolCall.name,
              result,
              durationMs,
            });
          }

          // Add tool result to conversation (as user message with special format)
          conversationMessages.push({
            role: 'user',
            content: `Tool result for ${toolCall.name} (id: ${toolCall.id}):\n${JSON.stringify(result, null, 2)}`,
          });
        }

        // Store tool executions on a response message if there's content
        if (assistantContent) {
          responseMessages.push({
            role: 'assistant',
            content: assistantContent,
            toolExecutions,
          });
        } else if (toolExecutions.length > 0) {
          // Even without text content, track tool usage
          responseMessages.push({
            role: 'assistant',
            content: '',
            toolExecutions,
          });
        }

        // Continue loop to let agent respond to tool results
        continueLoop = true;
      } else {
        // No tool calls - agent is done
        continueLoop = false;

        if (response.content) {
          responseMessages.push({
            role: 'assistant',
            content: response.content,
          });
        }
      }
    }

    const latencyMs = Date.now() - startTime;

    // Emit done event
    if (onChunk) {
      onChunk({
        type: 'done',
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

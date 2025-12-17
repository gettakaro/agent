import OpenAI from "openai";
import type { Stream } from "openai/streaming";
import { formatError } from "../../utils/formatError.js";
import type { Message, StreamChunk, ToolDefinition } from "../types.js";
import type { ChatOptions, ILLMProvider, ProviderResponse } from "./types.js";

export class OpenRouterProvider implements ILLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });
  }

  async chat(
    messages: Message[],
    systemPrompt: string,
    tools: ToolDefinition[],
    options: ChatOptions,
    onChunk?: (chunk: StreamChunk) => void,
  ): Promise<ProviderResponse> {
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const openaiTools: OpenAI.ChatCompletionTool[] = tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters as Record<string, unknown>,
      },
    }));

    let stream: Stream<OpenAI.Chat.Completions.ChatCompletionChunk>;
    try {
      stream = await this.client.chat.completions.create({
        model: options.model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature,
        messages: openaiMessages,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        stream: true,
      });
    } catch (err) {
      console.error("OpenRouter API error:", formatError(err));
      throw err;
    }

    let textContent = "";
    const toolCalls: Array<{
      id: string;
      name: string;
      input: Record<string, unknown>;
    }> = [];

    // Track tool calls being built up from deltas
    const toolCallBuilders = new Map<number, { id: string; name: string; arguments: string }>();

    let finishReason: string | null = null;
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      finishReason = chunk.choices[0]?.finish_reason || finishReason;

      // Track usage if provided
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens;
        completionTokens = chunk.usage.completion_tokens;
      }

      // Handle text content
      if (delta?.content) {
        textContent += delta.content;
        if (onChunk) {
          onChunk({ type: "text", content: delta.content });
        }
      }

      // Handle tool calls
      if (delta?.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          const index = toolCallDelta.index;

          if (!toolCallBuilders.has(index)) {
            toolCallBuilders.set(index, {
              id: toolCallDelta.id || "",
              name: toolCallDelta.function?.name || "",
              arguments: "",
            });
          }

          const builder = toolCallBuilders.get(index)!;

          if (toolCallDelta.id) {
            builder.id = toolCallDelta.id;
          }
          if (toolCallDelta.function?.name) {
            builder.name = toolCallDelta.function.name;
          }
          if (toolCallDelta.function?.arguments) {
            builder.arguments += toolCallDelta.function.arguments;
          }
        }
      }
    }

    // Finalize tool calls
    for (const builder of toolCallBuilders.values()) {
      const input = JSON.parse(builder.arguments || "{}") as Record<string, unknown>;
      toolCalls.push({
        id: builder.id,
        name: builder.name,
        input,
      });

      if (onChunk) {
        onChunk({
          type: "tool_use",
          id: builder.id,
          name: builder.name,
          input,
        });
      }
    }

    return {
      content: textContent,
      toolCalls,
      usage: {
        inputTokens: promptTokens,
        outputTokens: completionTokens,
      },
      stopReason: finishReason === "tool_calls" ? "tool_use" : finishReason === "length" ? "max_tokens" : "end_turn",
    };
  }
}

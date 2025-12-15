import type { ToolDefinition, StreamChunk, Message } from '../types.js';
import type { ILLMProvider, ChatOptions, ProviderResponse } from './types.js';

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

interface AnthropicStreamEvent {
  type: string;
  message?: {
    id: string;
    usage?: { input_tokens: number; output_tokens: number };
  };
  index?: number;
  content_block?: AnthropicContentBlock;
  delta?: {
    type: string;
    text?: string;
    partial_json?: string;
    stop_reason?: string;
  };
  usage?: { output_tokens: number };
}

export class AnthropicProvider implements ILLMProvider {
  constructor(private accessToken: string) {}

  async chat(
    messages: Message[],
    systemPrompt: string,
    tools: ToolDefinition[],
    options: ChatOptions,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<ProviderResponse> {
    const anthropicMessages: AnthropicMessage[] = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const anthropicTools: AnthropicTool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Record<string, unknown>,
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature,
        system: systemPrompt,
        messages: anthropicMessages,
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body from Anthropic API');
    }

    return this.processStream(response.body, onChunk);
  }

  private async processStream(
    body: ReadableStream<Uint8Array>,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<ProviderResponse> {
    const reader = body.getReader();
    const decoder = new TextDecoder();

    let textContent = '';
    const toolCalls: Array<{
      id: string;
      name: string;
      input: Record<string, unknown>;
    }> = [];

    // Track tool use blocks being built
    const toolCallBuilders = new Map<
      number,
      { id: string; name: string; inputJson: string }
    >();

    let inputTokens = 0;
    let outputTokens = 0;
    let stopReason: 'end_turn' | 'tool_use' | 'max_tokens' = 'end_turn';

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          if (jsonStr.trim() === '[DONE]') continue;

          try {
            const event = JSON.parse(jsonStr) as AnthropicStreamEvent;
            this.handleStreamEvent(
              event,
              toolCallBuilders,
              (text) => {
                textContent += text;
                if (onChunk) onChunk({ type: 'text', content: text });
              },
              (usage) => {
                if (usage.input_tokens) inputTokens = usage.input_tokens;
                if (usage.output_tokens) outputTokens = usage.output_tokens;
              },
              (reason) => {
                if (reason === 'tool_use') stopReason = 'tool_use';
                else if (reason === 'max_tokens') stopReason = 'max_tokens';
                else stopReason = 'end_turn';
              }
            );
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    // Finalize tool calls
    for (const builder of toolCallBuilders.values()) {
      const input = JSON.parse(builder.inputJson || '{}') as Record<string, unknown>;
      toolCalls.push({
        id: builder.id,
        name: builder.name,
        input,
      });

      if (onChunk) {
        onChunk({
          type: 'tool_use',
          id: builder.id,
          name: builder.name,
          input,
        });
      }
    }

    return {
      content: textContent,
      toolCalls,
      usage: { inputTokens, outputTokens },
      stopReason,
    };
  }

  private handleStreamEvent(
    event: AnthropicStreamEvent,
    toolCallBuilders: Map<number, { id: string; name: string; inputJson: string }>,
    onText: (text: string) => void,
    onUsage: (usage: { input_tokens?: number; output_tokens?: number }) => void,
    onStopReason: (reason: string) => void
  ): void {
    switch (event.type) {
      case 'message_start':
        if (event.message?.usage) {
          onUsage(event.message.usage);
        }
        break;

      case 'content_block_start':
        if (event.content_block?.type === 'tool_use' && event.index !== undefined) {
          toolCallBuilders.set(event.index, {
            id: event.content_block.id || '',
            name: event.content_block.name || '',
            inputJson: '',
          });
        }
        break;

      case 'content_block_delta':
        if (event.delta?.type === 'text_delta' && event.delta.text) {
          onText(event.delta.text);
        } else if (
          event.delta?.type === 'input_json_delta' &&
          event.delta.partial_json &&
          event.index !== undefined
        ) {
          const builder = toolCallBuilders.get(event.index);
          if (builder) {
            builder.inputJson += event.delta.partial_json;
          }
        }
        break;

      case 'message_delta':
        if (event.delta?.stop_reason) {
          onStopReason(event.delta.stop_reason);
        }
        if (event.usage) {
          onUsage(event.usage);
        }
        break;
    }
  }
}

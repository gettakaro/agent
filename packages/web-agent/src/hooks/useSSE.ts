import { useState, useCallback, useRef } from 'react';
import type { SSEEvent, TokenUsage } from '../api/types';

interface StreamingToolExecution {
  id: string;
  name: string;
  input: Record<string, unknown>;
  status: 'pending' | 'complete';
  result?: {
    output?: unknown;
    error?: string;
    durationMs?: number;
    success: boolean;
  };
}

interface StreamingState {
  isStreaming: boolean;
  content: string;
  toolExecutions: StreamingToolExecution[];
  tokenUsage: TokenUsage | null;
  error: string | null;
}

interface UseSSEOptions {
  onComplete?: (content: string, toolExecutions: StreamingToolExecution[], tokenUsage: TokenUsage | null) => void;
  onError?: (error: string) => void;
}

export function useSSE(options: UseSSEOptions = {}) {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: '',
    toolExecutions: [],
    tokenUsage: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (conversationId: string, message: string) => {
      // Cancel any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Reset state
      setState({
        isStreaming: true,
        content: '',
        toolExecutions: [],
        tokenUsage: null,
        error: null,
      });

      try {
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: message }),
          credentials: 'include',
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const event: SSEEvent = JSON.parse(data);
                handleEvent(event);
              } catch {
                console.warn('Failed to parse SSE event:', data);
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Ignore abort errors
        }
        const errorMessage = err instanceof Error ? err.message : 'Stream failed';
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: errorMessage,
        }));
        options.onError?.(errorMessage);
      }
    },
    [options]
  );

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      switch (event.type) {
        case 'text':
          setState((prev) => ({
            ...prev,
            content: prev.content + event.content,
          }));
          break;

        case 'tool_use':
          setState((prev) => ({
            ...prev,
            toolExecutions: [
              ...prev.toolExecutions,
              {
                id: event.id,
                name: event.name,
                input: event.input,
                status: 'pending',
              },
            ],
          }));
          break;

        case 'tool_result':
          setState((prev) => {
            const toolExecutions = [...prev.toolExecutions];
            // Find tool by id for reliable matching
            const toolIndex = toolExecutions.findIndex((t) => t.id === event.id);
            if (toolIndex !== -1) {
              toolExecutions[toolIndex] = {
                ...toolExecutions[toolIndex],
                status: 'complete',
                result: {
                  output: event.result.output,
                  error: event.result.error,
                  durationMs: event.durationMs,
                  success: event.result.success,
                },
              };
            }
            return { ...prev, toolExecutions };
          });
          break;

        case 'done':
          setState((prev) => {
            const finalState = {
              ...prev,
              isStreaming: false,
              tokenUsage: event.tokenUsage,
            };
            options.onComplete?.(finalState.content, finalState.toolExecutions, finalState.tokenUsage);
            return finalState;
          });
          break;

        case 'error':
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: event.error,
          }));
          options.onError?.(event.error);
          break;
      }
    },
    [options]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isStreaming: false,
      content: '',
      toolExecutions: [],
      tokenUsage: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    sendMessage,
    cancel,
    reset,
  };
}

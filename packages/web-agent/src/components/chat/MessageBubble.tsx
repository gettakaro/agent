import styled from 'styled-components';
import type { Message } from '../../api/types';
import { ToolExecutionGroup, StreamingToolExecutionGroup } from './ToolExecutionGroup';

interface MessageBubbleProps {
  message: Message;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

const Container = styled.div<{ $role: 'user' | 'assistant' | 'system' }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $role }) => ($role === 'user' ? 'flex-end' : 'flex-start')};
  max-width: 85%;
  align-self: ${({ $role }) => ($role === 'user' ? 'flex-end' : 'flex-start')};
`;

const Bubble = styled.div<{ $role: 'user' | 'assistant' | 'system' }>`
  padding: 0.875rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.large};
  background: ${({ theme, $role }) =>
    $role === 'user' ? theme.colors.primary : theme.colors.backgroundAlt};
  color: ${({ theme, $role }) =>
    $role === 'user' ? 'white' : theme.colors.text};
  border: ${({ theme, $role }) =>
    $role === 'user' ? 'none' : `1px solid ${theme.colors.shade}`};
  font-size: 0.9375rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
`;

const RoleLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textAlt};
  margin-bottom: 0.375rem;
  padding: 0 0.25rem;
`;

const ToolsContainer = styled.div`
  width: 100%;
  margin-top: 0.5rem;
`;

const Timestamp = styled.div`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textAlt};
  margin-top: 0.375rem;
  padding: 0 0.25rem;
`;

const TokenUsage = styled.span`
  margin-left: 0.5rem;
  padding: 0.125rem 0.375rem;
  background: ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  font-size: 0.625rem;
`;

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessageBubble({ message, isFirstInGroup = true, isLastInGroup = true }: MessageBubbleProps) {
  const hasToolExecutions = message.toolExecutions && message.toolExecutions.length > 0;

  // Get timestamp from first tool execution if available
  const timestamp = message.toolExecutions?.[0]?.startedAt;

  return (
    <Container $role={message.role}>
      {isFirstInGroup && <RoleLabel>{message.role}</RoleLabel>}
      {message.content && <Bubble $role={message.role}>{message.content}</Bubble>}

      {hasToolExecutions && (
        <ToolsContainer>
          <ToolExecutionGroup executions={message.toolExecutions!} />
        </ToolsContainer>
      )}

      {isLastInGroup && (timestamp || message.tokenUsage) && (
        <Timestamp>
          {timestamp && formatTime(timestamp)}
          {message.tokenUsage && (
            <TokenUsage>
              {message.tokenUsage.totalTokens} tokens
            </TokenUsage>
          )}
        </Timestamp>
      )}
    </Container>
  );
}

// Streaming message that builds up content and tool executions in real-time
interface StreamingMessageProps {
  content: string;
  toolExecutions: Array<{
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
  }>;
  isComplete?: boolean;
  isFirstInGroup?: boolean;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

const TypingIndicator = styled.span`
  display: inline-block;
  width: 0.5rem;
  height: 1rem;
  background: ${({ theme }) => theme.colors.textAlt};
  margin-left: 0.125rem;
  animation: blink 1s step-end infinite;

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
`;

export function StreamingMessage({
  content,
  toolExecutions,
  isComplete,
  isFirstInGroup = true,
  tokenUsage,
}: StreamingMessageProps) {
  const hasContent = content.length > 0;
  const hasTools = toolExecutions.length > 0;

  return (
    <Container $role="assistant">
      {isFirstInGroup && <RoleLabel>assistant</RoleLabel>}

      {hasContent && (
        <Bubble $role="assistant">
          {content}
          {!isComplete && <TypingIndicator />}
        </Bubble>
      )}

      {hasTools && (
        <ToolsContainer>
          <StreamingToolExecutionGroup executions={toolExecutions} />
        </ToolsContainer>
      )}

      {!hasContent && !hasTools && !isComplete && (
        <Bubble $role="assistant">
          <TypingIndicator />
        </Bubble>
      )}

      {isComplete && tokenUsage && (
        <Timestamp>
          <TokenUsage>
            {tokenUsage.totalTokens} tokens
          </TokenUsage>
        </Timestamp>
      )}
    </Container>
  );
}

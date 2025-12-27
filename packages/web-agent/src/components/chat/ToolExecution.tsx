import { useState } from 'react';
import styled from 'styled-components';
import type { ToolExecution as ToolExecutionType } from '../../api/types';

interface ToolExecutionProps {
  execution: ToolExecutionType;
  compact?: boolean;
  pending?: boolean;
}

const Container = styled.div<{ $compact?: boolean }>`
  margin: ${({ $compact }) => ($compact ? '0' : '0.125rem 0')};
  border-radius: ${({ theme, $compact }) => ($compact ? '0' : theme.borderRadius.medium)};
  border: ${({ theme, $compact }) => ($compact ? 'none' : `1px solid ${theme.colors.shade}`)};
  border-bottom: ${({ theme, $compact }) => ($compact ? `1px solid ${theme.colors.shade}` : 'none')};
  overflow: hidden;
  font-size: 0.8125rem;

  &:last-child {
    border-bottom: ${({ $compact }) => ($compact ? 'none' : 'inherit')};
  }
`;

const Header = styled.button<{ $success: boolean }>`
  width: 100%;
  padding: 0.375rem 0.5rem;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-align: left;
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.shade};
  }
`;

const StatusIcon = styled.span<{ $success: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${({ theme, $success }) =>
    $success ? `${theme.colors.success}22` : `${theme.colors.error}22`};
  color: ${({ theme, $success }) =>
    $success ? theme.colors.success : theme.colors.error};

  svg {
    width: 12px;
    height: 12px;
  }
`;

const ToolName = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const Duration = styled.span`
  margin-left: auto;
  color: ${({ theme }) => theme.colors.textAlt};
  font-size: 0.75rem;
`;

const ExpandIcon = styled.span<{ $expanded: boolean }>`
  color: ${({ theme }) => theme.colors.textAlt};
  transition: transform 0.15s ease;
  transform: rotate(${({ $expanded }) => ($expanded ? '180deg' : '0deg')});

  svg {
    width: 14px;
    height: 14px;
  }
`;

const Content = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.shade};
`;

const Section = styled.div`
  padding: 0.75rem;

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.shade};
  }
`;

const SectionLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textAlt};
  margin-bottom: 0.5rem;
`;

const CodeBlock = styled.pre`
  margin: 0;
  padding: 0.625rem;
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text};
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
`;

const ErrorText = styled.span`
  color: ${({ theme }) => theme.colors.error};
`;

const PendingSpinner = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: ${({ theme }) => theme.colors.primary};

  svg {
    width: 14px;
    height: 14px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

function formatJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export function ToolExecution({ execution, compact, pending }: ToolExecutionProps) {
  const [expanded, setExpanded] = useState(false);
  const success = execution.result.success;

  return (
    <Container $compact={compact}>
      <Header
        $success={success}
        onClick={() => setExpanded(!expanded)}
      >
        {pending ? (
          <PendingSpinner>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10" />
            </svg>
          </PendingSpinner>
        ) : (
          <StatusIcon $success={success}>
            {success ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </StatusIcon>
        )}
        <ToolName>{execution.name}</ToolName>
        {pending ? (
          <Duration>running...</Duration>
        ) : execution.durationMs !== undefined ? (
          <Duration>{execution.durationMs}ms</Duration>
        ) : null}
        <ExpandIcon $expanded={expanded}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </ExpandIcon>
      </Header>

      {expanded && (
        <Content>
          <Section>
            <SectionLabel>Input</SectionLabel>
            <CodeBlock>{formatJson(execution.input)}</CodeBlock>
          </Section>
          {!pending && (
            <Section>
              <SectionLabel>Output</SectionLabel>
              {execution.result.error ? (
                <CodeBlock>
                  <ErrorText>{execution.result.error}</ErrorText>
                </CodeBlock>
              ) : (
                <CodeBlock>{formatJson(execution.result.output)}</CodeBlock>
              )}
            </Section>
          )}
        </Content>
      )}
    </Container>
  );
}

// Streaming variant that shows pending state
interface StreamingToolExecutionProps {
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

const PendingIndicator = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.75rem;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  animation: pulse 1.5s ease-in-out infinite;
`;

export function StreamingToolExecution({
  name,
  input,
  status,
  result,
}: StreamingToolExecutionProps) {
  const [expanded, setExpanded] = useState(false);
  const success = result?.success ?? true;

  return (
    <Container>
      <Header
        $success={success}
        onClick={() => setExpanded(!expanded)}
      >
        {status === 'pending' ? (
          <PendingIndicator>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
          </PendingIndicator>
        ) : (
          <StatusIcon $success={success}>
            {success ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </StatusIcon>
        )}
        <ToolName>{name}</ToolName>
        {status === 'pending' ? (
          <Duration>running...</Duration>
        ) : result?.durationMs !== undefined ? (
          <Duration>{result.durationMs}ms</Duration>
        ) : null}
        <ExpandIcon $expanded={expanded}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </ExpandIcon>
      </Header>

      {expanded && (
        <Content>
          <Section>
            <SectionLabel>Input</SectionLabel>
            <CodeBlock>{formatJson(input)}</CodeBlock>
          </Section>
          {result && (
            <Section>
              <SectionLabel>Output</SectionLabel>
              {result.error ? (
                <CodeBlock>
                  <ErrorText>{result.error}</ErrorText>
                </CodeBlock>
              ) : (
                <CodeBlock>{formatJson(result.output)}</CodeBlock>
              )}
            </Section>
          )}
        </Content>
      )}
    </Container>
  );
}

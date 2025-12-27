import { useState } from 'react';
import styled from 'styled-components';
import type { ToolExecution as ToolExecutionType } from '../../api/types';
import { ToolExecution } from './ToolExecution';

interface ToolExecutionGroupProps {
  executions: ToolExecutionType[];
}

const Container = styled.div`
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  overflow: hidden;
  font-size: 0.8125rem;
`;

const Header = styled.button<{ $success: boolean }>`
  width: 100%;
  padding: 0.5rem 0.75rem;
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

const Summary = styled.span`
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

const ToolList = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.shade};
  background: ${({ theme }) => theme.colors.background};
`;

export function ToolExecutionGroup({ executions }: ToolExecutionGroupProps) {
  const [expanded, setExpanded] = useState(false);

  const allSuccess = executions.every((e) => e.result.success);
  const failedCount = executions.filter((e) => !e.result.success).length;
  const totalDuration = executions.reduce((sum, e) => sum + (e.durationMs || 0), 0);

  const formatDuration = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  };

  return (
    <Container>
      <Header $success={allSuccess} onClick={() => setExpanded(!expanded)}>
        <StatusIcon $success={allSuccess}>
          {allSuccess ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </StatusIcon>
        <Summary>
          {executions.length} tool{executions.length !== 1 ? 's' : ''} executed
          {failedCount > 0 && ` (${failedCount} failed)`}
        </Summary>
        <Duration>{formatDuration(totalDuration)} total</Duration>
        <ExpandIcon $expanded={expanded}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </ExpandIcon>
      </Header>

      {expanded && (
        <ToolList>
          {executions.map((exec) => (
            <ToolExecution key={exec.id} execution={exec} compact />
          ))}
        </ToolList>
      )}
    </Container>
  );
}

// Streaming variant for tools being executed
interface StreamingToolExecutionGroupProps {
  executions: Array<{
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
}

const PendingDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }
`;

export function StreamingToolExecutionGroup({ executions }: StreamingToolExecutionGroupProps) {
  const [expanded, setExpanded] = useState(false);

  const completedCount = executions.filter((e) => e.status === 'complete').length;
  const allComplete = completedCount === executions.length;
  const allSuccess = executions.every((e) => e.result?.success !== false);
  const failedCount = executions.filter((e) => e.result?.success === false).length;
  const totalDuration = executions.reduce((sum, e) => sum + (e.result?.durationMs || 0), 0);

  const formatDuration = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  };

  return (
    <Container>
      <Header $success={allSuccess} onClick={() => setExpanded(!expanded)}>
        {allComplete ? (
          <StatusIcon $success={allSuccess}>
            {allSuccess ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </StatusIcon>
        ) : (
          <PendingDot />
        )}
        <Summary>
          {allComplete
            ? `${executions.length} tool${executions.length !== 1 ? 's' : ''} executed`
            : `Running tools (${completedCount}/${executions.length})`}
          {failedCount > 0 && ` (${failedCount} failed)`}
        </Summary>
        {allComplete ? (
          <Duration>{formatDuration(totalDuration)} total</Duration>
        ) : (
          <Duration>running...</Duration>
        )}
        <ExpandIcon $expanded={expanded}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </ExpandIcon>
      </Header>

      {expanded && (
        <ToolList>
          {executions.map((exec) => (
            <ToolExecution
              key={exec.id}
              execution={{
                id: exec.id,
                name: exec.name,
                input: exec.input,
                result: exec.result || { success: true },
                durationMs: exec.result?.durationMs,
              }}
              compact
              pending={exec.status === 'pending'}
            />
          ))}
        </ToolList>
      )}
    </Container>
  );
}

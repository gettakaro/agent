import styled from 'styled-components';
import type { MockServerStatus } from '../../api/cockpit-types';

const Card = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  padding: 1rem;
`;

const CardTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.75rem;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const StatusIndicator = styled.span<{ $status: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $status, theme }) => {
    switch ($status) {
      case 'running':
        return theme.colors.success;
      case 'starting':
      case 'stopping':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.textAlt;
    }
  }};
`;

const StatusText = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text};
  text-transform: capitalize;
`;

const ServerInfo = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 0.75rem;
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'danger' | 'default' }>`
  padding: 0.375rem 0.75rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.75rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;

  ${({ theme, $variant = 'default' }) => {
    switch ($variant) {
      case 'primary':
        return `
          background: ${theme.colors.primary};
          color: white;
          &:hover:not(:disabled) {
            background: ${theme.colors.primaryShade};
          }
        `;
      case 'danger':
        return `
          background: transparent;
          color: ${theme.colors.error};
          border: 1px solid ${theme.colors.error};
          &:hover:not(:disabled) {
            background: ${theme.colors.error};
            color: white;
          }
        `;
      default:
        return `
          background: ${theme.colors.backgroundAccent};
          color: ${theme.colors.text};
          &:hover:not(:disabled) {
            background: ${theme.colors.shade};
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface MockServerControlProps {
  status: MockServerStatus | null;
  isLoading: boolean;
  onStart: () => void;
  onStop: () => void;
  onCommand: (command: string) => void;
  isStarting: boolean;
  isStopping: boolean;
}

export function MockServerControl({
  status,
  isLoading,
  onStart,
  onStop,
  onCommand,
  isStarting,
  isStopping,
}: MockServerControlProps) {
  const currentStatus = status?.status || 'stopped';
  const isRunning = currentStatus === 'running';
  const isTransitioning = currentStatus === 'starting' || currentStatus === 'stopping' || isStarting || isStopping;

  return (
    <Card>
      <CardTitle>Mock Server</CardTitle>

      <StatusRow>
        <StatusIndicator $status={currentStatus} />
        <StatusText>{isLoading ? 'Loading...' : currentStatus}</StatusText>
      </StatusRow>

      {status?.gameServerId && (
        <ServerInfo>ID: {status.gameServerId}</ServerInfo>
      )}

      <Controls>
        {isRunning ? (
          <>
            <Button $variant="danger" onClick={onStop} disabled={isStopping}>
              {isStopping ? 'Stopping...' : 'Stop'}
            </Button>
            <Button onClick={() => onCommand('connectAll')}>Connect All</Button>
            <Button onClick={() => onCommand('disconnectAll')}>Disconnect All</Button>
          </>
        ) : isTransitioning ? (
          <Button disabled>
            {isStarting || currentStatus === 'starting' ? 'Starting...' : 'Stopping...'}
          </Button>
        ) : (
          <Button $variant="primary" onClick={onStart} disabled={isStarting}>
            Start Server
          </Button>
        )}
      </Controls>
    </Card>
  );
}

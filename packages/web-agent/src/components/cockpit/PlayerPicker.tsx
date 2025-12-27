import styled from 'styled-components';
import type { MockPlayer } from '../../api/cockpit-types';

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
  margin: 0 0 0.25rem;
`;

const CardDescription = styled.p`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
  margin: 0 0 0.75rem;
`;

const PlayerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const PlayerItem = styled.label<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.primaryShade : theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected ? theme.colors.primaryShade : theme.colors.shade};
  }

  input {
    margin: 0;
  }
`;

const PlayerName = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text};
  flex: 1;
`;

const PlayerId = styled.span`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textAlt};
  font-family: 'JetBrains Mono', monospace;
`;

const EmptyState = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textAlt};
  text-align: center;
  padding: 1rem;
`;

const LoadingState = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textAlt};
  text-align: center;
  padding: 1rem;
`;

interface PlayerPickerProps {
  players: MockPlayer[];
  selectedPlayerId?: string;
  onSelectPlayer: (playerId: string) => void;
  isLoading: boolean;
}

export function PlayerPicker({
  players,
  selectedPlayerId,
  onSelectPlayer,
  isLoading,
}: PlayerPickerProps) {
  if (isLoading) {
    return (
      <Card>
        <CardTitle>Players</CardTitle>
        <LoadingState>Loading players...</LoadingState>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Players</CardTitle>
      <CardDescription>Select a player for command testing</CardDescription>

      {players.length === 0 ? (
        <EmptyState>No players connected</EmptyState>
      ) : (
        <PlayerList>
          {players.map((player) => (
            <PlayerItem
              key={player.id}
              $selected={player.id === selectedPlayerId}
            >
              <input
                type="radio"
                name="player"
                value={player.id}
                checked={player.id === selectedPlayerId}
                onChange={() => onSelectPlayer(player.id)}
              />
              <PlayerName>{player.name}</PlayerName>
              <PlayerId>{player.gameId}</PlayerId>
            </PlayerItem>
          ))}
        </PlayerList>
      )}
    </Card>
  );
}

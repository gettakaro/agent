// Cockpit API types

export interface CockpitSession {
  id: string;
  conversationId: string;
  userId: string;
  mockServerStatus: 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
  mockServerGameServerId?: string;
  selectedPlayerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockServerStatus {
  status: 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
  gameServerId?: string;
  playerCount?: number;
}

export interface MockPlayer {
  id: string;
  name: string;
  gameId: string;
}

export interface PlayersResponse {
  players: MockPlayer[];
  selectedPlayerId?: string;
}

export interface CockpitEvent {
  eventName: string;
  createdAt: string;
  meta: {
    command?: { name: string };
    hook?: { name: string };
    cronjob?: { name: string };
    msg?: string;
    result?: {
      success: boolean;
      logs?: Array<{ msg: string; details?: unknown }>;
    };
  };
}

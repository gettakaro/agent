import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { CockpitSession, MockServerStatus, PlayersResponse } from '../api/cockpit-types';

export const cockpitKeys = {
  all: ['cockpit'] as const,
  session: (conversationId: string) => [...cockpitKeys.all, 'session', conversationId] as const,
  status: (sessionId: string) => [...cockpitKeys.all, 'status', sessionId] as const,
  players: (sessionId: string) => [...cockpitKeys.all, 'players', sessionId] as const,
};

interface SessionResponse {
  data: CockpitSession;
}

interface StatusResponse {
  data: MockServerStatus;
}

interface PlayersDataResponse {
  data: PlayersResponse;
}

export function useCockpitSessionQuery(conversationId: string | undefined) {
  return useQuery({
    queryKey: cockpitKeys.session(conversationId || ''),
    queryFn: async () => {
      if (!conversationId) throw new Error('Conversation ID required');
      const response = await apiClient.get<SessionResponse>(`/api/cockpit/sessions/${conversationId}`);
      return response.data.data;
    },
    enabled: !!conversationId,
  });
}

export function useMockServerStatusQuery(sessionId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: cockpitKeys.status(sessionId || ''),
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required');
      const response = await apiClient.get<StatusResponse>(`/api/cockpit/sessions/${sessionId}/mock-server/status`);
      return response.data.data;
    },
    enabled: !!sessionId && enabled,
    refetchInterval: 5000, // Poll status every 5 seconds
  });
}

export function usePlayersQuery(sessionId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: cockpitKeys.players(sessionId || ''),
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required');
      const response = await apiClient.get<PlayersDataResponse>(`/api/cockpit/sessions/${sessionId}/players`);
      return response.data.data;
    },
    enabled: !!sessionId && enabled,
    refetchInterval: 10000, // Poll players every 10 seconds
  });
}

export function useStartMockServerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiClient.post<StatusResponse>(`/api/cockpit/sessions/${sessionId}/mock-server/start`);
      return response.data.data;
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: cockpitKeys.status(sessionId) });
      queryClient.invalidateQueries({ queryKey: cockpitKeys.players(sessionId) });
    },
  });
}

export function useStopMockServerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiClient.post<StatusResponse>(`/api/cockpit/sessions/${sessionId}/mock-server/stop`);
      return response.data.data;
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: cockpitKeys.status(sessionId) });
    },
  });
}

export function useMockServerCommandMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, command }: { sessionId: string; command: string }) => {
      await apiClient.post(`/api/cockpit/sessions/${sessionId}/mock-server/command`, { command });
    },
    onSuccess: (_data, { sessionId }) => {
      // Refresh players after connect/disconnect commands
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: cockpitKeys.players(sessionId) });
      }, 1000);
    },
  });
}

export function useSelectPlayerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, playerId }: { sessionId: string; playerId: string }) => {
      await apiClient.post(`/api/cockpit/sessions/${sessionId}/select-player`, { playerId });
    },
    onSuccess: (_data, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: cockpitKeys.players(sessionId) });
    },
  });
}

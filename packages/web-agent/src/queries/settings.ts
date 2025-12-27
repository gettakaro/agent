import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

interface AuthStatus {
  providers: {
    openrouter: { connected: boolean };
  };
  hasAnyProvider: boolean;
}

// Query keys
export const settingsKeys = {
  all: ['settings'] as const,
  status: () => [...settingsKeys.all, 'status'] as const,
};

// Get auth/provider status
export function useAuthStatusQuery() {
  return useQuery({
    queryKey: settingsKeys.status(),
    queryFn: async () => {
      const response = await apiClient.get<AuthStatus>('/auth/status');
      return response.data;
    },
  });
}

// Save OpenRouter API key mutation
export function useSaveApiKeyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (apiKey: string) => {
      const response = await apiClient.post('/auth/openrouter', { apiKey });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.status() });
    },
  });
}

// Remove OpenRouter API key mutation
export function useRemoveApiKeyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete('/auth/openrouter');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.status() });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Agent, CustomAgent, AvailableTool, AvailableModel, KnowledgeBase } from '../api/types';

export const agentKeys = {
  all: ['agents'] as const,
  list: () => [...agentKeys.all, 'list'] as const,
  detail: (id: string) => [...agentKeys.all, 'detail', id] as const,
  tools: () => [...agentKeys.all, 'tools'] as const,
  models: () => [...agentKeys.all, 'models'] as const,
  knowledgeBases: () => [...agentKeys.all, 'knowledge-bases'] as const,
};

interface AgentsResponse {
  data: {
    builtin: Agent[];
    custom: CustomAgent[];
  };
}

export function useAgentsQuery() {
  return useQuery({
    queryKey: agentKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<AgentsResponse>('/api/agents');
      return response.data.data;
    },
  });
}

// Get a single custom agent
export function useCustomAgentQuery(id: string | undefined) {
  return useQuery({
    queryKey: agentKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Agent ID required');
      const response = await apiClient.get<{ data: CustomAgent }>(`/api/custom-agents/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

// Get available tools for custom agent creation
export function useAvailableToolsQuery() {
  return useQuery({
    queryKey: agentKeys.tools(),
    queryFn: async () => {
      const response = await apiClient.get<{ data: AvailableTool[] }>('/api/custom-agents/tools');
      return response.data.data;
    },
  });
}

// Get available models for custom agent creation
export function useAvailableModelsQuery() {
  return useQuery({
    queryKey: agentKeys.models(),
    queryFn: async () => {
      const response = await apiClient.get<{ data: AvailableModel[] }>('/api/custom-agents/models');
      return response.data.data;
    },
  });
}

// Get available knowledge bases for custom agent creation
export function useAvailableKnowledgeBasesQuery() {
  return useQuery({
    queryKey: agentKeys.knowledgeBases(),
    queryFn: async () => {
      const response = await apiClient.get<{ data: KnowledgeBase[] }>('/api/custom-agents/knowledge-bases');
      return response.data.data;
    },
  });
}

// Create custom agent mutation
export interface CreateCustomAgentInput {
  name: string;
  description?: string;
  model: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  knowledgeBases?: string[];
}

export function useCreateCustomAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCustomAgentInput) => {
      const response = await apiClient.post<{ data: CustomAgent }>('/api/custom-agents', input);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.list() });
    },
  });
}

// Update custom agent mutation
export interface UpdateCustomAgentInput extends Partial<CreateCustomAgentInput> {
  id: string;
}

export function useUpdateCustomAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateCustomAgentInput) => {
      const response = await apiClient.put<{ data: CustomAgent }>(`/api/custom-agents/${id}`, input);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.list() });
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(variables.id) });
    },
  });
}

// Delete custom agent mutation
export function useDeleteCustomAgentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/custom-agents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.list() });
    },
  });
}

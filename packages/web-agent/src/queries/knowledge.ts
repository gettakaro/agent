import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { KnowledgeBase, Agent, SearchResult, SearchResponse } from '../api/types';

export const knowledgeKeys = {
  all: ['knowledge'] as const,
  list: () => [...knowledgeKeys.all, 'list'] as const,
  detail: (id: string) => [...knowledgeKeys.all, 'detail', id] as const,
  agents: (id: string) => [...knowledgeKeys.all, 'agents', id] as const,
  search: (id: string, query: string) => [...knowledgeKeys.all, 'search', id, query] as const,
};

interface KnowledgeBasesResponse {
  data: KnowledgeBase[];
}

interface KnowledgeBaseResponse {
  data: KnowledgeBase;
}

export function useKnowledgeBasesQuery() {
  return useQuery({
    queryKey: knowledgeKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<KnowledgeBasesResponse>('/api/knowledge-bases');
      return response.data.data;
    },
  });
}

export function useKnowledgeBaseQuery(id: string | undefined) {
  return useQuery({
    queryKey: knowledgeKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Knowledge base ID required');
      const response = await apiClient.get<KnowledgeBaseResponse>(`/api/knowledge-bases/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useSyncKnowledgeBaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/api/knowledge-bases/${id}/sync`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeKeys.list() });
    },
  });
}

// Get agents using a knowledge base (returns array of agent IDs)
export function useKnowledgeBaseAgentsQuery(kbId: string | undefined) {
  return useQuery({
    queryKey: knowledgeKeys.agents(kbId || ''),
    queryFn: async () => {
      if (!kbId) throw new Error('Knowledge base ID required');
      const response = await apiClient.get<{ data: string[] }>(`/api/knowledge-bases/${kbId}/agents`);
      return response.data.data;
    },
    enabled: !!kbId,
  });
}

// Search within a knowledge base
export function useKnowledgeBaseSearchQuery(kbId: string | undefined, query: string) {
  return useQuery({
    queryKey: knowledgeKeys.search(kbId || '', query),
    queryFn: async () => {
      if (!kbId) throw new Error('Knowledge base ID required');
      const response = await apiClient.get<{ data: SearchResponse }>(
        `/api/knowledge-bases/${kbId}/search`,
        { params: { q: query, limit: 10 } }
      );
      return response.data.data.results;
    },
    enabled: !!kbId && query.length >= 2,
  });
}

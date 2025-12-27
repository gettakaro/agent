import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Conversation, Message } from '../api/types';

// Query keys
export const conversationKeys = {
  all: ['conversations'] as const,
  list: () => [...conversationKeys.all, 'list'] as const,
  detail: (id: string) => [...conversationKeys.all, 'detail', id] as const,
  messages: (id: string) => [...conversationKeys.all, 'messages', id] as const,
};

interface ConversationsResponse {
  data: Conversation[];
}

interface ConversationResponse {
  data: Conversation;
}

interface MessagesResponse {
  data: Message[];
}

// List all conversations
export function useConversationsQuery() {
  return useQuery({
    queryKey: conversationKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<ConversationsResponse>('/api/conversations');
      return response.data.data;
    },
  });
}

// Get single conversation
export function useConversationQuery(id: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Conversation ID required');
      const response = await apiClient.get<ConversationResponse>(`/api/conversations/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

// Get conversation messages
export function useMessagesQuery(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.messages(conversationId || ''),
    queryFn: async () => {
      if (!conversationId) throw new Error('Conversation ID required');
      const response = await apiClient.get<MessagesResponse>(`/api/conversations/${conversationId}/messages`);
      return response.data.data;
    },
    enabled: !!conversationId,
  });
}

// Create new conversation
export function useCreateConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agentId, initialMessage }: { agentId: string; initialMessage?: string }) => {
      const response = await apiClient.post<ConversationResponse>('/api/conversations', {
        agentId,
        initialMessage,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
    },
  });
}

// Delete conversation
export function useDeleteConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
    },
  });
}

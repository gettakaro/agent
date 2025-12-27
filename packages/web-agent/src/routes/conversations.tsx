import { useState, useEffect, useRef, useMemo } from 'react';
import { createFileRoute, useNavigate, useSearch, Link } from '@tanstack/react-router';
import styled from 'styled-components';
import {
  useConversationsQuery,
  useMessagesQuery,
  useCreateConversationMutation,
  useDeleteConversationMutation,
} from '../queries/conversations';
import { useSSE } from '../hooks/useSSE';
import { useAuth } from '../hooks/useAuth';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { MessageBubble, StreamingMessage } from '../components/chat/MessageBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { NewConversationModal } from '../components/chat/NewConversationModal';
import { ToolExecutionGroup } from '../components/chat/ToolExecutionGroup';
import type { Message, ToolExecution } from '../api/types';

// A grouped message item - either a regular message or a group of tool executions
type GroupedItem =
  | { type: 'message'; message: Message; isFirstInGroup: boolean; isLastInGroup: boolean }
  | { type: 'tool-group'; executions: ToolExecution[]; isFirstInGroup: boolean; isLastInGroup: boolean };

// Group consecutive tool-only assistant messages together
function groupMessages(messages: Message[]): GroupedItem[] {
  const result: GroupedItem[] = [];
  let i = 0;

  while (i < messages.length) {
    const message = messages[i];
    const prevMessage = messages[i - 1];
    const isToolOnly = message.role === 'assistant' && !message.content && message.toolExecutions?.length;

    if (isToolOnly) {
      // Collect all consecutive tool-only assistant messages
      const toolExecutions: ToolExecution[] = [];
      const startIndex = i;

      while (i < messages.length) {
        const m = messages[i];
        if (m.role === 'assistant' && !m.content && m.toolExecutions?.length) {
          toolExecutions.push(...m.toolExecutions);
          i++;
        } else {
          break;
        }
      }

      const nextMessage = messages[i];
      const isFirstInGroup = !prevMessage || prevMessage.role !== 'assistant';
      const isLastInGroup = !nextMessage || nextMessage.role !== 'assistant';

      result.push({
        type: 'tool-group',
        executions: toolExecutions,
        isFirstInGroup,
        isLastInGroup,
      });
    } else {
      const nextMessage = messages[i + 1];
      const nextIsToolOnly = nextMessage?.role === 'assistant' && !nextMessage.content && (nextMessage.toolExecutions?.length ?? 0) > 0;
      const isFirstInGroup = !prevMessage || prevMessage.role !== message.role;
      const isLastInGroup = !nextMessage || nextMessage.role !== message.role || nextIsToolOnly;

      result.push({
        type: 'message',
        message,
        isFirstInGroup,
        isLastInGroup,
      });
      i++;
    }
  }

  return result;
}

interface SearchParams {
  id?: string;
}

export const Route = createFileRoute('/conversations')({
  component: ConversationsPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    id: typeof search.id === 'string' ? search.id : undefined,
  }),
});

const PageContainer = styled.div`
  flex: 1;
  display: flex;
  height: 100%;
  overflow: hidden;
`;

const ChatArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const ChatHeader = styled.div`
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.shade};
  background: ${({ theme }) => theme.colors.backgroundAlt};
`;

const ChatTitle = styled.h1`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const ChatMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
  margin-top: 0.25rem;
`;

const CockpitLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EmptyChat = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textAlt};
  text-align: center;
  padding: 2rem;

  svg {
    width: 64px;
    height: 64px;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
    margin: 0 0 0.5rem;
  }

  p {
    font-size: 0.875rem;
    margin: 0;
    max-width: 300px;
  }
`;

const SetupWarning = styled.div`
  padding: 1rem;
  margin: 1rem;
  background: ${({ theme }) => `${theme.colors.warning}22`};
  border: 1px solid ${({ theme }) => `${theme.colors.warning}44`};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  color: ${({ theme }) => theme.colors.warning};
  font-size: 0.875rem;
  text-align: center;

  a {
    color: ${({ theme }) => theme.colors.warning};
    font-weight: 500;
  }
`;

const ToolGroupContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 85%;
  align-self: flex-start;
`;

const RoleLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textAlt};
  margin-bottom: 0.375rem;
  padding: 0 0.25rem;
`;

function ConversationsPage() {
  const navigate = useNavigate();
  const { id: selectedId } = useSearch({ from: '/conversations' });
  const { hasOpenRouter } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: conversations = [], isLoading: conversationsLoading } = useConversationsQuery();
  const { data: messages = [], refetch: refetchMessages } = useMessagesQuery(selectedId);
  const createConversation = useCreateConversationMutation();
  const deleteConversation = useDeleteConversationMutation();

  const {
    isStreaming,
    content: streamingContent,
    toolExecutions: streamingTools,
    tokenUsage: streamingTokenUsage,
    error: streamingError,
    sendMessage,
    reset: resetStream,
  } = useSSE({
    onComplete: () => {
      refetchMessages();
    },
  });

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  // Group consecutive tool-only messages together for compact display
  const groupedMessages = useMemo(() => groupMessages(messages), [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, streamingTools]);

  const handleSelectConversation = (id: string) => {
    resetStream();
    navigate({ to: '/conversations', search: { id } });
  };

  const handleNewChat = () => {
    setIsModalOpen(true);
  };

  const handleCreateConversation = async (agentId: string, initialMessage?: string) => {
    try {
      const conversation = await createConversation.mutateAsync({ agentId, initialMessage });
      setIsModalOpen(false);
      navigate({ to: '/conversations', search: { id: conversation.id } });

      // If there was an initial message, the backend already sent it, so refetch messages
      if (initialMessage) {
        setTimeout(() => refetchMessages(), 500);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation.mutateAsync(id);
      if (selectedId === id) {
        navigate({ to: '/conversations', search: {} });
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = (content: string) => {
    if (selectedId && !isStreaming) {
      sendMessage(selectedId, content);
    }
  };

  return (
    <PageContainer>
      <ChatSidebar
        conversations={conversations}
        selectedId={selectedId || null}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        isLoading={conversationsLoading}
      />

      <ChatArea>
        {selectedConversation ? (
          <>
            <ChatHeader>
              <ChatTitle>{selectedConversation.title || 'New Conversation'}</ChatTitle>
              <ChatMeta>
                <span>{selectedConversation.agentId} · {selectedConversation.agentVersion}</span>
                {selectedConversation.agentId.startsWith('module-writer') && (
                  <>
                    <span>·</span>
                    <CockpitLink to={`/cockpit/${selectedConversation.id}`}>
                      Enter Cockpit
                    </CockpitLink>
                  </>
                )}
              </ChatMeta>
            </ChatHeader>

            {!hasOpenRouter && (
              <SetupWarning>
                Please configure your OpenRouter API key in{' '}
                <a href="/settings">Settings</a> to start chatting.
              </SetupWarning>
            )}

            <MessagesContainer>
              {groupedMessages.map((item, index) => {
                if (item.type === 'tool-group') {
                  return (
                    <ToolGroupContainer key={`tools-${index}`}>
                      {item.isFirstInGroup && <RoleLabel>assistant</RoleLabel>}
                      <ToolExecutionGroup executions={item.executions} />
                    </ToolGroupContainer>
                  );
                }
                return (
                  <MessageBubble
                    key={index}
                    message={item.message}
                    isFirstInGroup={item.isFirstInGroup}
                    isLastInGroup={item.isLastInGroup}
                  />
                );
              })}

              {isStreaming && (
                <StreamingMessage
                  role="assistant"
                  content={streamingContent}
                  toolExecutions={streamingTools}
                  isComplete={false}
                  isFirstInGroup={messages.length === 0 || messages[messages.length - 1].role !== 'assistant'}
                />
              )}

              {streamingError && (
                <div style={{ color: 'red', fontSize: '0.875rem' }}>
                  Error: {streamingError}
                </div>
              )}

              <div ref={messagesEndRef} />
            </MessagesContainer>

            <ChatInput
              onSend={handleSendMessage}
              disabled={!hasOpenRouter || isStreaming}
              placeholder={
                !hasOpenRouter
                  ? 'Configure API key to chat...'
                  : isStreaming
                  ? 'Waiting for response...'
                  : 'Type a message...'
              }
            />
          </>
        ) : (
          <EmptyChat>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h2>No conversation selected</h2>
            <p>
              Select a conversation from the sidebar or start a new one to begin chatting
              with an AI agent.
            </p>
          </EmptyChat>
        )}
      </ChatArea>

      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateConversation}
        isCreating={createConversation.isPending}
      />
    </PageContainer>
  );
}

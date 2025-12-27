import { useState, useEffect, useRef, useCallback } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import styled from 'styled-components';
import { useConversationQuery, useMessagesQuery } from '../queries/conversations';
import {
  useCockpitSessionQuery,
  useMockServerStatusQuery,
  usePlayersQuery,
  useStartMockServerMutation,
  useStopMockServerMutation,
  useMockServerCommandMutation,
  useSelectPlayerMutation,
} from '../queries/cockpit';
import { useSSE } from '../hooks/useSSE';
import { useCockpitEvents } from '../hooks/useCockpitEvents';
import { useAuth } from '../hooks/useAuth';
import { MessageBubble, StreamingMessage } from '../components/chat/MessageBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { MockServerControl } from '../components/cockpit/MockServerControl';
import { PlayerPicker } from '../components/cockpit/PlayerPicker';
import { EventStream } from '../components/cockpit/EventStream';
import type { CockpitEvent } from '../api/cockpit-types';

export const Route = createFileRoute('/cockpit/$conversationId')({
  component: CockpitPage,
});

const PageContainer = styled.div`
  flex: 1;
  display: flex;
  height: 100%;
  overflow: hidden;
`;

const ChatPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-right: 1px solid ${({ theme }) => theme.colors.shade};
`;

const ChatHeader = styled.div`
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.shade};
  background: ${({ theme }) => theme.colors.backgroundAlt};
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
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

  a {
    color: ${({ theme }) => theme.colors.textAlt};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SidePanel = styled.div`
  width: 340px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.background};
  overflow-y: auto;
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

const LoadingState = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textAlt};
`;

const ErrorState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.error};
  text-align: center;
  padding: 2rem;

  h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
  }

  p {
    font-size: 0.875rem;
    margin: 0 0 1rem;
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

function CockpitPage() {
  const navigate = useNavigate();
  const { conversationId } = Route.useParams();
  const { hasOpenRouter } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<CockpitEvent[]>([]);

  // Queries
  const { data: conversation, isLoading: convLoading, error: convError } = useConversationQuery(conversationId);
  const { data: messages = [], refetch: refetchMessages } = useMessagesQuery(conversationId);
  const { data: session, isLoading: sessionLoading } = useCockpitSessionQuery(conversationId);

  const { data: serverStatus, isLoading: statusLoading } = useMockServerStatusQuery(
    session?.id,
    !!session?.id
  );

  // Use serverStatus (polled) if available, otherwise fall back to session
  const isServerRunning = serverStatus?.status === 'running' || session?.mockServerStatus === 'running';

  const { data: playersData, isLoading: playersLoading } = usePlayersQuery(
    session?.id,
    !!session?.id && isServerRunning
  );

  // Mutations
  const startServer = useStartMockServerMutation();
  const stopServer = useStopMockServerMutation();
  const sendCommand = useMockServerCommandMutation();
  const selectPlayer = useSelectPlayerMutation();

  // SSE for chat
  const {
    isStreaming,
    content: streamingContent,
    toolExecutions: streamingTools,
    error: streamingError,
    sendMessage,
    reset: resetStream,
  } = useSSE({
    onComplete: () => {
      refetchMessages();
    },
  });

  // SSE for cockpit events
  const handleEvent = useCallback((event: CockpitEvent) => {
    setEvents((prev) => [event, ...prev.slice(0, 99)]); // Keep last 100 events
  }, []);

  useCockpitEvents({
    sessionId: session?.id,
    enabled: isServerRunning,
    onEvent: handleEvent,
  });

  // Auto-start mock server when session loads
  useEffect(() => {
    if (session?.id && session.mockServerStatus !== 'running' && session.mockServerStatus !== 'starting') {
      startServer.mutate(session.id);
    }
  }, [session?.id, session?.mockServerStatus]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, streamingTools]);

  const handleSendMessage = (content: string) => {
    if (conversationId && !isStreaming) {
      sendMessage(conversationId, content);
    }
  };

  const handleStartServer = () => {
    if (session?.id) {
      startServer.mutate(session.id);
    }
  };

  const handleStopServer = () => {
    if (session?.id) {
      stopServer.mutate(session.id);
      setEvents([]); // Clear events when stopping
    }
  };

  const handleCommand = (command: string) => {
    if (session?.id) {
      sendCommand.mutate({ sessionId: session.id, command });
    }
  };

  const handleSelectPlayer = (playerId: string) => {
    if (session?.id) {
      selectPlayer.mutate({ sessionId: session.id, playerId });
    }
  };

  if (convLoading || sessionLoading) {
    return (
      <PageContainer>
        <LoadingState>Loading cockpit...</LoadingState>
      </PageContainer>
    );
  }

  if (convError || !conversation) {
    return (
      <PageContainer>
        <ErrorState>
          <h2>Conversation not found</h2>
          <p>The conversation you're looking for doesn't exist or you don't have access to it.</p>
          <Link to="/conversations">Go to Conversations</Link>
        </ErrorState>
      </PageContainer>
    );
  }

  const effectiveStatus = serverStatus || {
    status: session?.mockServerStatus || 'stopped',
    gameServerId: session?.mockServerGameServerId,
  };

  return (
    <PageContainer>
      <ChatPanel>
        <ChatHeader>
          <HeaderTop>
            <div>
              <ChatTitle>{conversation.title || 'Module Writer Cockpit'}</ChatTitle>
              <ChatMeta>
                <span>{conversation.agentId}/{conversation.agentVersion}</span>
                <span>·</span>
                <Link to="/conversations" search={{ id: conversationId }}>Exit Cockpit</Link>
              </ChatMeta>
            </div>
          </HeaderTop>
        </ChatHeader>

        {!hasOpenRouter && (
          <SetupWarning>
            Please configure your OpenRouter API key in{' '}
            <a href="/settings">Settings</a> to start chatting.
          </SetupWarning>
        )}

        <MessagesContainer>
          {messages.length === 0 && !isStreaming && (
            <div style={{ color: 'var(--text-alt)', textAlign: 'center', padding: '2rem' }}>
              No messages yet. The agent is ready to help you build a module.
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))}

          {isStreaming && (
            <StreamingMessage
              role="assistant"
              content={streamingContent}
              toolExecutions={streamingTools}
              isComplete={false}
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
              : 'Describe the module you want to build...'
          }
        />
      </ChatPanel>

      <SidePanel>
        <MockServerControl
          status={effectiveStatus}
          isLoading={statusLoading}
          onStart={handleStartServer}
          onStop={handleStopServer}
          onCommand={handleCommand}
          isStarting={startServer.isPending}
          isStopping={stopServer.isPending}
        />

        {isServerRunning && (
          <PlayerPicker
            players={playersData?.players || []}
            selectedPlayerId={playersData?.selectedPlayerId}
            onSelectPlayer={handleSelectPlayer}
            isLoading={playersLoading}
          />
        )}

        <EventStream
          events={events}
          isServerRunning={isServerRunning}
        />
      </SidePanel>
    </PageContainer>
  );
}

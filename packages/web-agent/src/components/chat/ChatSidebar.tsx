import styled from 'styled-components';
import type { Conversation } from '../../api/types';

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

const Sidebar = styled.aside`
  width: 280px;
  min-width: 280px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border-right: 1px solid ${({ theme }) => theme.colors.shade};
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Header = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.shade};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h2`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const NewChatButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.primaryShade};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ConversationList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
`;

const ConversationItem = styled.div<{ $active: boolean }>`
  width: 100%;
  padding: 0.75rem;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.backgroundAccent : 'transparent'};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.colors.backgroundAccent : theme.colors.shade};
  }
`;

const ConversationIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  background: ${({ theme }) => theme.colors.shade};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.textAlt};
  }
`;

const ConversationInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ConversationTitle = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ConversationMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
  margin-top: 0.25rem;
`;

const DeleteButton = styled.button`
  padding: 0.25rem;
  background: transparent;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
  color: ${({ theme }) => theme.colors.textAlt};

  ${ConversationItem}:hover & {
    opacity: 1;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.error};
    color: white;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: ${({ theme }) => theme.colors.textAlt};
  text-align: center;

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  p {
    font-size: 0.875rem;
    margin: 0;
  }
`;

const LoadingState = styled.div`
  padding: 1rem;
  color: ${({ theme }) => theme.colors.textAlt};
  font-size: 0.875rem;
  text-align: center;
`;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ChatSidebar({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
  onDelete,
  isLoading,
}: ChatSidebarProps) {
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      onDelete(id);
    }
  };

  return (
    <Sidebar>
      <Header>
        <Title>Conversations</Title>
        <NewChatButton onClick={onNewChat}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New
        </NewChatButton>
      </Header>

      <ConversationList>
        {isLoading ? (
          <LoadingState>Loading conversations...</LoadingState>
        ) : conversations.length === 0 ? (
          <EmptyState>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No conversations yet</p>
          </EmptyState>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              $active={conversation.id === selectedId}
              onClick={() => onSelect(conversation.id)}
            >
              <ConversationIcon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </ConversationIcon>
              <ConversationInfo>
                <ConversationTitle>
                  {conversation.title || 'New Conversation'}
                </ConversationTitle>
                <ConversationMeta>
                  {conversation.agentId} · {formatDate(conversation.updatedAt)}
                </ConversationMeta>
              </ConversationInfo>
              <DeleteButton onClick={(e) => handleDelete(e, conversation.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </DeleteButton>
            </ConversationItem>
          ))
        )}
      </ConversationList>
    </Sidebar>
  );
}

import { useState } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import styled from 'styled-components';
import { useAgentsQuery } from '../queries/agents';
import { useCreateConversationMutation } from '../queries/conversations';
import type { Agent, CustomAgent } from '../api/types';

export const Route = createFileRoute('/agents/')({
  component: AgentsPage,
});

const PageContainer = styled.div`
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
`;

const PageHeaderContent = styled.div``;

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.5rem;
`;

const PageDescription = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textAlt};
  margin: 0;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.shade};
  padding-bottom: 0.5rem;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.backgroundAccent : 'transparent'};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text : theme.colors.textAlt};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.backgroundAccent};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const AgentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
`;

const AgentCardLink = styled(Link)`
  text-decoration: none;
  display: block;
`;

const AgentCard = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  padding: 1.25rem;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const AgentHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const AgentInfo = styled.div`
  flex: 1;
`;

const AgentName = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.25rem;
`;

const AgentType = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
  font-family: 'JetBrains Mono', monospace;
`;

const AgentDescription = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textAlt};
  margin: 0 0 1rem;
  line-height: 1.5;
`;

const AgentMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const MetaBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};

  svg {
    width: 12px;
    height: 12px;
  }
`;

const AgentActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.8125rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;

  ${({ theme, $variant = 'secondary' }) =>
    $variant === 'primary'
      ? `
        background: ${theme.colors.primary};
        color: white;
        &:hover:not(:disabled) {
          background: ${theme.colors.primaryShade};
        }
      `
      : `
        background: ${theme.colors.backgroundAccent};
        color: ${theme.colors.text};
        &:hover:not(:disabled) {
          background: ${theme.colors.shade};
        }
      `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: ${({ theme }) => theme.colors.textAlt};
`;

const ErrorState = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.error};
`;

const EmptyState = styled.div`
  padding: 4rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.textAlt};

  h3 {
    font-size: 1rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
    margin: 0 0 0.5rem;
  }

  p {
    font-size: 0.875rem;
    margin: 0;
  }
`;

function AgentsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'builtin' | 'custom'>('builtin');
  const { data: agents, isLoading, error } = useAgentsQuery();
  const createConversation = useCreateConversationMutation();

  const handleStartChat = async (agentId: string) => {
    try {
      const conversation = await createConversation.mutateAsync({ agentId });
      navigate({ to: '/conversations', search: { id: conversation.id } });
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState>Loading agents...</LoadingState>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState>Failed to load agents. Please try refreshing.</ErrorState>
      </PageContainer>
    );
  }

  const builtinAgents = agents?.builtin || [];
  const customAgents = agents?.custom || [];

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Agents</PageTitle>
          <PageDescription>
            Browse available AI agents and start conversations with them.
          </PageDescription>
        </PageHeaderContent>
        <Button as={Link} to="/agents/new" $variant="primary">
          + New Agent
        </Button>
      </PageHeader>

      <TabContainer>
        <Tab $active={activeTab === 'builtin'} onClick={() => setActiveTab('builtin')}>
          Built-in ({builtinAgents.length})
        </Tab>
        <Tab $active={activeTab === 'custom'} onClick={() => setActiveTab('custom')}>
          Custom ({customAgents.length})
        </Tab>
      </TabContainer>

      {activeTab === 'builtin' && (
        <AgentGrid>
          {builtinAgents.map((agent) => (
            <AgentCardLink key={agent.id} to={`/agents/${encodeURIComponent(agent.id)}`}>
              <BuiltinAgentCard
                agent={agent}
                onStartChat={(e) => {
                  e.preventDefault();
                  handleStartChat(agent.id);
                }}
                isCreating={createConversation.isPending}
              />
            </AgentCardLink>
          ))}
        </AgentGrid>
      )}

      {activeTab === 'custom' && (
        <>
          {customAgents.length === 0 ? (
            <EmptyState>
              <h3>No custom agents yet</h3>
              <p>Create custom agents with your own prompts and configurations.</p>
            </EmptyState>
          ) : (
            <AgentGrid>
              {customAgents.map((agent) => (
                <AgentCardLink key={agent.id} to={`/agents/${encodeURIComponent(`custom:${agent.id}`)}`}>
                  <CustomAgentCard
                    agent={agent}
                    onStartChat={(e) => {
                      e.preventDefault();
                      handleStartChat(`custom:${agent.id}`);
                    }}
                    isCreating={createConversation.isPending}
                  />
                </AgentCardLink>
              ))}
            </AgentGrid>
          )}
        </>
      )}
    </PageContainer>
  );
}

interface BuiltinAgentCardProps {
  agent: Agent;
  onStartChat: (e: React.MouseEvent) => void;
  isCreating: boolean;
}

function BuiltinAgentCard({ agent, onStartChat, isCreating }: BuiltinAgentCardProps) {
  return (
    <AgentCard>
      <AgentHeader>
        <AgentInfo>
          <AgentName>{agent.name}</AgentName>
          <AgentType>{agent.id}</AgentType>
        </AgentInfo>
      </AgentHeader>

      <AgentDescription>{agent.description}</AgentDescription>

      <AgentMeta>
        <MetaBadge>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
            <path d="M12 6v6l4 2" />
          </svg>
          {agent.model}
        </MetaBadge>
        {agent.experiment && agent.experiment !== 'default' && (
          <MetaBadge>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.54" />
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.54" />
            </svg>
            {agent.experiment}
          </MetaBadge>
        )}
      </AgentMeta>

      <AgentActions>
        <Button $variant="primary" onClick={onStartChat} disabled={isCreating}>
          {isCreating ? 'Starting...' : 'Start Chat'}
        </Button>
      </AgentActions>
    </AgentCard>
  );
}

interface CustomAgentCardProps {
  agent: CustomAgent;
  onStartChat: (e: React.MouseEvent) => void;
  isCreating: boolean;
}

function CustomAgentCard({ agent, onStartChat, isCreating }: CustomAgentCardProps) {
  return (
    <AgentCard>
      <AgentHeader>
        <AgentInfo>
          <AgentName>{agent.name}</AgentName>
          <AgentType>custom:{agent.id.slice(0, 8)}</AgentType>
        </AgentInfo>
      </AgentHeader>

      <AgentDescription>{agent.description}</AgentDescription>

      <AgentMeta>
        <MetaBadge>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
            <path d="M12 6v6l4 2" />
          </svg>
          {agent.model}
        </MetaBadge>
        <MetaBadge>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          {agent.tools.length} tools
        </MetaBadge>
      </AgentMeta>

      <AgentActions>
        <Button $variant="primary" onClick={onStartChat} disabled={isCreating}>
          {isCreating ? 'Starting...' : 'Start Chat'}
        </Button>
      </AgentActions>
    </AgentCard>
  );
}

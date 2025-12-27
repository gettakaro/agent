import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import styled from 'styled-components';
import { useAgentsQuery, useCustomAgentQuery, useDeleteCustomAgentMutation } from '../queries/agents';
import { useConversationsQuery, useCreateConversationMutation } from '../queries/conversations';
import type { Agent, CustomAgent } from '../api/types';

export const Route = createFileRoute('/agents/$agentId/')({
  component: AgentDetailPage,
});

const PageContainer = styled.div`
  flex: 1;
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.textAlt};
  text-decoration: none;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
`;

const HeaderInfo = styled.div``;

const AgentName = styled.h1`
  font-size: 1.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.5rem;
`;

const AgentMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const AgentId = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textAlt};
`;

const Badge = styled.span<{ $variant?: 'builtin' | 'custom' }>`
  padding: 0.25rem 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ theme, $variant }) =>
    $variant === 'custom' ? theme.colors.primary + '22' : theme.colors.backgroundAccent};
  color: ${({ theme, $variant }) =>
    $variant === 'custom' ? theme.colors.primary : theme.colors.textAlt};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.8125rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  ${({ theme, $variant = 'secondary' }) => {
    switch ($variant) {
      case 'primary':
        return `
          background: ${theme.colors.primary};
          color: white;
          &:hover:not(:disabled) { background: ${theme.colors.primaryShade}; }
        `;
      case 'danger':
        return `
          background: ${theme.colors.error}22;
          color: ${theme.colors.error};
          &:hover:not(:disabled) { background: ${theme.colors.error}33; }
        `;
      default:
        return `
          background: ${theme.colors.backgroundAccent};
          color: ${theme.colors.text};
          &:hover:not(:disabled) { background: ${theme.colors.shade}; }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Section = styled.section`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 1rem;
`;

const Description = styled.p`
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.colors.textAlt};
  line-height: 1.6;
  margin: 0;
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
`;

const MetaItem = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 1rem;
`;

const MetaLabel = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
  text-transform: uppercase;
  margin-bottom: 0.25rem;
`;

const MetaValue = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text};
  font-family: 'JetBrains Mono', monospace;
`;

const PromptContainer = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  overflow: hidden;
`;

const PromptHeader = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875rem;
  font-weight: 500;

  &:hover {
    background: ${({ theme }) => theme.colors.shade};
  }

  svg {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.textAlt};
  }
`;

const PromptContent = styled.pre`
  margin: 0;
  padding: 1rem;
  border-top: 1px solid ${({ theme }) => theme.colors.shade};
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textAlt};
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
`;

const ToolsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.75rem;
`;

const ToolCard = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 0.75rem 1rem;
`;

const ToolName = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  font-family: 'JetBrains Mono', monospace;
`;

const ConversationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ConversationItem = styled(Link)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875rem;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ConversationTitle = styled.span``;

const ConversationDate = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
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
  padding: 1.5rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.textAlt};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.875rem;
`;

function AgentDetailPage() {
  const { agentId: encodedAgentId } = Route.useParams();
  const agentId = decodeURIComponent(encodedAgentId);
  const navigate = useNavigate();

  const isCustomAgent = agentId.startsWith('custom:');
  const customAgentId = isCustomAgent ? agentId.replace('custom:', '') : undefined;

  const { data: agents, isLoading: agentsLoading } = useAgentsQuery();
  const { data: customAgent, isLoading: customAgentLoading } = useCustomAgentQuery(customAgentId);
  const { data: conversations } = useConversationsQuery();
  const createConversation = useCreateConversationMutation();
  const deleteAgent = useDeleteCustomAgentMutation();

  const [promptExpanded, setPromptExpanded] = useState(false);

  // Find the agent
  let agent: Agent | CustomAgent | undefined;
  let agentType: 'builtin' | 'custom' = 'builtin';

  if (isCustomAgent) {
    agent = customAgent;
    agentType = 'custom';
  } else if (agents) {
    agent = agents.builtin.find(a => a.id === agentId);
  }

  const isLoading = isCustomAgent ? customAgentLoading : agentsLoading;

  // Filter conversations for this agent
  const agentConversations = conversations?.filter(c =>
    isCustomAgent ? c.agentId === `custom:${customAgentId}` : c.agentId === agentId
  ) || [];

  const handleStartChat = async () => {
    try {
      const conversation = await createConversation.mutateAsync({ agentId });
      navigate({ to: '/conversations', search: { id: conversation.id } });
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleDelete = async () => {
    if (!customAgentId) return;
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      await deleteAgent.mutateAsync(customAgentId);
      navigate({ to: '/agents' });
    } catch (err) {
      console.error('Failed to delete agent:', err);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState>Loading agent...</LoadingState>
      </PageContainer>
    );
  }

  if (!agent) {
    return (
      <PageContainer>
        <BackLink to="/agents">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Agents
        </BackLink>
        <ErrorState>Agent not found</ErrorState>
      </PageContainer>
    );
  }

  const systemPrompt = 'systemPrompt' in agent ? agent.systemPrompt : undefined;
  const tools = agent.tools || [];

  return (
    <PageContainer>
      <BackLink to="/agents">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Agents
      </BackLink>

      <Header>
        <HeaderInfo>
          <AgentName>{agent.name}</AgentName>
          <AgentMeta>
            <AgentId>{agentId}</AgentId>
            <Badge $variant={agentType}>{agentType}</Badge>
          </AgentMeta>
        </HeaderInfo>
        <HeaderActions>
          {agentType === 'custom' && (
            <>
              <Button as={Link} to={`/agents/${encodedAgentId}/edit`}>
                Edit
              </Button>
              <Button $variant="danger" onClick={handleDelete} disabled={deleteAgent.isPending}>
                {deleteAgent.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </>
          )}
          <Button $variant="primary" onClick={handleStartChat} disabled={createConversation.isPending}>
            {createConversation.isPending ? 'Starting...' : 'Start Chat'}
          </Button>
        </HeaderActions>
      </Header>

      <Section>
        <Description>{agent.description}</Description>
      </Section>

      <Section>
        <SectionTitle>Configuration</SectionTitle>
        <MetaGrid>
          <MetaItem>
            <MetaLabel>Model</MetaLabel>
            <MetaValue>{agent.model}</MetaValue>
          </MetaItem>
          {'experiment' in agent && agent.experiment && (
            <MetaItem>
              <MetaLabel>Experiment</MetaLabel>
              <MetaValue>{agent.experiment}</MetaValue>
            </MetaItem>
          )}
          {'temperature' in agent && (
            <MetaItem>
              <MetaLabel>Temperature</MetaLabel>
              <MetaValue>{agent.temperature}</MetaValue>
            </MetaItem>
          )}
          {'maxTokens' in agent && (
            <MetaItem>
              <MetaLabel>Max Tokens</MetaLabel>
              <MetaValue>{agent.maxTokens}</MetaValue>
            </MetaItem>
          )}
        </MetaGrid>
      </Section>

      {systemPrompt && (
        <Section>
          <SectionTitle>System Prompt</SectionTitle>
          <PromptContainer>
            <PromptHeader onClick={() => setPromptExpanded(!promptExpanded)}>
              <span>{promptExpanded ? 'Hide prompt' : 'Show prompt'}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={promptExpanded ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
              </svg>
            </PromptHeader>
            {promptExpanded && <PromptContent>{systemPrompt}</PromptContent>}
          </PromptContainer>
        </Section>
      )}

      <Section>
        <SectionTitle>Tools ({tools.length})</SectionTitle>
        {tools.length === 0 ? (
          <EmptyState>No tools configured</EmptyState>
        ) : (
          <ToolsGrid>
            {tools.map((tool) => (
              <ToolCard key={tool}>
                <ToolName>{tool}</ToolName>
              </ToolCard>
            ))}
          </ToolsGrid>
        )}
      </Section>

      <Section>
        <SectionTitle>Conversations ({agentConversations.length})</SectionTitle>
        {agentConversations.length === 0 ? (
          <EmptyState>No conversations yet</EmptyState>
        ) : (
          <ConversationsList>
            {agentConversations.slice(0, 10).map((conv) => (
              <ConversationItem key={conv.id} to={`/conversations?id=${conv.id}`}>
                <ConversationTitle>{conv.title || 'Untitled'}</ConversationTitle>
                <ConversationDate>
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </ConversationDate>
              </ConversationItem>
            ))}
          </ConversationsList>
        )}
      </Section>
    </PageContainer>
  );
}

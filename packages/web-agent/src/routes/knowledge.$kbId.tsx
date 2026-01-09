import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import styled from 'styled-components';
import {
  useKnowledgeBaseQuery,
  useKnowledgeBaseAgentsQuery,
  useKnowledgeBaseSearchQuery,
  useSyncKnowledgeBaseMutation,
} from '../queries/knowledge';
import { getErrorMessage } from '../api/client';

export const Route = createFileRoute('/knowledge/$kbId')({
  component: KnowledgeDetailPage,
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

const KBName = styled.h1`
  font-size: 1.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.5rem;
`;

const KBMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const KBId = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textAlt};
`;

const Badge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ theme }) => theme.colors.primary + '22'};
  color: ${({ theme }) => theme.colors.primary};
`;

const HeaderActions = styled.div`
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
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  ${({ theme, $variant = 'secondary' }) =>
    $variant === 'primary'
      ? `
        background: ${theme.colors.primary};
        color: white;
        &:hover:not(:disabled) { background: ${theme.colors.primaryShade}; }
      `
      : `
        background: ${theme.colors.backgroundAccent};
        color: ${theme.colors.text};
        &:hover:not(:disabled) { background: ${theme.colors.shade}; }
      `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 14px;
    height: 14px;
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

const SourceLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-size: 0.875rem;
  word-break: break-all;

  &:hover {
    text-decoration: underline;
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const AgentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const AgentItem = styled(Link)`
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

const AgentName = styled.span``;

const AgentId = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
  font-family: 'JetBrains Mono', monospace;
`;

const SearchContainer = styled.div`
  margin-bottom: 1rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875rem;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textAlt};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const SearchHelperText = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
  margin-top: 0.5rem;
`;

const SearchResults = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SearchResult = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 1rem;
`;

const ResultContent = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.5;
  margin: 0 0 0.5rem;
`;

const ResultMeta = styled.div`
  display: flex;
  gap: 1rem;
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

const SearchErrorState = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.colors.error + '11'};
  border: 1px solid ${({ theme }) => theme.colors.error + '33'};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.875rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;

  svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin-top: 0.125rem;
  }
`;

const ErrorContent = styled.div`
  flex: 1;
`;

const ErrorTitle = styled.div`
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const ErrorMessage = styled.div`
  opacity: 0.9;
`;

const SearchLoadingState = styled.div`
  padding: 1.5rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.textAlt};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid ${({ theme }) => theme.colors.shade};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function KnowledgeDetailPage() {
  const { kbId } = Route.useParams();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: kb, isLoading, error } = useKnowledgeBaseQuery(kbId);
  const { data: agents } = useKnowledgeBaseAgentsQuery(kbId);
  const { data: searchResults, error: searchError, isLoading: isSearching } = useKnowledgeBaseSearchQuery(kbId, searchQuery);
  const syncMutation = useSyncKnowledgeBaseMutation();

  const handleSync = () => {
    syncMutation.mutate(kbId);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState>Loading knowledge base...</LoadingState>
      </PageContainer>
    );
  }

  if (error || !kb) {
    return (
      <PageContainer>
        <BackLink to="/knowledge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Knowledge Bases
        </BackLink>
        <ErrorState>Knowledge base not found</ErrorState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackLink to="/knowledge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Knowledge Bases
      </BackLink>

      <Header>
        <HeaderInfo>
          <KBName>{kb.name}</KBName>
          <KBMeta>
            <KBId>{kb.id}</KBId>
            <Badge>{kb.version}</Badge>
          </KBMeta>
        </HeaderInfo>
        <HeaderActions>
          <Button onClick={handleSync} disabled={syncMutation.isPending}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
            </svg>
            {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
          </Button>
        </HeaderActions>
      </Header>

      <Section>
        <Description>{kb.description}</Description>
      </Section>

      <Section>
        <SectionTitle>Details</SectionTitle>
        <MetaGrid>
          <MetaItem>
            <MetaLabel>Documents</MetaLabel>
            <MetaValue>{kb.documentCount.toLocaleString()}</MetaValue>
          </MetaItem>
          <MetaItem>
            <MetaLabel>Refresh Schedule</MetaLabel>
            <MetaValue>{kb.refreshSchedule || 'Manual'}</MetaValue>
          </MetaItem>
          <MetaItem>
            <MetaLabel>Last Synced</MetaLabel>
            <MetaValue>
              {kb.lastSyncedAt ? formatDate(kb.lastSyncedAt) : 'Never'}
            </MetaValue>
          </MetaItem>
          <MetaItem>
            <MetaLabel>Last Commit</MetaLabel>
            <MetaValue>
              {kb.lastCommitSha ? kb.lastCommitSha.slice(0, 7) : 'N/A'}
            </MetaValue>
          </MetaItem>
        </MetaGrid>
      </Section>

      {kb.source && (
        <Section>
          <SectionTitle>Source</SectionTitle>
          <SourceLink href={kb.source} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            {kb.source}
          </SourceLink>
        </Section>
      )}

      <Section>
        <SectionTitle>Agents Using This Knowledge Base ({agents?.length || 0})</SectionTitle>
        {!agents || agents.length === 0 ? (
          <EmptyState>No agents are using this knowledge base</EmptyState>
        ) : (
          <AgentsList>
            {agents.map((agentId) => (
              <AgentItem key={agentId} to={`/agents/${encodeURIComponent(agentId)}`}>
                <AgentName>{agentId.split('/')[0]}</AgentName>
                <AgentId>{agentId}</AgentId>
              </AgentItem>
            ))}
          </AgentsList>
        )}
      </Section>

      <Section>
        <SectionTitle>Search</SectionTitle>
        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery.length < 2 && searchQuery.length > 0 && (
            <SearchHelperText>Type at least 2 characters to search</SearchHelperText>
          )}
        </SearchContainer>
        {searchQuery.length >= 2 && (
          <SearchResults>
            {searchError ? (
              <SearchErrorState>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
                <ErrorContent>
                  <ErrorTitle>Search failed</ErrorTitle>
                  <ErrorMessage>
                    {getErrorMessage(searchError)}
                  </ErrorMessage>
                </ErrorContent>
              </SearchErrorState>
            ) : isSearching ? (
              <SearchLoadingState>
                <Spinner />
                <span>Searching...</span>
              </SearchLoadingState>
            ) : !searchResults || searchResults.length === 0 ? (
              <EmptyState>No results found for "{searchQuery}"</EmptyState>
            ) : (
              searchResults.map((result, index) => (
                <SearchResult key={index}>
                  <ResultContent>{result.content}</ResultContent>
                  <ResultMeta>
                    <span>Score: {(result.score * 100).toFixed(1)}%</span>
                  </ResultMeta>
                </SearchResult>
              ))
            )}
          </SearchResults>
        )}
      </Section>
    </PageContainer>
  );
}

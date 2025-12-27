import { createFileRoute, Link } from '@tanstack/react-router';
import styled from 'styled-components';
import { useKnowledgeBasesQuery, useSyncKnowledgeBaseMutation } from '../queries/knowledge';
import type { KnowledgeBase } from '../api/types';

export const Route = createFileRoute('/knowledge/')({
  component: KnowledgePage,
});

const PageContainer = styled.div`
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

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

const KnowledgeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
`;

const KnowledgeCardLink = styled(Link)`
  text-decoration: none;
  display: block;
`;

const KnowledgeCard = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  overflow: hidden;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const CardHeader = styled.div`
  padding: 1.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.shade};
`;

const CardTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 0.375rem;
`;

const CardSubtitle = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
  font-family: 'JetBrains Mono', monospace;
`;

const CardBody = styled.div`
  padding: 1.25rem;
`;

const CardDescription = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textAlt};
  margin: 0 0 1.25rem;
  line-height: 1.5;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.25rem;
`;

const StatItem = styled.div`
  background: ${({ theme }) => theme.colors.background};
  padding: 0.75rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
`;

const StatLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textAlt};
  margin-bottom: 0.25rem;
`;

const StatValue = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text};
  font-family: 'JetBrains Mono', monospace;
`;

const SourceLink = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme.colors.background};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-size: 0.8125rem;
  margin-bottom: 1rem;
  transition: background 0.15s ease;
  cursor: pointer;
  width: 100%;
  text-align: left;

  &:hover {
    background: ${({ theme }) => theme.colors.shade};
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 0.625rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.8125rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;

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

  svg {
    width: 14px;
    height: 14px;
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

  svg {
    width: 64px;
    height: 64px;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

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

function KnowledgePage() {
  const { data: knowledgeBases, isLoading, error } = useKnowledgeBasesQuery();
  const syncMutation = useSyncKnowledgeBaseMutation();

  const handleSync = (id: string) => {
    syncMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState>Loading knowledge bases...</LoadingState>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState>Failed to load knowledge bases. Please try refreshing.</ErrorState>
      </PageContainer>
    );
  }

  if (!knowledgeBases || knowledgeBases.length === 0) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>Knowledge Bases</PageTitle>
          <PageDescription>
            Knowledge bases provide agents with domain-specific information.
          </PageDescription>
        </PageHeader>
        <EmptyState>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
          <h3>No knowledge bases configured</h3>
          <p>Knowledge bases will appear here once configured.</p>
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Knowledge Bases</PageTitle>
        <PageDescription>
          Knowledge bases provide agents with domain-specific information and documentation.
        </PageDescription>
      </PageHeader>

      <KnowledgeGrid>
        {knowledgeBases.map((kb) => (
          <KnowledgeCardLink key={kb.id} to={`/knowledge/${kb.id}`}>
            <KnowledgeBaseCard
              kb={kb}
              onSync={() => handleSync(kb.id)}
              isSyncing={syncMutation.isPending}
            />
          </KnowledgeCardLink>
        ))}
      </KnowledgeGrid>
    </PageContainer>
  );
}

interface KnowledgeBaseCardProps {
  kb: KnowledgeBase;
  onSync: () => void;
  isSyncing: boolean;
}

function KnowledgeBaseCard({ kb, onSync, isSyncing }: KnowledgeBaseCardProps) {
  return (
    <KnowledgeCard>
      <CardHeader>
        <CardTitle>{kb.name}</CardTitle>
        <CardSubtitle>{kb.id} @ {kb.version}</CardSubtitle>
      </CardHeader>

      <CardBody>
        <CardDescription>{kb.description}</CardDescription>

        <StatsGrid>
          <StatItem>
            <StatLabel>Documents</StatLabel>
            <StatValue>{kb.documentCount.toLocaleString()}</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Refresh Schedule</StatLabel>
            <StatValue>{kb.refreshSchedule || 'Manual'}</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Last Synced</StatLabel>
            <StatValue>
              {kb.lastSyncedAt ? formatDate(kb.lastSyncedAt) : 'Never'}
            </StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Last Commit</StatLabel>
            <StatValue>
              {kb.lastCommitSha ? kb.lastCommitSha.slice(0, 7) : 'N/A'}
            </StatValue>
          </StatItem>
        </StatsGrid>

        {kb.source && (
          <SourceLink
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(kb.source, '_blank', 'noopener,noreferrer');
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            <span>{kb.source}</span>
          </SourceLink>
        )}

        <CardActions>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSync();
            }}
            disabled={isSyncing}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
            </svg>
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </CardActions>
      </CardBody>
    </KnowledgeCard>
  );
}

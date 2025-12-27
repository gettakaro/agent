import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import styled from 'styled-components';
import { useAuthStatusQuery, useSaveApiKeyMutation, useRemoveApiKeyMutation } from '../queries/settings';
import { useAuth } from '../hooks/useAuth';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

const PageContainer = styled.div`
  flex: 1;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`;

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: ${({ theme }) => theme.colors.text};
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.shade};
`;

const CardTitle = styled.h2`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const CardBody = styled.div`
  padding: 1.25rem;
`;

const ProviderSection = styled.div`
  &:not(:last-child) {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.shade};
  }
`;

const ProviderHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const ProviderName = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const StatusBadge = styled.span<{ $connected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ theme, $connected }) =>
    $connected ? `${theme.colors.success}22` : `${theme.colors.error}22`};
  color: ${({ theme, $connected }) =>
    $connected ? theme.colors.success : theme.colors.error};
`;

const StatusDot = styled.span<{ $connected: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme, $connected }) =>
    $connected ? theme.colors.success : theme.colors.error};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 0.5rem;

  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const Input = styled.input`
  flex: 1;
  padding: 0.625rem 0.875rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875rem;

  &::placeholder {
    color: ${({ theme }) => theme.colors.placeholder};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Button = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary' }>`
  padding: 0.625rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  ${({ theme, $variant = 'primary' }) => {
    switch ($variant) {
      case 'danger':
        return `
          background: transparent;
          color: ${theme.colors.error};
          border: 1px solid ${theme.colors.error};
          &:hover {
            background: ${theme.colors.error};
            color: white;
          }
        `;
      case 'secondary':
        return `
          background: ${theme.colors.backgroundAccent};
          color: ${theme.colors.text};
          &:hover {
            background: ${theme.colors.shade};
          }
        `;
      default:
        return `
          background: ${theme.colors.primary};
          color: white;
          &:hover {
            background: ${theme.colors.primaryShade};
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const HelpText = styled.p`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
  margin: 0;

  a {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Alert = styled.div<{ $type: 'success' | 'error' }>`
  padding: 0.75rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.875rem;
  margin-bottom: 1rem;
  background: ${({ theme, $type }) =>
    $type === 'success' ? `${theme.colors.success}22` : `${theme.colors.error}22`};
  color: ${({ theme, $type }) =>
    $type === 'success' ? theme.colors.success : theme.colors.error};
  border: 1px solid ${({ theme, $type }) =>
    $type === 'success' ? `${theme.colors.success}44` : `${theme.colors.error}44`};
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: ${({ theme }) => theme.colors.textAlt};
`;

function SettingsPage() {
  const { refetchAuth } = useAuth();
  const { data: authStatus, isLoading, error } = useAuthStatusQuery();
  const saveApiKey = useSaveApiKeyMutation();
  const removeApiKey = useRemoveApiKeyMutation();

  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isConnected = authStatus?.providers?.openrouter?.connected ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    try {
      await saveApiKey.mutateAsync(apiKey.trim());
      setApiKey('');
      setMessage({ type: 'success', text: 'API key saved successfully!' });
      refetchAuth();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save API key. Please try again.' });
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove your API key?')) return;

    try {
      await removeApiKey.mutateAsync();
      setMessage({ type: 'success', text: 'API key removed successfully.' });
      refetchAuth();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove API key. Please try again.' });
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingSpinner>Loading settings...</LoadingSpinner>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert $type="error">Failed to load settings. Please try refreshing the page.</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageTitle>Settings</PageTitle>

      {message && (
        <Alert $type={message.type}>{message.text}</Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>API Providers</CardTitle>
        </CardHeader>
        <CardBody>
          <ProviderSection>
            <ProviderHeader>
              <ProviderName>OpenRouter</ProviderName>
              <StatusBadge $connected={isConnected}>
                <StatusDot $connected={isConnected} />
                {isConnected ? 'Connected' : 'Not Connected'}
              </StatusBadge>
            </ProviderHeader>

            <Form onSubmit={handleSubmit}>
              <InputGroup>
                <Input
                  type="password"
                  placeholder={isConnected ? '••••••••••••••••' : 'Enter your OpenRouter API key'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <Button type="submit" disabled={!apiKey.trim() || saveApiKey.isPending}>
                  {saveApiKey.isPending ? 'Saving...' : isConnected ? 'Update' : 'Save'}
                </Button>
                {isConnected && (
                  <Button
                    type="button"
                    $variant="danger"
                    onClick={handleRemove}
                    disabled={removeApiKey.isPending}
                  >
                    {removeApiKey.isPending ? 'Removing...' : 'Remove'}
                  </Button>
                )}
              </InputGroup>
              <HelpText>
                Get your API key from{' '}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
                  openrouter.ai/keys
                </a>
              </HelpText>
            </Form>
          </ProviderSection>
        </CardBody>
      </Card>
    </PageContainer>
  );
}

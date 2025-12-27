import { useState, useEffect } from 'react';
import styled from 'styled-components';
import type { Agent, CustomAgent } from '../../api/types';
import { apiClient } from '../../api/client';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (agentId: string, initialMessage?: string) => void;
  isCreating?: boolean;
}

const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.shade};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const CloseButton = styled.button`
  padding: 0.375rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textAlt};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  transition: all 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.shade};
    color: ${({ theme }) => theme.colors.text};
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Body = styled.div`
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 0.5rem;
`;

const AgentGrid = styled.div`
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
`;

const AgentOption = styled.button<{ $selected: boolean }>`
  width: 100%;
  padding: 0.875rem;
  background: ${({ theme, $selected }) =>
    $selected ? `${theme.colors.primary}15` : theme.colors.background};
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.primary : theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const AgentName = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 0.25rem;
`;

const AgentDescription = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textAlt};
`;

const AgentMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
  margin-top: 0.375rem;
  font-family: 'JetBrains Mono', monospace;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  color: ${({ theme }) => theme.colors.text};
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 1.5;
  resize: vertical;
  min-height: 80px;

  &::placeholder {
    color: ${({ theme }) => theme.colors.placeholder};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Footer = styled.div`
  padding: 1rem 1.25rem;
  border-top: 1px solid ${({ theme }) => theme.colors.shade};
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.625rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.875rem;
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
  text-align: center;
  padding: 2rem;
  color: ${({ theme }) => theme.colors.textAlt};
`;

const ErrorState = styled.div`
  padding: 0.75rem;
  background: ${({ theme }) => `${theme.colors.error}22`};
  border: 1px solid ${({ theme }) => `${theme.colors.error}44`};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.875rem;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textAlt};
  margin: 1rem 0 0.5rem;

  &:first-child {
    margin-top: 0;
  }
`;

interface AllAgents {
  builtin: Agent[];
  custom: CustomAgent[];
}

export function NewConversationModal({
  isOpen,
  onClose,
  onCreate,
  isCreating,
}: NewConversationModalProps) {
  const [agents, setAgents] = useState<AllAgents>({ builtin: [], custom: [] });
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [initialMessage, setInitialMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  const fetchAgents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ data: AllAgents }>('/api/agents');
      setAgents(response.data.data);
      // Select first agent by default
      const allAgents = [...response.data.data.builtin, ...response.data.data.custom];
      if (allAgents.length > 0 && !selectedAgent) {
        setSelectedAgent(allAgents[0].id);
      }
    } catch (err) {
      setError('Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (selectedAgent) {
      onCreate(selectedAgent, initialMessage || undefined);
    }
  };

  const handleClose = () => {
    setSelectedAgent('');
    setInitialMessage('');
    setError(null);
    onClose();
  };

  return (
    <Overlay $open={isOpen} onClick={handleClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>New Conversation</Title>
          <CloseButton onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </CloseButton>
        </Header>

        <Body>
          {error && <ErrorState>{error}</ErrorState>}

          {isLoading ? (
            <LoadingState>Loading agents...</LoadingState>
          ) : (
            <>
              <Label>Select an Agent</Label>

              {agents.builtin.length > 0 && (
                <>
                  <SectionTitle>Built-in Agents</SectionTitle>
                  <AgentGrid>
                    {agents.builtin.map((agent) => (
                      <AgentOption
                        key={agent.id}
                        $selected={selectedAgent === agent.id}
                        onClick={() => setSelectedAgent(agent.id)}
                      >
                        <AgentName>{agent.name}</AgentName>
                        <AgentDescription>{agent.description}</AgentDescription>
                        <AgentMeta>{agent.model}</AgentMeta>
                      </AgentOption>
                    ))}
                  </AgentGrid>
                </>
              )}

              {agents.custom.length > 0 && (
                <>
                  <SectionTitle>Custom Agents</SectionTitle>
                  <AgentGrid>
                    {agents.custom.map((agent) => (
                      <AgentOption
                        key={agent.id}
                        $selected={selectedAgent === agent.id}
                        onClick={() => setSelectedAgent(agent.id)}
                      >
                        <AgentName>{agent.name}</AgentName>
                        <AgentDescription>{agent.description}</AgentDescription>
                        <AgentMeta>{agent.model}</AgentMeta>
                      </AgentOption>
                    ))}
                  </AgentGrid>
                </>
              )}

              <Label style={{ marginTop: '1rem' }}>Initial Message (optional)</Label>
              <TextArea
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Type your first message..."
              />
            </>
          )}
        </Body>

        <Footer>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            $variant="primary"
            onClick={handleSubmit}
            disabled={!selectedAgent || isCreating}
          >
            {isCreating ? 'Creating...' : 'Start Conversation'}
          </Button>
        </Footer>
      </Modal>
    </Overlay>
  );
}

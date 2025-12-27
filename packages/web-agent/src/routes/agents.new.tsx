import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import styled from 'styled-components';
import {
  useAvailableModelsQuery,
  useAvailableToolsQuery,
  useAvailableKnowledgeBasesQuery,
  useCreateCustomAgentMutation,
} from '../queries/agents';

export const Route = createFileRoute('/agents/new')({
  component: NewAgentPage,
});

const PageContainer = styled.div`
  flex: 1;
  padding: 2rem;
  max-width: 800px;
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

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const RequiredMark = styled.span`
  color: ${({ theme }) => theme.colors.error};
  margin-left: 0.25rem;
`;

const HelpText = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
`;

const Input = styled.input`
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

const TextArea = styled.textarea`
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;

  &::placeholder {
    color: ${({ theme }) => theme.colors.textAlt};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const PromptTextArea = styled(TextArea)`
  min-height: 200px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
`;

const Select = styled.select`
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const CheckboxGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.5rem;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
`;

const CheckboxItem = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.shade};
  }

  input {
    margin-top: 0.125rem;
    cursor: pointer;
  }
`;

const CheckboxContent = styled.div`
  flex: 1;
`;

const CheckboxLabel = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text};
  font-family: 'JetBrains Mono', monospace;
`;

const CheckboxDescription = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
  margin-top: 0.125rem;
`;

const SliderGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Slider = styled.input`
  flex: 1;
  cursor: pointer;
`;

const SliderValue = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text};
  min-width: 3rem;
  text-align: right;
`;

const FormActions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
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
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: ${({ theme }) => `${theme.colors.error}22`};
  border: 1px solid ${({ theme }) => `${theme.colors.error}44`};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.875rem;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: ${({ theme }) => theme.colors.textAlt};
`;

function NewAgentPage() {
  const navigate = useNavigate();

  const { data: models, isLoading: modelsLoading } = useAvailableModelsQuery();
  const { data: tools, isLoading: toolsLoading } = useAvailableToolsQuery();
  const { data: knowledgeBases, isLoading: kbLoading } = useAvailableKnowledgeBasesQuery();
  const createAgent = useCreateCustomAgentMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedKBs, setSelectedKBs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isLoading = modelsLoading || toolsLoading || kbLoading;

  const handleToolToggle = (toolName: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolName)
        ? prev.filter((t) => t !== toolName)
        : [...prev, toolName]
    );
  };

  const handleKBToggle = (kbId: string) => {
    setSelectedKBs((prev) =>
      prev.includes(kbId)
        ? prev.filter((k) => k !== kbId)
        : [...prev, kbId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!model) {
      setError('Model is required');
      return;
    }
    if (!systemPrompt.trim()) {
      setError('System prompt is required');
      return;
    }

    try {
      const agent = await createAgent.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        model,
        systemPrompt: systemPrompt.trim(),
        temperature,
        maxTokens,
        tools: selectedTools,
        knowledgeBases: selectedKBs,
      });
      navigate({ to: `/agents/${encodeURIComponent(`custom:${agent.id}`)}` });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState>Loading...</LoadingState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackLink to="/agents">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Agents
      </BackLink>

      <PageTitle>Create Custom Agent</PageTitle>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>
            Name<RequiredMark>*</RequiredMark>
          </Label>
          <Input
            type="text"
            placeholder="My Custom Agent"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormGroup>

        <FormGroup>
          <Label>Description</Label>
          <TextArea
            placeholder="Describe what this agent does..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormGroup>

        <FormGroup>
          <Label>
            Model<RequiredMark>*</RequiredMark>
          </Label>
          <Select value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="">Select a model...</option>
            {models?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.provider})
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>
            System Prompt<RequiredMark>*</RequiredMark>
          </Label>
          <HelpText>
            Instructions that define how the agent behaves
          </HelpText>
          <PromptTextArea
            placeholder="You are a helpful assistant that..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
          />
        </FormGroup>

        <FormGroup>
          <Label>Temperature</Label>
          <HelpText>
            Controls randomness. Lower values are more focused, higher values are more creative.
          </HelpText>
          <SliderGroup>
            <Slider
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
            />
            <SliderValue>{temperature.toFixed(1)}</SliderValue>
          </SliderGroup>
        </FormGroup>

        <FormGroup>
          <Label>Max Tokens</Label>
          <HelpText>
            Maximum length of the response
          </HelpText>
          <Input
            type="number"
            min="256"
            max="32768"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
          />
        </FormGroup>

        <FormGroup>
          <Label>Tools ({selectedTools.length} selected)</Label>
          <HelpText>
            Select tools the agent can use
          </HelpText>
          <CheckboxGrid>
            {tools?.map((tool) => (
              <CheckboxItem key={tool.name}>
                <input
                  type="checkbox"
                  checked={selectedTools.includes(tool.name)}
                  onChange={() => handleToolToggle(tool.name)}
                />
                <CheckboxContent>
                  <CheckboxLabel>{tool.name}</CheckboxLabel>
                  <CheckboxDescription>{tool.description}</CheckboxDescription>
                </CheckboxContent>
              </CheckboxItem>
            ))}
          </CheckboxGrid>
        </FormGroup>

        <FormGroup>
          <Label>Knowledge Bases ({selectedKBs.length} selected)</Label>
          <HelpText>
            Select knowledge bases to enhance the agent with domain knowledge
          </HelpText>
          <CheckboxGrid>
            {knowledgeBases?.map((kb) => (
              <CheckboxItem key={kb.id}>
                <input
                  type="checkbox"
                  checked={selectedKBs.includes(kb.id)}
                  onChange={() => handleKBToggle(kb.id)}
                />
                <CheckboxContent>
                  <CheckboxLabel>{kb.name}</CheckboxLabel>
                  <CheckboxDescription>{kb.description}</CheckboxDescription>
                </CheckboxContent>
              </CheckboxItem>
            ))}
          </CheckboxGrid>
        </FormGroup>

        <FormActions>
          <Button type="submit" $variant="primary" disabled={createAgent.isPending}>
            {createAgent.isPending ? 'Creating...' : 'Create Agent'}
          </Button>
          <Button type="button" onClick={() => navigate({ to: '/agents' })}>
            Cancel
          </Button>
        </FormActions>
      </Form>
    </PageContainer>
  );
}

import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const Container = styled.form`
  padding: 1rem;
  border-top: 1px solid ${({ theme }) => theme.colors.shade};
  background: ${({ theme }) => theme.colors.backgroundAlt};
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  padding: 0.75rem;
  transition: border-color 0.15s ease;

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const TextArea = styled.textarea`
  flex: 1;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text};
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 1.5;
  resize: none;
  min-height: 24px;
  max-height: 200px;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.placeholder};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.primaryShade};
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const HelpText = styled.div`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textAlt};
  margin-top: 0.5rem;
  text-align: center;
`;

export function ChatInput({ onSend, disabled, placeholder = 'Type a message...' }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Container onSubmit={handleSubmit}>
      <InputWrapper>
        <TextArea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
        />
        <SendButton type="submit" disabled={disabled || !value.trim()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </SendButton>
      </InputWrapper>
      <HelpText>Press Enter to send, Shift+Enter for new line</HelpText>
    </Container>
  );
}

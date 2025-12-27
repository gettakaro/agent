import { Link } from '@tanstack/react-router';
import styled from 'styled-components';
import { useAuth } from '../../hooks/useAuth';

const Banner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.colors.warning}22;
  border-bottom: 1px solid ${({ theme }) => theme.colors.warning}44;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.warning};
`;

const WarningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const SettingsLink = styled(Link)`
  color: ${({ theme }) => theme.colors.warning};
  font-weight: 500;
  text-decoration: underline;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

export function SetupBanner() {
  const { hasOpenRouter, isLoading } = useAuth();

  if (isLoading || hasOpenRouter) {
    return null;
  }

  return (
    <Banner>
      <WarningIcon />
      <span>
        OpenRouter API key not configured.{' '}
        <SettingsLink to="/settings">Go to Settings</SettingsLink> to add your API key.
      </span>
    </Banner>
  );
}

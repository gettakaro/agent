import { Link, useLocation } from '@tanstack/react-router';
import styled from 'styled-components';
import { useAuth } from '../../hooks/useAuth';

const Nav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 56px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border-bottom: 1px solid ${({ theme }) => theme.colors.shade};
`;

const NavLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

const Logo = styled(Link)`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  &:hover {
    text-decoration: none;
  }
`;

const NavLinks = styled.div`
  display: flex;
  gap: 0.5rem;

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLink = styled(Link)<{ $active?: boolean }>`
  padding: 0.5rem 0.75rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  color: ${({ theme, $active }) => ($active ? theme.colors.text : theme.colors.textAlt)};
  background: ${({ theme, $active }) => ($active ? theme.colors.backgroundAccent : 'transparent')};
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.backgroundAccent};
    text-decoration: none;
  }
`;

const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const UserBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: ${({ theme }) => theme.colors.backgroundAccent};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textAlt};

  @media (max-width: 640px) {
    display: none;
  }
`;

const UserAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
`;

export function Navbar() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + '/');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Nav>
      <NavLeft>
        <Logo to="/">Takaro Agent</Logo>
        <NavLinks>
          <NavLink to="/conversations" $active={isActive('/conversations')}>
            Conversations
          </NavLink>
          <NavLink to="/agents" $active={isActive('/agents')}>
            Agents
          </NavLink>
          <NavLink to="/knowledge" $active={isActive('/knowledge')}>
            Knowledge
          </NavLink>
        </NavLinks>
      </NavLeft>

      <NavRight>
        {user && (
          <UserBadge>
            <UserAvatar>{getInitials(user.name || user.email)}</UserAvatar>
            <span>{user.name || user.email}</span>
          </UserBadge>
        )}
      </NavRight>
    </Nav>
  );
}

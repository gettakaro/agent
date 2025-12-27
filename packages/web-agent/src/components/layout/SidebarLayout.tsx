import { ReactNode, useState } from 'react';
import styled from 'styled-components';

const LayoutContainer = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const Sidebar = styled.aside<{ $isOpen: boolean }>`
  width: 280px;
  min-width: 280px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border-right: 1px solid ${({ theme }) => theme.colors.shade};
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 768px) {
    position: fixed;
    top: 56px;
    left: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(${({ $isOpen }) => ($isOpen ? '0' : '-100%')});
    transition: transform 0.2s ease;
  }
`;

const SidebarOverlay = styled.div<{ $isOpen: boolean }>`
  display: none;

  @media (max-width: 768px) {
    display: ${({ $isOpen }) => ($isOpen ? 'block' : 'none')};
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
  }
`;

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
`;

const MobileToggle = styled.button`
  display: none;
  position: fixed;
  bottom: 1rem;
  left: 1rem;
  z-index: 98;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  box-shadow: ${({ theme }) => theme.elevation[2]};
  cursor: pointer;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

interface SidebarLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function SidebarLayout({ sidebar, children }: SidebarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <LayoutContainer>
      <SidebarOverlay $isOpen={sidebarOpen} onClick={closeSidebar} />
      <Sidebar $isOpen={sidebarOpen}>{sidebar}</Sidebar>
      <MainContent>{children}</MainContent>
      <MobileToggle onClick={toggleSidebar}>
        <MenuIcon />
      </MobileToggle>
    </LayoutContainer>
  );
}

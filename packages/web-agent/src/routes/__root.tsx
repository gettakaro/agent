import { createRootRoute, Outlet } from '@tanstack/react-router';
import styled from 'styled-components';
import { Navbar, SetupBanner } from '../components/layout';

const AppContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
`;

const MainArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <AppContainer>
      <Navbar />
      <SetupBanner />
      <MainArea>
        <Outlet />
      </MainArea>
    </AppContainer>
  );
}

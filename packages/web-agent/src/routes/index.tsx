import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: IndexComponent,
});

function IndexComponent() {
  // Redirect to conversations page by default
  return <Navigate to="/conversations" />;
}

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';
import type { User } from '../api/types';

interface AuthStatus {
  providers: {
    openrouter: { connected: boolean };
  };
  hasAnyProvider: boolean;
}

interface AuthState {
  user: User | null;
  hasOpenRouter: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  refetchAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    hasOpenRouter: false,
    isLoading: true,
    error: null,
  });

  const fetchAuth = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Fetch user info and auth status in parallel
      const [userResponse, statusResponse] = await Promise.all([
        apiClient.get<{ data: User }>('/auth/me'),
        apiClient.get<AuthStatus>('/auth/status'),
      ]);

      const user = userResponse.data?.data ?? null;
      const hasOpenRouter = statusResponse.data?.providers?.openrouter?.connected ?? false;

      setState({
        user,
        hasOpenRouter,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState({
        user: null,
        hasOpenRouter: false,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch auth state',
      });
    }
  };

  useEffect(() => {
    fetchAuth();
  }, []);

  const value: AuthContextValue = {
    ...state,
    refetchAuth: fetchAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

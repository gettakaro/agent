import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';
import type { User } from '../api/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthState | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchAuth = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const userResponse = await apiClient.get<{ data: User }>('/auth/me');
        const user = userResponse.data?.data ?? null;

        setState({
          user,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setState({
          user: null,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch auth state',
        });
      }
    };

    fetchAuth();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

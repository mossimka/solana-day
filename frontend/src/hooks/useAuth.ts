import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';

export interface UseAuthReturn {
  isAuthenticated: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { isAuthenticated, token } = useAuthStore();

  const login = async (username: string, password: string): Promise<void> => {
    await authService.login({ username, password });
  };

  const register = async (username: string, password: string): Promise<void> => {
    await authService.register({ username, password });
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
  };

  return {
    isAuthenticated,
    token,
    login,
    register,
    logout,
  };
}

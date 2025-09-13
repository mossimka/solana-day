import { useUserStore } from '@/stores/userStore';
import { User } from '@/stores/userStore.interfaces';

export interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  nickname: string | null;
  userId: number | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  clearUser: () => void;
  isLoggedIn: boolean;
}

export function useUser(): UseUserReturn {
  const { user, isLoading, setUser, setLoading, clearUser } = useUserStore();

  return {
    user,
    isLoading,
    nickname: user?.username || null,
    userId: user?.id || null,
    setUser,
    setLoading,
    clearUser,
    isLoggedIn: !!user,
  };
}

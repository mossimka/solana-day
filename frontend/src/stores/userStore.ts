import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserState } from './userStore.interfaces';

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,

      setUser: (user: User | null) => {
        set({ user });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      clearUser: () => {
        set({ user: null, isLoading: false });
      },
    }),
    {
      name: 'user-storage',
      // Only persist user data, not loading state
      partialize: (state) => ({ user: state.user }),
    }
  )
);

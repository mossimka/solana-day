import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState } from './interfaces';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,

      login: (token: string) => {
        set({ isAuthenticated: true, token });
      },

      logout: () => {
        set({ isAuthenticated: false, token: null });
      },
    }),
    {
      name: 'auth',
      // Only persist isAuthenticated, not the token (token comes from httpOnly cookies)
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    }
  )
);

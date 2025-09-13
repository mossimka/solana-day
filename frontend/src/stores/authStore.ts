import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState } from './interfaces';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null, // This will no longer store the actual token

      login: () => {
        // We don't store the actual token anymore, just the auth state
        set({ isAuthenticated: true, token: null });
      },

      logout: () => {
        set({ isAuthenticated: false, token: null });
      },
    }),
    {
      name: 'auth',
      // Only persist isAuthenticated state, tokens are in httpOnly cookies
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);

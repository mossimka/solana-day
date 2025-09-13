import { useAuthStore } from '@/stores/authStore';
import axios from '@/lib/axios';

class TokenService {
  getAccessToken(): string | null {
    // Tokens are now in httpOnly cookies, so we can't access them from JS
    // We'll rely on the server to include them automatically
    return null;
  }

  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  }

  getAuthHeader(): Record<string, never> {
    // No need for Authorization header since tokens are in httpOnly cookies
    return {};
  }

  async initializeAuth(): Promise<boolean> {
    try {
      // Try to refresh the token using httpOnly cookies
      // This will validate if we have valid cookies
      try {
        const response = await axios.post('/auth/refresh', null, { 
          withCredentials: true 
        });
        
        if (response.status === 200) {
          useAuthStore.getState().login();
          return true;
        }
        return false;
      } catch (refreshError) {
        // If refresh fails, user is not authenticated
        console.error('Token refresh failed:', refreshError);
        useAuthStore.getState().logout();
        return false;
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      useAuthStore.getState().logout();
      return false;
    }
  }

  requireAuth(): string {
    if (!this.isAuthenticated()) {
      throw new Error("User is not authenticated");
    }
    // Return empty string since we don't have access to the actual token
    return "";
  }

  async refreshAccessToken(): Promise<string> {
    try {
      const response = await axios.post('/auth/refresh', null, { 
        withCredentials: true 
      });
      
      if (response.status === 200) {
        useAuthStore.getState().login();
        return "refreshed"; // Can't return actual token
      }
      throw new Error("Refresh failed");
    } catch {
      useAuthStore.getState().logout();
      throw new Error("Failed to refresh access token");
    }
  }

  // Helper method to check auth status (since we can't check token expiry)
  isTokenExpired(): boolean {
    // We can't check token expiry from client side with httpOnly cookies
    // Let the server handle expiry and return 401 when needed
    return false;
  }
}

export const tokenService = new TokenService();

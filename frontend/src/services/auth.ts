import { IAuthCredentials, ILoginResponse, IRegisterResponse } from "@/interfaces/IAuth";
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import axios from '@/lib/axios';
import { tokenService } from './tokenService';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message: string;
}

interface AuthenticatedFetchOptions {
  method?: 'get' | 'post' | 'put' | 'delete';
  data?: unknown;
  headers?: Record<string, string>;
  _retry?: boolean;
}

// Auth Service Class
export class AuthService {
  private static instance: AuthService;

  private constructor() {
    // Initialize auth state from cookies on app start
    this.initializeAuth();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Initialize authentication state
  private async initializeAuth(): Promise<void> {
    try {
      await tokenService.initializeAuth();
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }

  // Register new user
  async register(credentials: IAuthCredentials): Promise<IRegisterResponse> {
    try {
      const response = await axios.post('/auth/register', credentials);
      return response.data;
    } catch (error: unknown) {
      console.error("Registration error:", error);
      const apiError = error as ApiError;
      const message = apiError.response?.data?.message || apiError.message || "Registration failed";
      throw new Error(message);
    }
  }

  // Login user
  async login(credentials: IAuthCredentials): Promise<ILoginResponse> {
    try {
      const response = await axios.post('/auth/login', credentials, {
        withCredentials: true // Ensure cookies are handled
      });
      
      const data = response.data;
      
      // Store authentication state (tokens are in httpOnly cookies)
      useAuthStore.getState().login();
      
      // Store user information in user store
      useUserStore.getState().setUser(data.user);
      
      return data;
    } catch (error: unknown) {
      console.error("Login error:", error);
      const apiError = error as ApiError;
      const message = apiError.response?.data?.message || apiError.message || "Login failed";
      throw new Error(message);
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      // Call logout endpoint to clear httpOnly cookies
      await axios.post('/auth/logout', null, {
        withCredentials: true
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with local logout even if server request fails
    } finally {
      // Clear local auth state
      useAuthStore.getState().logout();
      // Clear user data
      useUserStore.getState().clearUser();
    }
  }

  // Get current token
  getToken(): string | null {
    // Tokens are in httpOnly cookies, not accessible from JS
    return null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return tokenService.isAuthenticated();
  }

  // Get authenticated headers for API calls
  getAuthHeaders(): Record<string, string> {
    // No need for Authorization header, cookies are sent automatically
    return {
      "Content-Type": "application/json",
    };
  }

  // Make authenticated API call using axios
  async authenticatedFetch(endpoint: string, options: AuthenticatedFetchOptions = {}): Promise<unknown> {
    try {
      // Check if user is authenticated
      if (!this.isAuthenticated()) {
        throw new Error("User is not authenticated");
      }
      
      const config = {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
        withCredentials: true, // Always send cookies
      };

      let response;
      const method = options.method?.toLowerCase() || 'get';
      
      switch (method) {
        case 'post':
          response = await axios.post(endpoint, options.data, config);
          break;
        case 'put':
          response = await axios.put(endpoint, options.data, config);
          break;
        case 'delete':
          response = await axios.delete(endpoint, config);
          break;
        default:
          response = await axios.get(endpoint, config);
      }

      return response.data;
    } catch (error: unknown) {
      // If unauthorized, try to refresh token once
      const apiError = error as ApiError;
      if (apiError.response?.status === 401 && !options._retry) {
        try {
          await tokenService.refreshAccessToken();
          // Retry the request once with refreshed cookies
          return this.authenticatedFetch(endpoint, { ...options, _retry: true });
        } catch {
          // If refresh fails, clear auth state
          useAuthStore.getState().logout();
          throw new Error("Authentication expired. Please login again.");
        }
      }
      throw error;
    }
  }

  // Refresh token (if your backend supports it)
  async refreshToken(): Promise<boolean> {
    return await tokenService.initializeAuth();
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
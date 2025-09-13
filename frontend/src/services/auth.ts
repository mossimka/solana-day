import { IAuthCredentials, ILoginResponse, IRegisterResponse } from "@/interfaces/IAuth";
import { useAuthStore } from '@/stores/authStore';
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
      
      // Store token in Zustand store
      useAuthStore.getState().login(data.accessToken);
      
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
    }
  }

  // Get current token
  getToken(): string | null {
    return tokenService.getAccessToken();
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return tokenService.isAuthenticated();
  }

  // Get authenticated headers for API calls
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const authHeader = tokenService.getAuthHeader();
    return { ...headers, ...authHeader };
  }

  // Make authenticated API call using axios
  async authenticatedFetch(endpoint: string, options: AuthenticatedFetchOptions = {}): Promise<unknown> {
    try {
      // This will throw if not authenticated
      tokenService.requireAuth();
      
      const config = {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
        withCredentials: true,
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
      // If unauthorized, clear auth state
      const apiError = error as ApiError;
      if (apiError.response?.status === 401) {
        useAuthStore.getState().logout();
        throw new Error("Authentication expired. Please login again.");
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
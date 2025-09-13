import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // This enables cookies to be sent with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth header if token is available
axiosInstance.interceptors.request.use(
  (config) => {
    // Token will be handled by cookies, but you can add additional headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - could trigger logout or refresh token
      console.error('Unauthorized request:', error);
      // Don't auto-logout here, let the service handle it
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

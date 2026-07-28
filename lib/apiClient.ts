// lib/apiClient.ts
// Clean API Client - Uses session for auth (no query params)

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface ApiOptions {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
}

// API Response type - any extra fields allowed
interface ApiResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
  stats?: any;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  [key: string]: any; // Allow any additional properties
}

// Main API function - ye har jagah use hoga
export async function apiClient(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse> {
  const { method = 'GET', body, headers = {} } = options;

  // Build URL - NO userRole/userEmail params (backend uses session)
  let url: string;
  
  if (typeof window !== 'undefined') {
    url = endpoint.startsWith('http')
      ? endpoint
      : `${window.location.origin}${endpoint}`;
  } else {
    // Server-side fallback
    url = endpoint;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials: 'include', // Important: session cookies bhejne ke liye
      ...(body && { body: JSON.stringify(body) }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Request failed',
        error: data.error,
      };
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
}

// Shortcut functions - easy to use
export const api = {
  get: (endpoint: string) => 
    apiClient(endpoint, { method: 'GET' }),

  post: (endpoint: string, body: any) => 
    apiClient(endpoint, { method: 'POST', body }),

  patch: (endpoint: string, body: any) => 
    apiClient(endpoint, { method: 'PATCH', body }),

  put: (endpoint: string, body: any) => 
    apiClient(endpoint, { method: 'PUT', body }),

  delete: (endpoint: string) => 
    apiClient(endpoint, { method: 'DELETE' }),
};

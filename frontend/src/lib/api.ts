// ============================================
// MELO SPORTT - API CLIENT
// ============================================
// Connects to the Node.js backend on Railway

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  count?: number;
}

export interface UploadResult {
  public_id: string;
  url: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from localStorage on init
    this.token = localStorage.getItem('melo_sportt_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('melo_sportt_token', token);
    } else {
      localStorage.removeItem('melo_sportt_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token inválido/expirado: limpiar credenciales para evitar bucles de 401
          this.setToken(null);
          localStorage.removeItem('melo-sportt-auth');
          // Notificar a la app para que cierre sesión (evita estado "logueado" sin token)
          window.dispatchEvent(new CustomEvent('melo:unauthorized'));
        }

        // Intentar dar un mensaje más útil (especialmente para errores de validación)
        const baseMessage = data?.error || data?.message || 'Request failed';
        const detailsMessage = Array.isArray(data?.details)
          ? data.details
              .map((d: any) => {
                const path = Array.isArray(d?.path) ? d.path.join('.') : undefined;
                const msg = d?.message;
                return path && msg ? `${path}: ${msg}` : msg || path;
              })
              .filter(Boolean)
              .join(', ')
          : '';

        throw new Error(detailsMessage ? `${baseMessage} (${detailsMessage})` : baseMessage);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const searchParams = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<T>(`${endpoint}${searchParams}`);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Upload methods for file handling
  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, string>): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const formData = new FormData();
    formData.append('image', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    // Releer el token desde localStorage para evitar desincronización
    // (por ejemplo, si el token se actualizó después de instanciar el ApiClient).
    const token = localStorage.getItem('melo_sportt_token');

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.setToken(null);
          localStorage.removeItem('melo-sportt-auth');
          window.dispatchEvent(new CustomEvent('melo:unauthorized'));
        }
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  async uploadFiles<T>(endpoint: string, files: File[], additionalData?: Record<string, string>): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('images', file);
    });

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    // Releer el token desde localStorage para evitar desincronización
    // (por ejemplo, si el token se actualizó después de instanciar el ApiClient).
    const token = localStorage.getItem('melo_sportt_token');

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.setToken(null);
          localStorage.removeItem('melo-sportt-auth');
          window.dispatchEvent(new CustomEvent('melo:unauthorized'));
        }
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }
}

export const api = new ApiClient(API_URL);
export const apiClient = api;
export default api;

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  user: {
    id: string;
    email: string;
    name: string;
    username: string;
    groups: string[];
  };
}

interface TokenResponse {
  token: string;
  server_url: string;
  room_name: string;
  identity: string;
  name: string;
}

interface RoomTokenRequest {
  room_name: string;
  identity?: string;
  name?: string;
  can_publish?: boolean;
  can_subscribe?: boolean;
  can_record?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080') {
    this.baseUrl = baseUrl;
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
    }
  }

  private saveTokenToStorage(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
      this.accessToken = token;
    }
  }

  private removeTokenFromStorage() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      this.accessToken = null;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry the request with new token
        headers.Authorization = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(url, {
          ...options,
          headers,
        });
        
        if (!retryResponse.ok) {
          throw new Error(`HTTP error! status: ${retryResponse.status}`);
        }
        
        return retryResponse.json();
      } else {
        // Redirect to login
        this.redirectToLogin();
        throw new Error('Authentication required');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Authentication methods
  async login(): Promise<void> {
    window.location.href = `${this.baseUrl}/auth/login`;
  }

  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const authData: AuthResponse = await response.json();
      this.saveTokenToStorage(authData.access_token);
      localStorage.setItem('refresh_token', authData.refresh_token);
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  logout() {
    this.removeTokenFromStorage();
    window.location.href = '/';
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getCurrentUser() {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  private redirectToLogin() {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // LiveKit API methods
  async generateRoomToken(request: RoomTokenRequest): Promise<TokenResponse> {
    return this.makeRequest<TokenResponse>(`/api/rooms/${request.room_name}/token`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getRoomParticipants(roomName: string) {
    return this.makeRequest(`/api/rooms/${roomName}/participants`);
  }

  async removeParticipant(roomName: string, participantId: string) {
    return this.makeRequest(`/api/rooms/${roomName}/participants/${participantId}`, {
      method: 'DELETE',
    });
  }

  async startRecording(roomName: string) {
    return this.makeRequest(`/api/rooms/${roomName}/recording/start`, {
      method: 'POST',
    });
  }

  async stopRecording(roomName: string) {
    return this.makeRequest(`/api/rooms/${roomName}/recording/stop`, {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;

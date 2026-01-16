const BASE_URL: string = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:8080';

export async function requestOTP(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.detail || 'Failed to send OTP' };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

export async function verifyOTP(email: string, code: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Backend expects the OTP field to be named `otpCode` (see validation errors)
      // Example required body: { email: string, otpCode: string }
      body: JSON.stringify({ email, otpCode: code }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.detail || 'Invalid OTP' };
    }
    
    const data = await response.json();

    // The backend may return the token under different keys depending on version:
    // - accessToken (camelCase)
    // - access_token (snake_case)
    // Normalize and persist to localStorage so subsequent calls can reuse it.
    const token = data.accessToken ?? data.access_token ?? data.access_token_hack ?? data.token ?? null;
    if (token) {
      try {
        localStorage.setItem('access_token', token);
      } catch (e) {
        // Ignore localStorage failures (e.g. disabled storage) but still return the token
      }
    }

    return { success: true, token: token ?? undefined };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

// Helpers to read/clear the token stored in localStorage. Use these in the app when
// you need to check authentication state.
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('access_token');
  } catch (e) {
    return null;
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem('access_token');
  } catch (e) {
    // ignore
  }
}

export async function fetchAdminData<T>(endpoint: string, token?: string): Promise<{ data?: T; error?: string }> {
  try {
    const useToken = token ?? getStoredToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (useToken) headers['Authorization'] = `Bearer ${useToken}`;

    const response = await fetch(`${BASE_URL}${endpoint}`, { headers });
    
    if (!response.ok) {
      if (response.status === 401) {
        return { error: 'Unauthorized' };
      }
      const error = await response.json();
      return { error: error.detail || 'Failed to fetch data' };
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: 'Network error' };
  }
}

export async function updateAdminData<T>(endpoint: string, body: unknown, token?: string): Promise<{ data?: T; error?: string }> {
  try {
    const useToken = token ?? getStoredToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (useToken) headers['Authorization'] = `Bearer ${useToken}`;

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail || 'Failed to update' };
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: 'Network error' };
  }
}

export async function deleteAdminData(endpoint: string, token?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const useToken = token ?? getStoredToken();
    const headers: Record<string, string> = {};
    if (useToken) headers['Authorization'] = `Bearer ${useToken}`;

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.detail || 'Failed to delete' };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

export { BASE_URL };

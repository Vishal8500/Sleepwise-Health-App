// src/lib/apiClient.ts
import { supabase } from "@/integrations/supabase/client";

const API_URL = import.meta.env.VITE_API_BASE_URL;

// A helper to get the current user's JWT
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// A generic API client for making authenticated requests
export const apiClient = {
  async post<T>(endpoint: string, body: Record<string, any>): Promise<T> {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, token }), // Embed token in body for /predict, /log
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'API request failed');
    }
    return response.json() as Promise<T>;
  },

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Authentication token not found.");
    }

    const url = new URL(`${API_URL}${endpoint}`);
    url.searchParams.append('token', token); // Append token as query param for dashboard

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, String(value));
        });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'API request failed');
    }
    return response.json() as Promise<T>;
  }
};
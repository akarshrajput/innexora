import apiClient from './client';

export interface RegisterData {
  name: string;
  hotelName: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    hotelName: string;
  };
}

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/register', data);
  return response.data;
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', data);
  return response.data;
};

export const getCurrentUser = async (): Promise<AuthResponse['user']> => {
  const response = await apiClient.get<AuthResponse['user']>('/auth/me');
  return response.data;
};

export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    localStorage.removeItem('token');
    window.location.href = '/auth/login';
  }
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('token', token);
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

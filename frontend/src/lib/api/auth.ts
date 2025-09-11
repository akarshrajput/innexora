import { apiClient } from "../api";

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
  const response = await apiClient.post<any>("/auth/register", data);
  if (!response.success) {
    throw new Error(response.message || "Registration failed");
  }
  // Handle backend response format directly
  const responseData = response as any;
  if (responseData.token && responseData.user) {
    return {
      token: responseData.token,
      user: responseData.user,
    };
  }
  // Fallback for data wrapper format
  if (response.data) {
    return response.data;
  }
  throw new Error("Registration failed - invalid response format");
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await apiClient.post<any>("/auth/login", data);
  if (!response.success) {
    throw new Error(response.message || "Login failed");
  }
  // Handle backend response format directly
  const responseData = response as any;
  if (responseData.token && responseData.user) {
    return {
      token: responseData.token,
      user: responseData.user,
    };
  }
  // Fallback for data wrapper format
  if (response.data) {
    return response.data;
  }
  throw new Error("Login failed - invalid response format");
};

export const getMe = async (): Promise<{
  id: string;
  name: string;
  email: string;
  hotelName: string;
}> => {
  const response = await apiClient.get<any>("/auth/me");
  if (!response.success) {
    throw new Error(response.message || "Failed to get user info");
  }
  // Handle backend response format directly
  const responseData = response as any;
  if (responseData.id && responseData.email) {
    return responseData;
  }
  // Fallback for data wrapper format
  if (response.data) {
    return response.data;
  }
  throw new Error("Failed to get user info - invalid response format");
};

export const logout = async (): Promise<void> => {
  await apiClient.post("/auth/logout", {});
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("token");
};

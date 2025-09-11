import { create } from "zustand";
import { AuthResponse } from "@/lib/api/auth";
import { apiClient } from "@/lib/api";

interface AuthState {
  user: AuthResponse["user"] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean; // Add initialization flag
  setUser: (user: AuthResponse["user"] | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false, // Add initialization flag

  setUser: (user) => set({ user }),

  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

  logout: async () => {
    try {
      await apiClient.post("/auth/logout", {});
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      // Clear subdomain on logout
      if (typeof window !== "undefined") {
        localStorage.removeItem("current_subdomain");
      }
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: false,
      });
    }
  },

  initializeAuth: async () => {
    console.log("🔐 Frontend: initializeAuth called");

    // Check if already initialized
    if (get().isInitialized) {
      console.log("🔐 Frontend: Auth already initialized, skipping");
      return;
    }

    // Always try to initialize, don't skip based on current state
    // This ensures we check auth status on every page load
    set({ isLoading: true });

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("🔐 Frontend: No token found");
        set({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          isInitialized: true,
        });
        return;
      }

      console.log("🔐 Frontend: Verifying token with backend");
      const response = await apiClient.get("/auth/me");
      console.log("🔐 Frontend: Auth response received:", {
        success: response.success,
        hasData: !!response.data,
        message: response.message,
        error: response.error,
      });

      if (response.success && response.data) {
        console.log("🔐 Frontend: Auth successful, setting user");
        set({
          user: response.data as any,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        console.log("🔐 Frontend: Auth failed, clearing token");
        localStorage.removeItem("token");
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        });
      }
    } catch (error: any) {
      console.error("🔐 Frontend: Auth initialization error:", error);

      // Only clear auth if it's a real auth error, not a network error
      if (error?.status === 401 || error?.status === 403) {
        console.log("🔐 Frontend: Auth error, clearing token");
        localStorage.removeItem("token");
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        console.log("🔐 Frontend: Network error, keeping auth state");
        set({ isLoading: false, isInitialized: true });
      }
    }
  },
}));

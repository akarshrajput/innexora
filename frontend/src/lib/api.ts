interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private getBaseUrl(): string {
    if (typeof window === "undefined") {
      // Server-side rendering fallback
      return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";
    }

    const host = window.location.host;
    const protocol = window.location.protocol;

    console.log("🌐 API Client: Constructing URL for host:", host);

    // For tenant subdomains, construct URL with subdomain
    if (host.includes("localhost:3000") || host.includes("localhost:3001")) {
      // Extract subdomain from localhost:3000 format
      const hostParts = host.split(".");
      if (hostParts.length >= 2 && hostParts[0] !== "localhost") {
        const subdomain = hostParts[0];
        const baseUrl = `${protocol}//${subdomain}.localhost:3000/api`;
        console.log("🌐 API Client: Tenant URL constructed:", baseUrl);
        return baseUrl;
      }
    } else if (host.includes(".")) {
      // For production domains like subdomain.domain.com
      const hostParts = host.split(".");
      if (hostParts.length >= 3) {
        const subdomain = hostParts[0];
        if (subdomain !== "www" && subdomain !== "app") {
          const domain = hostParts.slice(1).join(".");
          const baseUrl = `${protocol}//${subdomain}.${domain}/api`;
          console.log(
            "🌐 API Client: Production tenant URL constructed:",
            baseUrl
          );
          return baseUrl;
        }
      }
    }

    // Fallback to main domain
    const baseUrl = `${protocol}//${host}/api`;
    console.log("🌐 API Client: Main domain URL constructed:", baseUrl);
    return baseUrl;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Get token from localStorage
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Add subdomain information for tenant requests
      const host = typeof window !== "undefined" ? window.location.host : "";

      if (!host) {
        console.log(
          "🌐 API Client: No host available (server-side or not initialized)"
        );
        return headers;
      }

      const hostParts = host.split(".");

      console.log("🌐 API Client: Full host analysis", {
        fullHost: host,
        hostParts: hostParts,
        hostPartsLength: hostParts.length,
        firstPart: hostParts[0],
        secondPart: hostParts[1],
        hasPort: host.includes(":"),
      });

      // Try to get subdomain from localStorage first (for consistency)
      let subdomain = null;
      if (typeof window !== "undefined") {
        subdomain = localStorage.getItem("current_subdomain");
      }

      // If not in localStorage, detect from host
      if (!subdomain) {
        if (hostParts.length >= 3) {
          // For subdomain.domain.com or subdomain.localhost:3000
          subdomain = hostParts[0];
          console.log("🌐 Case 1: 3+ parts detected, subdomain =", subdomain);
        } else if (hostParts.length === 2 && hostParts[1].includes(":")) {
          // For subdomain.localhost:3000
          subdomain = hostParts[0];
          console.log(
            "🌐 Case 2: 2 parts with port detected, subdomain =",
            subdomain
          );
        } else if (hostParts.length === 1 && host.includes(":")) {
          // For localhost:3000 format with subdomain prefix
          const fullHost = hostParts[0].split(":")[0];
          if (fullHost !== "localhost" && fullHost !== "127.0.0.1") {
            subdomain = fullHost;
            console.log(
              "🌐 Case 3: Single part with port detected, subdomain =",
              subdomain
            );
          } else {
            console.log(
              "🌐 Case 3: Single part is localhost/127.0.0.1, no subdomain"
            );
          }
        } else {
          console.log("🌐 No matching case found for subdomain detection");
        }

        // Store in localStorage for future requests
        if (subdomain && typeof window !== "undefined") {
          localStorage.setItem("current_subdomain", subdomain);
        }
      } else {
        console.log("🌐 Using cached subdomain from localStorage:", subdomain);
      }

      console.log("🌐 API Client: Final subdomain result =", subdomain);

      // Always set the tenant subdomain header if we detected one
      if (
        subdomain &&
        subdomain !== "www" &&
        subdomain !== "app" &&
        subdomain !== "localhost" &&
        subdomain !== "127.0.0.1"
      ) {
        headers["X-Tenant-Subdomain"] = subdomain;
        console.log("🌐 API Client: Added tenant header", subdomain);
      } else {
        console.log(
          "🌐 API Client: No tenant header added, subdomain =",
          subdomain
        );
      }
    }

    return headers;
  }

  // Function to clear stored subdomain (call on logout or subdomain change)
  clearSubdomain = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("current_subdomain");
    }
  };

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("Failed to parse response JSON:", parseError);
      throw new Error("Invalid server response");
    }

    if (response.status === 401) {
      // Handle authentication error
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        // Only redirect if not already on login page
        if (!window.location.pathname.includes("/auth/login")) {
          window.location.href = "/auth/login";
        }
      }
      return {
        success: false,
        message: data.message || "Authentication required",
        error: data.error,
      };
    }

    if (response.status === 503) {
      // Handle service unavailable (database issues)
      return {
        success: false,
        message: data.message || "Service temporarily unavailable",
        error: data.error,
      };
    }

    if (!response.ok) {
      // For client errors (4xx), return the error in the response format
      if (response.status >= 400 && response.status < 500) {
        return {
          success: false,
          message:
            data.message || `Request failed with status ${response.status}`,
          error: data.error,
        };
      }
      // For server errors (5xx), return error instead of throwing
      return {
        success: false,
        message: data.message || `Server error: ${response.status}`,
        error: data.error,
      };
    }

    // If the response already has the expected format, return it
    if (data.success !== undefined) {
      return data;
    }

    // Otherwise, wrap it in the expected format
    return {
      success: true,
      data: data,
    };
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const baseUrl = this.getBaseUrl();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(),
      credentials: "include",
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    const baseUrl = this.getBaseUrl();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    const baseUrl = this.getBaseUrl();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "PUT",
      headers: this.getHeaders(),
      credentials: "include",
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const baseUrl = this.getBaseUrl();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(),
      credentials: "include",
    });

    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient();

// Specific API functions for the dashboard
export const dashboardApi = {
  getRooms: () => apiClient.get("/rooms"),
  getGuests: () => apiClient.get("/guests"),
  getTickets: () => apiClient.get("/tickets"),
  getGuestStats: () => apiClient.get("/guests/stats"),
};

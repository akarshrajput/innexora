import axios, { AxiosInstance } from "axios";

const getBaseUrl = (): string => {
  if (typeof window === "undefined") {
    // Server-side rendering fallback
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";
  }

  const host = window.location.host;
  const protocol = window.location.protocol;

  console.log("🌐 Axios API Client: Constructing URL for host:", host);

  // For tenant subdomains, construct URL with subdomain
  if (host.includes("localhost:3000") || host.includes("localhost:3001")) {
    // Extract subdomain from localhost:3000 format
    const hostParts = host.split(".");
    if (hostParts.length >= 2 && hostParts[0] !== "localhost") {
      const subdomain = hostParts[0];
      const baseUrl = `${protocol}//${subdomain}.localhost:3000/api`;
      console.log("🌐 Axios API Client: Tenant URL constructed:", baseUrl);
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
          "🌐 Axios API Client: Production tenant URL constructed:",
          baseUrl
        );
        return baseUrl;
      }
    }
  }

  // Fallback to main domain
  const baseUrl = `${protocol}//${host}/api`;
  console.log("🌐 Axios API Client: Main domain URL constructed:", baseUrl);
  return baseUrl;
};

export const API_BASE_URL = getBaseUrl();

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include the auth token and tenant headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add subdomain information for tenant requests
    if (typeof window !== "undefined") {
      const host = window.location.host;
      const hostParts = host.split(".");

      console.log("🌐 Axios API Client: Full host analysis", {
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
          console.log(
            "🌐 Axios Case 1: 3+ parts detected, subdomain =",
            subdomain
          );
        } else if (hostParts.length === 2 && hostParts[1].includes(":")) {
          // For subdomain.localhost:3000
          subdomain = hostParts[0];
          console.log(
            "🌐 Axios Case 2: 2 parts with port detected, subdomain =",
            subdomain
          );
        } else if (hostParts.length === 1 && host.includes(":")) {
          // For localhost:3000 format with subdomain prefix
          const fullHost = hostParts[0].split(":")[0];
          if (fullHost !== "localhost" && fullHost !== "127.0.0.1") {
            subdomain = fullHost;
            console.log(
              "🌐 Axios Case 3: Single part with port detected, subdomain =",
              subdomain
            );
          } else {
            console.log(
              "🌐 Axios Case 3: Single part is localhost/127.0.0.1, no subdomain"
            );
          }
        } else {
          console.log(
            "🌐 Axios No matching case found for subdomain detection"
          );
        }

        // Store in localStorage for future requests
        if (subdomain && typeof window !== "undefined") {
          localStorage.setItem("current_subdomain", subdomain);
        }
      } else {
        console.log(
          "🌐 Axios Using cached subdomain from localStorage:",
          subdomain
        );
      }

      console.log("🌐 Axios API Client: Final subdomain result =", subdomain);

      // Always set the tenant subdomain header if we detected one
      if (
        subdomain &&
        subdomain !== "www" &&
        subdomain !== "app" &&
        subdomain !== "localhost" &&
        subdomain !== "127.0.0.1"
      ) {
        config.headers["X-Tenant-Subdomain"] = subdomain;
        console.log("🌐 Axios API Client: Added tenant header", subdomain);
      } else {
        console.log(
          "🌐 Axios API Client: No tenant header added, subdomain =",
          subdomain
        );
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    console.log("API Response:", {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error("API Error:", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem("token");
      window.location.href = "/auth/login";
    }

    // Return a more user-friendly error message
    if (error.response?.data?.message) {
      return Promise.reject(new Error(error.response.data.message));
    }

    return Promise.reject(error);
  }
);

export default apiClient;

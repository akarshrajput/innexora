import axios, { AxiosInstance } from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";

// Public API client for guest routes (no auth required)
export const guestApiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a response interceptor for logging, but no auth redirects
guestApiClient.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    console.log("Guest API Response:", {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error("Guest API Error:", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // Don't redirect on auth errors for guest routes
    // Just return the error to be handled by the component
    return Promise.reject(error);
  }
);

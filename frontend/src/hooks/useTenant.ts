"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";

interface HotelInfo {
  id: string;
  name: string;
  subdomain: string;
  website?: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  phone?: string;
  email?: string;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
  coordinates: {
    latitude?: number;
    longitude?: number;
  };
  timezone: string;
  currency: string;
  check_in_time: string;
  check_out_time: string;
  stars_rating: number;
  amenities: string[];
  policy: Record<string, string>;
  fullAddress: string;
  hotelUrl: string;
}

interface UseTenantReturn {
  isMainDomain: boolean;
  subdomain: string | null;
  hotel: HotelInfo | null;
  loading: boolean;
  error: string | null;
  refreshHotelInfo: () => Promise<void>;
}

export function useTenant(): UseTenantReturn {
  const [isMainDomain, setIsMainDomain] = useState(true);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [hotel, setHotel] = useState<HotelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detectSubdomain = () => {
    if (typeof window === "undefined") return null;

    const host = window.location.host;
    const hostParts = host.split(".");

    // Handle different host patterns
    if (hostParts.length >= 3) {
      // For subdomain.domain.com
      const potentialSubdomain = hostParts[0];
      if (potentialSubdomain !== "www" && potentialSubdomain !== "app") {
        return potentialSubdomain;
      }
    } else if (hostParts.length === 2 && hostParts[1].includes(":")) {
      // For subdomain.localhost:3000
      const potentialSubdomain = hostParts[0];
      if (potentialSubdomain !== "localhost" && potentialSubdomain !== "www") {
        return potentialSubdomain;
      }
    } else if (hostParts.length === 1 && host.includes(":")) {
      // For localhost:3000 format with subdomain prefix
      const fullHost = hostParts[0].split(":")[0];
      if (fullHost !== "localhost" && fullHost !== "127.0.0.1") {
        return fullHost;
      }
    }

    return null;
  };

  const fetchHotelInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const detectedSubdomain = detectSubdomain();
      console.log("🏨 useTenant: Detected subdomain:", detectedSubdomain);
      setSubdomain(detectedSubdomain);

      // Check if subdomain changed
      if (typeof window !== "undefined") {
        const storedSubdomain = localStorage.getItem("current_subdomain");
        if (storedSubdomain && storedSubdomain !== detectedSubdomain) {
          console.log("🏨 useTenant: Subdomain changed, clearing stored value");
          localStorage.removeItem("current_subdomain");
        }
      }

      if (!detectedSubdomain) {
        console.log("🏨 useTenant: No subdomain, setting as main domain");
        setIsMainDomain(true);
        setHotel(null);
        return;
      }

      console.log(
        "🏨 useTenant: Setting as tenant domain, fetching hotel info"
      );
      setIsMainDomain(false);

      console.log("🏨 useTenant: Making API call to /hotel/info");
      const response = await apiClient.get<HotelInfo>("/hotel/info");
      console.log("🏨 useTenant: Hotel info response:", {
        success: response.success,
        hasData: !!response.data,
        message: response.message,
        error: response.error,
      });

      if (response.success && response.data) {
        console.log("🏨 useTenant: Hotel info loaded:", response.data.name);
        setHotel(response.data);
      } else {
        console.error(
          "🏨 useTenant: Hotel info fetch failed:",
          response.message
        );
        setError(response.message || "Hotel not found or inactive");
        setHotel(null);
      }
    } catch (err: any) {
      console.error("🏨 useTenant: Error fetching hotel info:", err);
      setError(err.message || "Failed to load hotel information");
      setHotel(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshHotelInfo = async () => {
    await fetchHotelInfo();
  };

  useEffect(() => {
    fetchHotelInfo();
  }, []);

  return {
    isMainDomain,
    subdomain,
    hotel,
    loading,
    error,
    refreshHotelInfo,
  };
}

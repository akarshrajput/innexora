"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useTenant } from "@/hooks/useTenant";

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

interface TenantContextType {
  isMainDomain: boolean;
  subdomain: string | null;
  hotel: HotelInfo | null;
  loading: boolean;
  error: string | null;
  refreshHotelInfo: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const tenantData = useTenant();

  return (
    <TenantContext.Provider value={tenantData}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenantContext must be used within a TenantProvider");
  }
  return context;
}

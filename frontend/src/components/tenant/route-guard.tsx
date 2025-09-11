"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTenantContext } from "./tenant-provider";
import { useAuthStore } from "@/store/auth-store";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { isMainDomain, hotel, loading, error } = useTenantContext();
  const {
    isAuthenticated,
    isLoading: authLoading,
    isInitialized,
    initializeAuth,
  } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const init = async () => {
      // Initialize auth if not already done
      if (!isInitialized) {
        console.log("🔐 RouteGuard: Initializing auth");
        await initializeAuth();
      }
    };
    init();
  }, [isInitialized]); // Remove initializeAuth from dependencies

  useEffect(() => {
    // Wait for both tenant loading and auth initialization to complete
    if (loading || authLoading || !isInitialized) {
      console.log("🔐 RouteGuard: Waiting for initialization", {
        loading,
        authLoading,
        isInitialized,
        isAuthenticated,
      });
      return;
    }

    console.log("🔐 RouteGuard: Making routing decision", {
      pathname,
      isMainDomain,
      isAuthenticated,
      hasHotel: !!hotel,
      hasError: !!error,
    });

    // If there's an error loading hotel info and it's not the main domain
    if (error && !isMainDomain) {
      // Redirect to hotel not found page
      router.push("/hotel-not-found");
      return;
    }

    // Handle main domain routing
    if (isMainDomain) {
      // Allow access to main domain public routes
      const publicMainRoutes = ["/", "/about", "/contact", "/pricing"];
      const restrictedRoutes = ["/auth/login", "/auth/register", "/dashboard"];

      if (restrictedRoutes.some((route) => pathname.startsWith(route))) {
        router.push("/");
        return;
      }
    } else {
      // Handle tenant domain routing
      if (!hotel) {
        router.push("/hotel-not-found");
        return;
      }

      // For tenant domains, only allow auth and dashboard routes
      const publicTenantRoutes = ["/auth/login", "/auth/register"];
      const protectedTenantRoutes = ["/dashboard"]; // Allow all dashboard routes

      // Check if user is trying to access main domain routes on tenant domain
      if (pathname === "/") {
        if (isAuthenticated) {
          router.push("/dashboard");
        } else {
          router.push("/auth/login");
        }
        return;
      }

      // Allow public tenant routes
      if (publicTenantRoutes.some((route) => pathname.startsWith(route))) {
        return;
      }

      // For protected routes (dashboard and all sub-routes), check if user is authenticated
      if (pathname.startsWith("/dashboard")) {
        if (!isAuthenticated) {
          router.push("/auth/login");
          return;
        }
        // Allow access to dashboard routes if authenticated
        return;
      }

      // For any other routes on tenant domain, redirect to login if not authenticated
      if (!isAuthenticated) {
        router.push("/auth/login");
        return;
      }
    }
  }, [
    isMainDomain,
    hotel,
    loading,
    error,
    pathname,
    router,
    isAuthenticated,
    authLoading,
  ]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error && !isMainDomain) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Hotel Not Found
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

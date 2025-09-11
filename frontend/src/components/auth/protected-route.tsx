'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useTenantContext } from '@/components/tenant/tenant-provider';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();
  const { isMainDomain, hotel, loading: tenantLoading } = useTenantContext();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      console.log("🔐 ProtectedRoute: useEffect triggered", {
        tenantLoading,
        isInitialized,
        isLoading,
        isAuthenticated,
        isMainDomain,
        hotel: !!hotel
      });
      
      // Wait for tenant context to load first
      if (!tenantLoading && !isInitialized && !isLoading) {
        console.log("🔐 ProtectedRoute: Initializing auth");
        await initializeAuth();
        setIsInitialized(true);
      }
    };
    
    init();
  }, [initializeAuth, tenantLoading, isInitialized, isLoading]);

  useEffect(() => {
    if (isInitialized && !isLoading && !tenantLoading) {
      console.log("🔐 ProtectedRoute: Navigation check", {
        isMainDomain,
        hotel: !!hotel,
        isAuthenticated,
        currentPath: window.location.pathname
      });
      
      // For tenant domains, ensure hotel exists and user is authenticated
      if (!isMainDomain) {
        if (!hotel) {
          console.log("🔐 ProtectedRoute: No hotel found, redirecting to hotel-not-found");
          router.push('/hotel-not-found');
          return;
        }
        if (!isAuthenticated) {
          console.log("🔐 ProtectedRoute: Not authenticated, redirecting to login");
          router.push('/auth/login');
          return;
        }
        console.log("🔐 ProtectedRoute: All checks passed for tenant domain");
      }
      // For main domain, redirect unauthenticated users
      else if (!isAuthenticated) {
        console.log("🔐 ProtectedRoute: Main domain not authenticated, redirecting to login");
        router.push('/auth/login');
      }
    }
  }, [isInitialized, isLoading, isAuthenticated, isMainDomain, hotel, tenantLoading, router]);

  if (isLoading || !isInitialized || tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // For tenant domains, ensure both hotel and authentication
  if (!isMainDomain && (!hotel || !isAuthenticated)) {
    return null;
  }

  // For main domain, ensure authentication
  if (isMainDomain && !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

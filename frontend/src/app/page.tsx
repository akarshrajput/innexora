"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Loader2,
  Hotel,
  Users,
  MessageSquare,
  Shield,
  LogIn,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Building,
} from "lucide-react";
import { useTenantContext } from "@/components/tenant/tenant-provider";

export default function Home() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { isMainDomain, hotel, loading } = useTenantContext();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle navigation for tenant domains
  useEffect(() => {
    if (isClient && !loading && hotel && !isMainDomain) {
      router.push("/auth/login");
    }
  }, [isClient, loading, hotel, isMainDomain, router]);

  if (!isClient || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Main domain - Show public Innexora landing page
  if (isMainDomain) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Hotel className="h-8 w-8" />
              <span className="text-2xl font-bold">Innexora</span>
            </div>
            <p className="text-sm text-muted-foreground hidden md:block">
              Modern hotel management SaaS platform
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto max-w-6xl px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">Welcome to Innexora</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              The premier SaaS platform for modern hotel management. Streamline
              operations, enhance guest experiences, and grow your hospitality
              business.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => router.push("/contact")}>
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/pricing")}
              >
                View Pricing
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card>
              <CardHeader>
                <Building className="h-8 w-8 mb-2" />
                <CardTitle>Multi-Tenant Architecture</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Each hotel gets their own dedicated subdomain and database for
                  complete data isolation and customization.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 mb-2" />
                <CardTitle>Staff Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Comprehensive staff coordination and role-based access control
                  for seamless operations.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MessageSquare className="h-8 w-8 mb-2" />
                <CardTitle>Guest Communication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Real-time guest request handling and communication through QR
                  code integration.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Testimonials */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-8">
              Trusted by Hotels Worldwide
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground mb-4">
                    "Innexora has revolutionized our hotel operations. The
                    multi-tenant approach gives us complete control while
                    maintaining security."
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">JD</span>
                    </div>
                    <div>
                      <p className="font-semibold">John Doe</p>
                      <p className="text-sm text-muted-foreground">
                        General Manager, Luxury Resort
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground mb-4">
                    "The guest communication features have improved our service
                    quality significantly. Highly recommended!"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-semibold">SM</span>
                    </div>
                    <div>
                      <p className="font-semibold">Sarah Miller</p>
                      <p className="text-sm text-muted-foreground">
                        Operations Director, City Hotel
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t mt-16">
          <div className="container mx-auto max-w-6xl px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center gap-3 mb-4 md:mb-0">
                <Hotel className="h-6 w-6" />
                <span className="text-lg font-semibold">Innexora</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Innexora. Empowering hotels
                worldwide.
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Tenant domain - This should not be reached due to RouteGuard and the useEffect above
  if (hotel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Fallback - should not be reached
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        <Loader2 className="w-8 h-8 animate-spin mx-auto" />
      </div>
    </div>
  );
}

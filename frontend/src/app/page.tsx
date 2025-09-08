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
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

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
            Modern hotel management made simple
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Welcome to Innexora</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
            Streamline your hotel operations with intelligent guest services and
            staff management tools
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-sm text-blue-800">
              <strong>Guests:</strong> Scan the QR code in your room to access
              chat and room services directly
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          {/* Manager Access Card */}
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border">
                <Shield className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Manager Access</CardTitle>
              <CardDescription>
                Access the management dashboard to oversee hotel operations,
                manage rooms, and handle guest requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Staff management & coordination</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>Real-time guest request handling</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Hotel className="h-4 w-4" />
                  <span>Room status & housekeeping</span>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => router.push("/auth/login")}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Login to Dashboard
              </Button>
            </CardContent>
          </Card>
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
              © {new Date().getFullYear()} Innexora. Streamlining hotel
              operations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

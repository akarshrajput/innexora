'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Hotel, Users, MessageSquare, Shield, LogIn, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [roomNumber, setRoomNumber] = useState('');
  const [guestName, setGuestName] = useState('');
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

  const handleGuestAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomNumber) {
      router.push(`/hotel/${roomNumber}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Hotel className="h-8 w-8" />
            <span className="text-2xl font-bold">HotelFlow</span>
          </div>
          <p className="text-sm text-muted-foreground hidden md:block">
            Modern hotel management made simple
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to HotelFlow
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Streamline your hotel operations with intelligent guest services and staff management tools
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

          {/* Manager Access Card */}
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border">
                <Shield className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Manager Access</CardTitle>
              <CardDescription>
                Access the management dashboard to oversee hotel operations, manage rooms, and handle guest requests
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
                onClick={() => router.push('/auth/login')}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Login to Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* Guest Access Card */}
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border">
                <Users className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Guest Services</CardTitle>
              <CardDescription>
                Enter your room number to access AI assistant and hotel services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGuestAccess} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomNumber">Room Number</Label>
                  <Input
                    id="roomNumber"
                    placeholder="e.g., 101, 205, 312"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Access Guest Services
                </Button>
              </form>
              
              <div className="mt-6 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-center text-sm text-muted-foreground">
                  <div>
                    <MessageSquare className="mx-auto mb-1 h-4 w-4" />
                    <p>AI Assistant</p>
                  </div>
                  <div>
                    <Hotel className="mx-auto mb-1 h-4 w-4" />
                    <p>Room Services</p>
                  </div>
                </div>
              </div>
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
              <span className="text-lg font-semibold">HotelFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} HotelFlow. Streamlining hotel operations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}


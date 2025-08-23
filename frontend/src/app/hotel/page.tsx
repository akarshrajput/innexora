'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Building2, MessageSquare, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function HotelGuestPage() {
  const [roomNumber, setRoomNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomNumber.trim()) {
      toast.error('Please enter your room number');
      return;
    }

    // Validate room number format (assuming 3-4 digits)
    const roomNum = roomNumber.trim();
    if (!/^\d{3,4}$/.test(roomNum)) {
      toast.error('Please enter a valid room number (3-4 digits)');
      return;
    }

    setIsLoading(true);
    
    // Navigate to chat page - the chat page will handle fetching guest info
    router.push(`/hotel/${roomNum}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Welcome to HotelFlow
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Enter your room number to access hotel services and chat with our AI assistant
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleRoomSubmit} className="space-y-6">
              <div>
                <label htmlFor="roomNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Room Number
                </label>
                <Input
                  id="roomNumber"
                  type="text"
                  placeholder="e.g., 101, 205, 1024"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="text-center text-lg font-mono"
                  maxLength={4}
                  required
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Your room number is on your key card
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Access Hotel Services
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">
                  What you can do:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Room Service
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    Housekeeping
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    Maintenance
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    Concierge
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Need help? Contact the front desk at extension 0
          </p>
        </div>
      </div>
    </div>
  );
}

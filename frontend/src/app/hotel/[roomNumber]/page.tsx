'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, Loader2, ArrowLeft, MessageSquare, Bot, User, Sparkles, Ticket, Building2, UserCheck, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiClient } from '@/lib/api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface GuestInfo {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  room: {
    number: string;
    type: string;
  };
}

export default function GuestChatPage() {
  const { roomNumber } = useParams();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
  const [isLoadingGuest, setIsLoadingGuest] = useState(true);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [pendingTicketMessage, setPendingTicketMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGuestInfo();
  }, [roomNumber]);

  const fetchGuestInfo = async () => {
    try {
      setIsLoadingGuest(true);
      setError(null);
      
      // Fetch guest information by room number
      const response = await apiClient.get(`/api/guests/room/${roomNumber}`);
      
      if (response.data.success && response.data.data) {
        const guestData = response.data.data;
        setGuestInfo(guestData);
        
        // Add welcome message with guest's name
        setMessages([{
          role: 'assistant',
          content: `Hello ${guestData.name}! Welcome to your personal concierge for Room ${roomNumber}. I'm here to assist you with anything you need during your stay. How may I help you today?`,
          timestamp: new Date().toISOString()
        }]);
      } else {
        // No active guest found for this room
        setError('No active guest found for this room. Please verify the room number or contact the front desk.');
        setMessages([{
          role: 'assistant',
          content: `Welcome to Room ${roomNumber}! It appears there's no active guest registered in this room. Please contact the front desk for assistance.`,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Error fetching guest info:', error);
      setError('Failed to load guest information. Please try again or contact the front desk.');
      setMessages([{
        role: 'assistant',
        content: `I'm having trouble accessing guest information for Room ${roomNumber}. Please try again or contact the front desk for assistance.`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoadingGuest(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !guestInfo) return;

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      // Send message to the chat API
      const response = await apiClient.post('/api/chat/ai', {
        message: message,
        guestInfo: {
          guestId: guestInfo._id,
          guestName: guestInfo.name,
          roomNumber: roomNumber,
          roomType: guestInfo.room?.type
        },
        conversationHistory: messages.slice(-5) // Send last 5 messages for context
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Check if this should create a ticket
      if (response.data.shouldCreateTicket) {
        setPendingTicketMessage(message);
        setShowTicketDialog(true);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment or contact the front desk for immediate assistance.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const createServiceRequest = async () => {
    if (!guestInfo) return;
    
    try {
      setIsSubmitting(true);
      
      // Create a comprehensive summary of the entire conversation
      const conversationSummary = messages.map((msg, index) => 
        `${msg.role === 'user' ? 'Guest' : 'AI Assistant'}: ${msg.content}`
      ).join('\n\n');

      const mainRequest = `Service Request from Room ${roomNumber} (${guestInfo.name})\n\n**Initial Message:** ${pendingTicketMessage}\n\n**Full Conversation:**\n${conversationSummary}`;

      // Create a ticket via the API
      const response = await apiClient.post('/api/tickets/guest', {
        roomNumber: roomNumber,
        guestInfo: {
          id: guestInfo._id,
          name: guestInfo.name,
          email: guestInfo.email || '',
          phone: guestInfo.phone || ''
        },
        initialMessage: pendingTicketMessage,
        conversationHistory: messages,
        priority: 'medium' // Default to medium priority
      });

      if (response.data.success) {
        setTicketCreated(true);
        setShowTicketDialog(false);
        toast.success('🎫 Service request created! Hotel staff will assist you shortly.');
        
        const confirmationMessage: Message = {
          role: 'assistant',
          content: `🎫 **Service Request Created Successfully!**

Your request has been sent to our hotel staff and they will assist you shortly.

**Request Details:**
- Request ID: #${response.data.data._id.slice(-6)}
- Priority: Medium
- Status: New Request

Our team typically responds within 15-30 minutes. You can continue chatting here, and our staff will join the conversation when they're ready to assist you.

Is there anything else I can help you with while you wait?`,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, confirmationMessage]);
      }
    } catch (error) {
      console.error('Failed to create service request:', error);
      toast.error('Failed to create service request. Please try again.');
    }
  };

  if (isLoadingGuest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-700">Loading your information...</p>
              <p className="text-sm text-gray-500">Room {roomNumber}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/hotel')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Change Room
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Room {roomNumber}</h1>
            {guestInfo ? (
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <UserCheck className="w-4 h-4" />
                <span>{guestInfo.name}</span>
                {guestInfo.room?.type && (
                  <>
                    <Building2 className="w-4 h-4 ml-2" />
                    <span>{guestInfo.room.type}</span>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-600">Guest not found</p>
            )}
            <p className="text-sm text-gray-500">AI Assistant</p>
          </div>
          <div className="w-20" /> {/* Spacer for layout */}
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-800 text-sm">{error}</p>
          </div>
        )}

        {/* Chat Interface */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Chat with AI Assistant
              {guestInfo && (
                <span className="text-sm font-normal text-gray-500">- {guestInfo.name}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {msg.role === 'assistant' && (
                        <Bot className="w-4 h-4 mt-1 flex-shrink-0" />
                      )}
                      {msg.role === 'user' && (
                        <User className="w-4 h-4 mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
              
            {/* Input */}
            <div className="border-t p-4 bg-white">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={guestInfo ? "Type your message..." : "Please check your room number"}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={isLoading || !guestInfo}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  onClick={handleSendMessage}
                  disabled={isLoading || !guestInfo || !message.trim()}
                  className="flex-shrink-0"
                  size="icon"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="sr-only">Send message</span>
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 I can help with room service, housekeeping, maintenance, or create service requests for you.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Creation Dialog */}
        <Dialog open={showTicketDialog} onOpenChange={!isSubmitting ? setShowTicketDialog : undefined}>
          <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => !isSubmitting && e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-blue-600" />
                Create Service Request
              </DialogTitle>
              <DialogDescription className="pt-2">
                Our staff will be notified and will assist you shortly. You can track the status in this chat.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-700 font-medium">Your request:</p>
                <p className="mt-1 text-sm text-gray-600">{pendingTicketMessage}</p>
              </div>
              {guestInfo?.room?.type && (
                <div className="mt-3 text-sm text-gray-600">
                  <p><span className="font-medium">Room:</span> {roomNumber} ({guestInfo.room.type})</p>
                  {guestInfo.name && <p><span className="font-medium">Guest:</span> {guestInfo.name}</p>}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => !isSubmitting && setShowTicketDialog(false)}
                disabled={isSubmitting}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button 
                onClick={createServiceRequest}
                disabled={isSubmitting || ticketCreated}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : ticketCreated ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Request Sent
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send to Staff
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, ArrowLeft, MessageSquare, Bot, User, Sparkles, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface GuestInfo {
  guestName: string;
  roomNumber: string;
}

export default function GuestChatPage() {
  const { roomNumber } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestName, setGuestName] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(true);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [pendingTicketMessage, setPendingTicketMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

  useEffect(() => {
    // Get guest name from URL params if available
    const nameFromUrl = searchParams.get('guestName');
    if (nameFromUrl) {
      setGuestName(nameFromUrl);
      setShowGuestForm(false);
      // Add welcome message
      setMessages([{
        role: 'assistant',
        content: `Hello ${nameFromUrl}! I'm your AI assistant for Room ${roomNumber}. How can I help you today? I can assist with room service, housekeeping, maintenance issues, or any other hotel services.`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [roomNumber, searchParams]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleGuestFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setShowGuestForm(false);
    // Add welcome message
    setMessages([{
      role: 'assistant',
      content: `Hello ${guestName}! I'm your AI assistant for Room ${roomNumber}. How can I help you today? I can assist with room service, housekeeping, maintenance issues, or any other hotel services.`,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsSubmitting(true);

    try {
      // Call AI chat API
      const response = await axios.post(`${API_BASE_URL}/chat/ai`, {
        message: message,
        guestInfo: {
          guestName: guestName,
          roomNumber: roomNumber
        },
        conversationHistory: messages
      });

      const aiMessage: Message = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Remove automatic ticket popup - guests will use manual button instead

    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
      // Remove the user message if API call failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsSubmitting(false);
    }
  };

  const createServiceRequest = async () => {
    try {
      // Create a comprehensive summary of the entire conversation
      const conversationSummary = messages.map((msg, index) => 
        `${msg.role === 'user' ? 'Guest' : 'AI Assistant'}: ${msg.content}`
      ).join('\n\n');

      const mainRequest = `Full conversation summary from Room ${roomNumber}:\n\n${conversationSummary}`;

      const response = await axios.post(`${API_BASE_URL}/tickets/guest`, {
        roomNumber: roomNumber,
        guestInfo: {
          name: guestName,
          email: `${guestName.toLowerCase().replace(' ', '.')}@guest.hotel`,
          phone: 'Not provided'
        },
        initialMessage: mainRequest,
        priority: 'medium',
        conversationHistory: messages
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



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/')}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Room {roomNumber} AI Assistant
          </h1>
          {ticketCreated && (
            <div className="ml-auto">
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✅ Service Request Created
              </div>
            </div>
          )}
        </div>

        {showGuestForm ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <Bot className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-center text-xl">Welcome to Room {roomNumber}</CardTitle>
              <p className="text-center text-muted-foreground text-sm mt-2">
                Chat with our AI assistant for instant help with hotel services
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGuestFormSubmit} className="space-y-4">
                <div>
                  <label htmlFor="guestName" className="block text-sm font-medium mb-2">
                    Your Name
                  </label>
                  <Input
                    id="guestName"
                    type="text"
                    placeholder="Enter your name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Start Chat with AI Assistant
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-lg">AI Assistant Chat</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {guestName} • Room {roomNumber}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!ticketCreated && messages.length > 1 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setShowTicketDialog(true)}
                      className="flex items-center gap-2"
                    >
                      <Ticket className="h-4 w-4" />
                      Raise Ticket
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowGuestForm(true);
                      setMessages([]);
                      setTicketCreated(false);
                    }}
                  >
                    New Chat
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[60vh] overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Start a conversation with your AI assistant</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-gray-100 dark:bg-gray-800 rounded-bl-none'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.role === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                          <span className="text-xs font-medium">
                            {msg.role === 'user' ? 'You' : 'AI Assistant'}
                          </span>
                          <span className="text-xs opacity-70">
                            {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {isSubmitting && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3 rounded-bl-none">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <form onSubmit={handleSendMessage} className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message... (e.g., 'I need extra towels' or 'The AC is not working')"
                    className="min-h-[80px] flex-1"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!message.trim() || isSubmitting}
                    className="self-end h-[80px]"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  💡 Tip: Press Enter to send, Shift+Enter for new line
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Ticket Creation Dialog */}
        <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Service Request</DialogTitle>
              <DialogDescription>
                This will send your complete conversation to hotel staff for assistance. 
                They will receive the full chat history and respond promptly.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Request Details:</p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Room:</strong> {roomNumber}<br/>
                    <strong>Guest:</strong> {guestName}<br/>
                    <strong>Full Conversation:</strong> {messages.length} messages will be included<br/>
                    <strong>Priority:</strong> Medium
                  </p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Complete Conversation Summary:</p>
                  <div className="max-h-40 overflow-y-auto text-xs space-y-2">
                    {messages.map((msg, index) => (
                      <div key={index} className="border-l-2 border-gray-300 pl-2">
                        <div className="font-medium text-xs">
                          {msg.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {msg.content.length > 150 ? `${msg.content.slice(0, 150)}...` : msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    ✅ Hotel staff will receive the complete conversation above
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
                Continue Chatting
              </Button>
              <Button onClick={createServiceRequest}>
                Create Service Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

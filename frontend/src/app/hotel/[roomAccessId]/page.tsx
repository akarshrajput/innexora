"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Send,
  Loader2,
  ArrowLeft,
  MessageSquare,
  Bot,
  User,
  Hotel,
  Building2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { apiClient } from "@/lib/api/client";
import { guestApiClient } from "@/lib/api/guest-client";

interface Message {
  role: "user" | "assistant";
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

interface RoomInfo {
  type: string;
  floor: number;
}

export default function GuestChatPage() {
  const { roomAccessId } = useParams();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [isLoadingGuest, setIsLoadingGuest] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noGuestMessage, setNoGuestMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch guest information by room access ID
  useEffect(() => {
    const fetchGuestInfo = async () => {
      try {
        setIsLoadingGuest(true);
        const response = await guestApiClient.get(
          `/guests/room-access/${roomAccessId}`
        );

        if (response.data.success) {
          if (response.data.data) {
            setGuestInfo(response.data.data);
            setError(null);
            setNoGuestMessage(null);
          } else {
            // No guest in room
            setGuestInfo(null);
            setRoomInfo(response.data.roomInfo);
            setNoGuestMessage(response.data.message);
          }
        }
      } catch (error: any) {
        console.error("Error fetching guest info:", error);
        if (error.response?.status === 404) {
          setError("Invalid room access code. Please scan the QR code again.");
        } else {
          setError("Unable to connect. Please try again later.");
        }
      } finally {
        setIsLoadingGuest(false);
      }
    };

    if (roomAccessId) {
      fetchGuestInfo();
    }
  }, [roomAccessId]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading || !guestInfo) return;

    const userMessage: Message = {
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const response = await guestApiClient.post("/chat/chat", {
        message: message,
        guestInfo: {
          guestName: guestInfo.name,
          roomNumber: guestInfo.room.number,
          email: guestInfo.email,
          phone: guestInfo.phone,
        },
      });

      if (response.data.success) {
        const aiMessage: Message = {
          role: "assistant",
          content: response.data.response,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        // Show ticket creation notification if tickets were created
        if (
          response.data.shouldCreateTicket &&
          response.data.categories &&
          response.data.categories.length > 0
        ) {
          const ticketCategories = response.data.categories.map(
            (t: any) => t.category
          );
          toast.success(
            `Service request created! Our team will assist you shortly.`,
            {
              description: `Categories: ${ticketCategories.join(", ")}`,
              duration: 5000,
            }
          );
        }
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoadingGuest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-lg font-medium text-gray-700">
              Connecting to room...
            </p>
            <p className="text-sm text-gray-500 mt-2">Please wait a moment</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Hotel className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Access Error
            </p>
            <p className="text-sm text-gray-600 text-center mb-4">{error}</p>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (noGuestMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Room Available
            </p>
            <p className="text-sm text-gray-600 text-center mb-2">
              {noGuestMessage}
            </p>
            {roomInfo && (
              <p className="text-xs text-gray-500 text-center mb-4">
                {roomInfo.type} • Floor {roomInfo.floor}
              </p>
            )}
            <div className="w-full space-y-2">
              <Button
                onClick={() => router.push("/dashboard")}
                className="w-full"
              >
                Staff Login
              </Button>
              <Button
                onClick={() => router.push("/")}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {guestInfo?.name}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {guestInfo?.room.type}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  Innexora Hotel
                </p>
                <p className="text-xs text-gray-500">Guest Services</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Hotel className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto p-4 h-[calc(100vh-88px)] flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
              Chat with our AI Assistant
            </CardTitle>
            <p className="text-sm text-gray-600">
              Need assistance? Ask our AI for help with room service, amenities,
              or general inquiries.
            </p>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">
                    Welcome! How can I assist you today?
                  </p>
                  <p className="text-sm text-gray-400">
                    Ask about room service, amenities, or any hotel services
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-white border shadow-sm"
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {msg.role === "assistant" && (
                          <Bot className="h-4 w-4 text-gray-500 mt-1 shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              msg.role === "user"
                                ? "text-blue-100"
                                : "text-gray-500"
                            }`}
                          >
                            {formatDistanceToNow(new Date(msg.timestamp), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        {msg.role === "user" && (
                          <User className="h-4 w-4 text-blue-100 mt-1 shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !message.trim()}
                size="sm"
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TicketCard } from '@/components/kanban/ticket-card';
import { KanbanColumn } from '@/components/kanban/kanban-column';
import { 
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { rectIntersection } from '@dnd-kit/core';
import { 
  Search, 
  Plus, 
  Send, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Bot, 
  Sparkles,
  Bell
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { io, Socket } from 'socket.io-client';

interface Message {
  _id: string;
  content: string;
  sender: 'guest' | 'manager' | 'ai_assistant' | 'system';
  senderName: string;
  createdAt: string;
  timestamp?: string;
}

interface Ticket {
  _id: string;
  room: string | {
    _id: string;
    number: string;
    type?: string;
    floor?: number;
  };
  roomNumber: string;
  guestInfo: {
    name: string;
    email?: string;
    phone?: string;
  };
  status: 'raised' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}


interface Room {
  _id: string;
  number: string;
  type: string;
  floor: number;
  status: 'available' | 'occupied' | 'maintenance';
}

interface DashboardStats {
  totalRooms: number;
  raisedTickets: number;
  inProgressTickets: number;
  completedTickets: number;
}

export default function DashboardPage() {
  const [tickets, setTickets] = useState<Record<string, Ticket[]>>({
    raised: [],
    in_progress: [],
    completed: [],
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0,
    raisedTickets: 0,
    inProgressTickets: 0,
    completedTickets: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterRoom, setFilterRoom] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [newRoom, setNewRoom] = useState({ number: '', type: '', floor: 1 });
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const collisionDetectionStrategy = rectIntersection;

  useEffect(() => {
    fetchData();
    
    // Set up WebSocket connection for real-time ticket notifications
    const setupWebSocket = () => {
      const newSocket = io('http://localhost:5050', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });
      
      newSocket.on('connect', () => {
        console.log('🔗 Connected to WebSocket server');
        // Join managers room to receive new ticket notifications
        newSocket.emit('joinManagersRoom', 'manager');
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
      });

      newSocket.on('newTicket', (data) => {
        console.log('📨 New ticket received:', data);
        
        // Show toast notification
        toast.success(
          `New Ticket from ${data.ticket.guestInfo.name}`,
          {
            description: `Room ${data.ticket.roomNumber} - ${data.message}`,
            action: {
              label: 'View',
              onClick: () => setSelectedTicket(data.ticket)
            }
          }
        );

        // Play notification sound (optional)
        if (typeof window !== 'undefined' && 'Audio' in window) {
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Ignore errors if sound fails
          } catch (e) {}
        }

        // Refresh tickets to show the new one
        fetchData();
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Disconnected from WebSocket server');
      });

      setSocket(newSocket);
      
      return () => {
        newSocket.disconnect();
      };
    };
    
    const cleanup = setupWebSocket();
    return cleanup;
  }, []);

  const fetchData = async () => {
    try {
      const [ticketsResponse, roomsResponse] = await Promise.all([
        apiClient.get('/tickets'),
        apiClient.get('/rooms')
      ]);

      if (ticketsResponse.data?.success && Array.isArray(ticketsResponse.data.data)) {
        const ticketsData = ticketsResponse.data.data;
        
        // Check for new tickets and show notifications
        const currentRaisedCount = tickets.raised?.length || 0;
        const newRaisedCount = ticketsData.filter((t: Ticket) => t.status === 'raised').length;
        
        if (newRaisedCount > currentRaisedCount && currentRaisedCount > 0) {
          const newTickets = ticketsData.filter((t: Ticket) => 
            t.status === 'raised' && 
            !tickets.raised?.some(existing => existing._id === t._id)
          );
          
          newTickets.forEach((ticket: Ticket) => {
            toast.success(`🔔 New service request from ${ticket.guestInfo.name} in Room ${ticket.roomNumber}`, {
              duration: 5000,
              action: {
                label: 'View',
                onClick: () => setSelectedTicket(ticket)
              }
            });
          });
        }
        
        const groupedTickets = ticketsData.reduce((acc: Record<string, Ticket[]>, ticket: Ticket) => {
          if (!acc[ticket.status]) {
            acc[ticket.status] = [];
          }
          acc[ticket.status].push(ticket);
          return acc;
        }, { raised: [], in_progress: [], completed: [] });
        
        setTickets(groupedTickets);
        setStats({
          totalRooms: roomsResponse.data?.data?.length || 0,
          raisedTickets: groupedTickets.raised?.length || 0,
          inProgressTickets: groupedTickets.in_progress?.length || 0,
          completedTickets: groupedTickets.completed?.length || 0,
        });
      }

      if (roomsResponse.data?.success && Array.isArray(roomsResponse.data.data)) {
        setRooms(roomsResponse.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      console.log('Updating ticket status:', { ticketId, newStatus });
      await apiClient.put(`/tickets/${ticketId}/status`, { status: newStatus });
      fetchData();
      toast.success('Ticket status updated');
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('Failed to update ticket status');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setIsLoading(true);
    try {
      const response = await apiClient.post(`/tickets/${selectedTicket._id}/messages`, {
        content: newMessage,
        sender: 'manager'
      });

      if (response.data.success) {
        // Update the ticket with new message
        const updatedTicket = { ...selectedTicket };
        updatedTicket.messages = [...(updatedTicket.messages || []), response.data.data];
        setSelectedTicket(updatedTicket);
        
        // Update tickets list
        setTickets(prev => {
          const newTickets = { ...prev };
          Object.keys(newTickets).forEach(status => {
            newTickets[status] = newTickets[status].map((t: Ticket) => 
              t._id === selectedTicket._id ? updatedTicket : t
            );
          });
          return newTickets;
        });
        
        setNewMessage('');
        setAiSuggestion(''); // Clear AI suggestion after sending
        toast.success('Message sent successfully');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const getAISuggestion = async () => {
    if (!selectedTicket) return;

    setIsLoadingAI(true);
    try {
      const response = await apiClient.post('/chat/manager-assist', {
        ticketId: selectedTicket._id,
        conversationHistory: selectedTicket.messages || [],
        requestType: selectedTicket.priority
      });

      if (response.data.success) {
        setAiSuggestion(response.data.suggestion);
        toast.success('AI suggestion generated');
      }
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      toast.error('Failed to get AI suggestion');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const useAISuggestion = () => {
    if (aiSuggestion) {
      setNewMessage(aiSuggestion);
      setAiSuggestion('');
    }
  };

  const handleAddRoom = async () => {
    try {
      await apiClient.post('/rooms', newRoom);
      setNewRoom({ number: '', type: '', floor: 1 });
      setIsRoomDialogOpen(false);
      fetchData();
      toast.success('Room added successfully');
    } catch (error) {
      console.error('Failed to add room:', error);
      toast.error('Failed to add room');
    }
  };

  const getFilteredTickets = (status: string) => {
    let filtered = tickets[status] || [];
    
    if (searchQuery) {
      filtered = filtered.filter(ticket => 
        ticket.guestInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.roomNumber.includes(searchQuery) ||
        (ticket.messages[0]?.content || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterPriority) {
      filtered = filtered.filter(ticket => ticket.priority === filterPriority);
    }
    
    if (filterRoom) {
      filtered = filtered.filter(ticket => ticket.roomNumber === filterRoom);
    }
    
    return filtered;
  };

  const openTicketDialog = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsTicketDialogOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticket = Object.values(tickets).flat().find(t => t._id === active.id);
    setActiveTicket(ticket || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const ticketId = active.id as string;
    const newStatus = over.id as string;

    // Find the ticket being moved
    const ticket = Object.values(tickets).flat().find(t => t._id === ticketId);
    if (!ticket || ticket.status === newStatus) return;

    // Update ticket status
    await handleStatusChange(ticketId, newStatus);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Dashboard</h1>
          <p className="text-muted-foreground">Hotel Management System • {new Date().toLocaleDateString('en-US')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="roomNumber">Room Number</Label>
                  <Input
                    id="roomNumber"
                    value={newRoom.number}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, number: e.target.value }))}
                    placeholder="e.g., 432"
                  />
                </div>
                <div>
                  <Label htmlFor="roomType">Room Type</Label>
                  <Input
                    id="roomType"
                    value={newRoom.type}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, type: e.target.value }))}
                    placeholder="e.g., Deluxe, Standard"
                  />
                </div>
                <div>
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    type="number"
                    value={newRoom.floor}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, floor: parseInt(e.target.value) || 1 }))}
                    min="1"
                  />
                </div>
                <Button onClick={handleAddRoom} className="w-full">
                  Add Room
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.raisedTickets + stats.inProgressTickets + stats.completedTickets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.raisedTickets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressTickets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTickets}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search tickets..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterPriority || 'all'} onValueChange={(value) => setFilterPriority(value === 'all' ? null : value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRoom || 'all'} onValueChange={(value) => setFilterRoom(value === 'all' ? null : value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Room" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room._id} value={room.number}>
                  Room {room.number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterPriority || filterRoom || searchQuery) && (
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterPriority(null);
                setFilterRoom(null);
                setSearchQuery('');
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-400px)]">
          {/* New Requests Column */}
          <DroppableColumn id="raised">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-yellow-700 dark:text-yellow-400">
                    New Requests
                  </CardTitle>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    {stats.raisedTickets}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 h-[calc(100vh-280px)] overflow-y-auto p-2">
                <SortableContext items={tickets.raised.map(t => t._id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {tickets.raised.map((ticket) => (
                      <DraggableTicketCard
                        key={ticket._id}
                        ticket={ticket}
                        onClick={() => setSelectedTicket(ticket)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </CardContent>
            </Card>
          </DroppableColumn>

          {/* In Progress Column */}
          <DroppableColumn id="in_progress">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                    In Progress
                  </CardTitle>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {stats.inProgressTickets}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 h-[calc(100vh-280px)] overflow-y-auto p-2">
                <SortableContext items={tickets.in_progress.map(t => t._id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {tickets.in_progress.map((ticket) => (
                      <DraggableTicketCard
                        key={ticket._id}
                        ticket={ticket}
                        onClick={() => setSelectedTicket(ticket)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </CardContent>
            </Card>
          </DroppableColumn>

          {/* Completed Column */}
          <DroppableColumn id="completed">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-green-700 dark:text-green-400">
                    Completed
                  </CardTitle>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {stats.completedTickets}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 h-[calc(100vh-280px)] overflow-y-auto p-2">
                <SortableContext items={tickets.completed.map(t => t._id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {tickets.completed.map((ticket) => (
                      <DraggableTicketCard
                        key={ticket._id}
                        ticket={ticket}
                        onClick={() => setSelectedTicket(ticket)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </CardContent>
            </Card>
          </DroppableColumn>
        </div>

        {/* Drag Overlay */}
        {activeTicket && (
          <DragOverlay>
            <div className="bg-card border rounded-lg p-4 shadow-2xl ring-2 ring-primary/30 scale-105 rotate-2">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-sm line-clamp-2">
                  {activeTicket.guestInfo.name} - Room {activeTicket.roomNumber}
                </h3>
                <Badge 
                  variant={activeTicket.priority === 'high' ? 'destructive' : activeTicket.priority === 'medium' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {activeTicket.priority}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {activeTicket.messages?.[0]?.content || 'No message'}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDistanceToNow(new Date(activeTicket.createdAt), { addSuffix: true })}</span>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{activeTicket.messages?.length || 0}</span>
                </div>
              </div>
            </div>
          </DragOverlay>
        )}
      </DndContext>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl">
                      Ticket #{selectedTicket._id.slice(-6)}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Room {selectedTicket.roomNumber} • {selectedTicket.guestInfo.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(value) => handleStatusChange(selectedTicket._id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="raised">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-medium">{selectedTicket.guestInfo.name}</span>
                    {selectedTicket.guestInfo.email && (
                      <p className="text-sm text-muted-foreground">{selectedTicket.guestInfo.email}</p>
                    )}
                    {selectedTicket.guestInfo.phone && (
                      <p className="text-sm text-muted-foreground">{selectedTicket.guestInfo.phone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Conversation History</h4>
                    <Badge variant="outline" className="text-xs">
                      {selectedTicket.messages?.length || 0} messages
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedTicket.messages?.map((message: Message, index: number) => {
                      const isGuest = message.sender === 'guest';
                      const isAI = message.sender === 'ai_assistant';
                      const isSystem = message.sender === 'system';
                      const isManager = message.sender === 'manager';
                      
                      return (
                        <div key={index} className={`flex ${isGuest || isAI ? 'justify-start' : 'justify-end'} mb-3`}>
                          <div className="flex items-start gap-3 max-w-[85%]">
                            {/* Avatar */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                              isGuest ? 'bg-blue-100 text-blue-700' :
                              isAI ? 'bg-purple-100 text-purple-700' :
                              isSystem ? 'bg-gray-100 text-gray-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {isGuest ? '👤' : isAI ? '🤖' : isSystem ? '⚙️' : '👨‍💼'}
                            </div>
                            
                            {/* Message Content */}
                            <div className={`flex-1 p-3 rounded-lg ${
                              isGuest ? 'bg-blue-50 border border-blue-200' :
                              isAI ? 'bg-purple-50 border border-purple-200' :
                              isSystem ? 'bg-gray-50 border border-gray-200' :
                              'bg-green-50 border border-green-200'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-medium ${
                                  isGuest ? 'text-blue-800' :
                                  isAI ? 'text-purple-800' :
                                  isSystem ? 'text-gray-800' :
                                  'text-green-800'
                                }`}>
                                  {message.senderName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(message.createdAt || message.timestamp || new Date()), { addSuffix: true })}
                                </span>
                              </div>
                              <div className={`text-sm leading-relaxed ${
                                isGuest ? 'text-blue-900' :
                                isAI ? 'text-purple-900' :
                                isSystem ? 'text-gray-900' :
                                'text-green-900'
                              }`}>
                                {message.content.split('\n').map((line, i) => (
                                  <p key={i} className={i > 0 ? 'mt-2' : ''}>
                                    {line.startsWith('**') && line.endsWith('**') ? (
                                      <strong>{line.slice(2, -2)}</strong>
                                    ) : line.startsWith('- ') ? (
                                      <span className="block ml-2">• {line.slice(2)}</span>
                                    ) : (
                                      line
                                    )}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {selectedTicket.messages?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No conversation history available</p>
                    </div>
                  )}
                </div>

                {/* AI Suggestion Section */}
                {aiSuggestion && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">AI Suggestion</span>
                    </div>
                    <p className="text-sm text-blue-700 mb-2">{aiSuggestion}</p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={useAISuggestion}
                        size="sm" 
                        variant="outline"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        Use This Response
                      </Button>
                      <Button 
                        onClick={() => setAiSuggestion('')}
                        size="sm" 
                        variant="ghost"
                        className="text-blue-600"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={getAISuggestion}
                      disabled={isLoadingAI}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {isLoadingAI ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {isLoadingAI ? 'Generating...' : 'Get AI Suggestion'}
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                      rows={3}
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={isLoading || !newMessage.trim()}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Droppable Column Component
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`flex-1 min-w-[300px] transition-all duration-200 ${
        isOver ? 'bg-muted/30 rounded-lg ring-2 ring-primary/20 scale-[1.02]' : ''
      }`}
    >
      {children}
    </div>
  );
}

// Draggable Ticket Card Component
function DraggableTicketCard({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-card border rounded-lg p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 ${
        isDragging ? 'shadow-2xl ring-2 ring-primary/30 scale-105 rotate-2' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-sm line-clamp-2">
          {ticket.guestInfo.name} - Room {ticket.roomNumber}
        </h3>
        <Badge 
          variant={ticket.priority === 'high' ? 'destructive' : ticket.priority === 'medium' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {ticket.priority}
        </Badge>
      </div>
      
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
        {ticket.messages?.[0]?.content || 'No message'}
      </p>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
        <div className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          <span>{ticket.messages?.length || 0}</span>
        </div>
      </div>
    </div>
  );
}

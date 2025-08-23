'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter,
  Calendar,
  User,
  Building2,
  Receipt,
  UtensilsCrossed,
  MessageSquare,
  DollarSign,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  History,
  TrendingUp,
  Users,
  Star,
  Phone,
  Mail,
  MapPin,
  CreditCard
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

interface GuestHistory {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  actualCheckOutDate?: string;
  status: string;
  room: {
    number: string;
    type: string;
    floor: number;
    price: number;
  };
  orders: any[];
  bills: any[];
  tickets: any[];
  totalSpent: number;
  totalOrders: number;
  totalTickets: number;
  stayDuration: number;
}

interface GuestProfile {
  guest: any;
  orders: any[];
  bills: any[];
  tickets: any[];
  allStays: any[];
  stats: {
    totalStays: number;
    totalSpent: number;
    totalOrders: number;
    totalTickets: number;
    averageStayDuration: number;
    favoriteRoomType: string;
    totalItemsOrdered: number;
    lastVisit: string;
    firstVisit: string;
  };
}

interface Pagination {
  current: number;
  pages: number;
  total: number;
  limit: number;
}

const statusColors = {
  checked_in: 'bg-green-100 text-green-800',
  checked_out: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-800',
  archived: 'bg-purple-100 text-purple-800'
};

const statusLabels = {
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  archived: 'Archived'
};

export default function GuestHistoryPage() {
  const [guests, setGuests] = useState<GuestHistory[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('checkInDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState<Pagination>({
    current: 1,
    pages: 1,
    total: 0,
    limit: 10
  });
  const [stats, setStats] = useState({
    totalGuests: 0,
    activeGuests: 0,
    checkedOutGuests: 0,
    totalRevenue: 0,
    totalOrders: 0,
    totalTickets: 0,
    repeatGuests: 0,
    recentActivity: []
  });

  useEffect(() => {
    fetchGuestHistory();
    fetchStats();
  }, [pagination.current, searchTerm, statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const fetchGuestHistory = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await apiClient.get(`/guests/history?${params}`);
      setGuests(response.data.data.guests);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Error fetching guest history:', error);
      toast.error('Failed to fetch guest history');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/guests/history/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchGuestProfile = async (guestId: string) => {
    try {
      setIsProfileLoading(true);
      const response = await apiClient.get(`/guests/history/${guestId}`);
      setSelectedGuest(response.data.data);
    } catch (error) {
      console.error('Error fetching guest profile:', error);
      toast.error('Failed to fetch guest profile');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, current: newPage }));
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchGuestHistory();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setSortBy('checkInDate');
    setSortOrder('desc');
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant="outline" className={statusColors[status as keyof typeof statusColors]}>
        {statusLabels[status as keyof typeof statusLabels]}
      </Badge>
    );
  };

  const openGuestProfile = async (guest: GuestHistory) => {
    setIsProfileDialogOpen(true);
    await fetchGuestProfile(guest._id);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGuests}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeGuests} currently active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue}</div>
            <p className="text-xs text-muted-foreground">
              From all guest stays
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Guests</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.repeatGuests}</div>
            <p className="text-xs text-muted-foreground">
              Multiple visits
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Food orders placed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter Guests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, phone, email, room..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="checked_out">Checked Out</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkInDate">Check-in Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="totalSpent">Total Spent</SelectItem>
                  <SelectItem value="stayDuration">Stay Duration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guest History List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Guest History ({pagination.total} guests)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading guest history...</p>
              </div>
            ) : guests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No guests found matching your criteria.
              </div>
            ) : (
              <>
                {guests.map((guest) => (
                  <div key={guest._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{guest.name}</h3>
                          {getStatusBadge(guest.status)}
                          {guest.totalSpent > 10000 && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                              <Star className="h-3 w-3 mr-1" />
                              VIP
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Room {guest.roomNumber} ({guest.room.type})
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(guest.checkInDate), 'MMM dd, yyyy')}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ₹{guest.totalSpent}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {guest.stayDuration} nights
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span>{guest.totalOrders} orders</span>
                          <span>{guest.totalTickets} tickets</span>
                          <span>{guest.bills.length} bills</span>
                          <span>Last: {formatDistanceToNow(new Date(guest.checkInDate), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openGuestProfile(guest)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Profile
                    </Button>
                  </div>
                ))}

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.current - 1) * pagination.limit) + 1} to {Math.min(pagination.current * pagination.limit, pagination.total)} of {pagination.total} guests
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.current - 1)}
                      disabled={pagination.current === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={pagination.current === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.current + 1)}
                      disabled={pagination.current === pagination.pages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Guest Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Guest Profile
            </DialogTitle>
            <DialogDescription>
              Complete guest history and activity overview
            </DialogDescription>
          </DialogHeader>
          
          {isProfileLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading guest profile...</p>
            </div>
          ) : selectedGuest && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="stays">Stays</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="bills">Bills</TabsTrigger>
                <TabsTrigger value="tickets">Tickets</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Guest Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Guest Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedGuest.guest.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedGuest.guest.phone}</span>
                      </div>
                      {selectedGuest.guest.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedGuest.guest.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>Room {selectedGuest.guest.roomNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Status:</span>
                        {getStatusBadge(selectedGuest.guest.status)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Guest Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>Total Stays:</span>
                        <span className="font-medium">{selectedGuest.stats.totalStays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Spent:</span>
                        <span className="font-medium">₹{selectedGuest.stats.totalSpent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Orders:</span>
                        <span className="font-medium">{selectedGuest.stats.totalOrders}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Tickets:</span>
                        <span className="font-medium">{selectedGuest.stats.totalTickets}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Stay Duration:</span>
                        <span className="font-medium">{Math.round(selectedGuest.stats.averageStayDuration)} nights</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Favorite Room Type:</span>
                        <span className="font-medium">{selectedGuest.stats.favoriteRoomType || 'N/A'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="stays" className="space-y-4">
                <div className="space-y-4">
                  {selectedGuest.allStays.map((stay, index) => (
                    <Card key={stay._id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="h-4 w-4" />
                              <span className="font-medium">Room {stay.roomNumber} - {stay.room?.type}</span>
                              {getStatusBadge(stay.status)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(stay.checkInDate), 'MMM dd, yyyy')} - {format(new Date(stay.checkOutDate), 'MMM dd, yyyy')}
                              <span className="ml-2">({stay.stayDuration} nights)</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">₹{stay.room?.price * stay.stayDuration}</div>
                            <div className="text-sm text-muted-foreground">Room charges</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="orders" className="space-y-4">
                <div className="space-y-4">
                  {selectedGuest.orders.map((order) => (
                    <Card key={order._id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <UtensilsCrossed className="h-4 w-4" />
                            <span className="font-medium">#{order.orderNumber}</span>
                            <Badge variant="outline">{order.status}</Badge>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">₹{order.totalAmount}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(order.orderDate), 'MMM dd, yyyy HH:mm')}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.items.map((item: any) => `${item.quantity}x ${item.food.name}`).join(', ')}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="bills" className="space-y-4">
                <div className="space-y-4">
                  {selectedGuest.bills.map((bill) => (
                    <Card key={bill._id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Receipt className="h-4 w-4" />
                              <span className="font-medium">#{bill.billNumber}</span>
                              <Badge variant="outline">{bill.status}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {bill.items.length} items • Created {format(new Date(bill.createdAt), 'MMM dd, yyyy')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">₹{bill.total}</div>
                            <div className="text-sm text-muted-foreground">
                              Balance: ₹{bill.balance}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="tickets" className="space-y-4">
                <div className="space-y-4">
                  {selectedGuest.tickets.map((ticket) => (
                    <Card key={ticket._id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="h-4 w-4" />
                              <span className="font-medium">{ticket.subject}</span>
                              <Badge variant="outline">{ticket.status}</Badge>
                              <Badge variant="outline">{ticket.priority}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Room {ticket.roomNumber} • {format(new Date(ticket.createdAt), 'MMM dd, yyyy HH:mm')}
                            </div>
                          </div>
                        </div>
                        {ticket.description && (
                          <p className="text-sm mt-2">{ticket.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

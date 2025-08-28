'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Clock, 
  DollarSign,
  User,
  Building2,
  ChefHat,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface OrderItem {
  food: {
    _id: string;
    name: string;
    price: number;
    preparationTime: number;
  };
  foodName?: string;
  quantity: number;
  price: number;
  unitPrice?: number;
  specialInstructions?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  guest: {
    _id: string;
    name: string;
    phone: string;
  };
  room: {
    _id: string;
    number: string;
  };
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  type: 'room_service' | 'restaurant' | 'takeaway';
  orderDate: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  specialInstructions?: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: string;
  updatedAt: string;
}

interface FoodItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
  preparationTime: number;
}

interface Guest {
  _id: string;
  name: string;
  phone: string;
  roomNumber: string;
}

interface OrderForm {
  guestId: string;
  items: {
    foodId: string;
    quantity: number;
    specialInstructions: string;
  }[];
  type: 'room_service' | 'restaurant' | 'takeaway';
  specialInstructions: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    pending: { count: 0, totalAmount: 0 },
    confirmed: { count: 0, totalAmount: 0 },
    preparing: { count: 0, totalAmount: 0 },
    ready: { count: 0, totalAmount: 0 },
    delivered: { count: 0, totalAmount: 0 },
    cancelled: { count: 0, totalAmount: 0 },
    totalRevenue: 0,
    period: 'today'
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [orderForm, setOrderForm] = useState<OrderForm>({
    guestId: '',
    items: [{ foodId: '', quantity: 1, specialInstructions: '' }],
    type: 'room_service',
    specialInstructions: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchFoodItems();
    fetchGuests();
    fetchStats();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await apiClient.get('/orders');
      setOrders(response.data.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFoodItems = async () => {
    try {
      const response = await apiClient.get('/food');
      setFoodItems(response.data.data.filter((item: FoodItem) => item.isAvailable));
    } catch (error) {
      console.error('Error fetching food items:', error);
    }
  };

  const fetchGuests = async () => {
    try {
      const response = await apiClient.get('/guests');
      setGuests(response.data.data.filter((guest: any) => guest.status === 'checked_in'));
    } catch (error) {
      console.error('Error fetching guests:', error);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      const response = await apiClient.get('/orders/stats');
      
      // Handle the API response structure properly
      const statsData = response.data.data;
      
      // Ensure all status types are present with default values
      const defaultStatus = { count: 0, totalAmount: 0 };
      setStats({
        pending: statsData.pending || defaultStatus,
        confirmed: statsData.confirmed || defaultStatus,
        preparing: statsData.preparing || defaultStatus,
        ready: statsData.ready || defaultStatus,
        delivered: statsData.delivered || defaultStatus,
        cancelled: statsData.cancelled || defaultStatus,
        totalRevenue: statsData.totalRevenue || 0,
        period: statsData.period || 'today'
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStatsError('Failed to load statistics');
      // Set default stats on error
      setStats({
        pending: { count: 0, totalAmount: 0 },
        confirmed: { count: 0, totalAmount: 0 },
        preparing: { count: 0, totalAmount: 0 },
        ready: { count: 0, totalAmount: 0 },
        delivered: { count: 0, totalAmount: 0 },
        cancelled: { count: 0, totalAmount: 0 },
        totalRevenue: 0,
        period: 'today'
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    try {
      setIsLoading(true);
      const validItems = orderForm.items.filter(item => item.foodId && item.quantity > 0);
      if (validItems.length === 0) {
        toast.error('Please add at least one item to the order');
        return;
      }

      if (!orderForm.guestId) {
        toast.error('Please select a guest');
        return;
      }

      const response = await apiClient.post('/orders', {
        ...orderForm,
        items: validItems
      });
      
      if (response.data.success) {
        toast.success('Order created successfully!');
        setIsCreateDialogOpen(false);
        resetOrderForm();
        fetchOrders();
        fetchStats();
      } else {
        toast.error(response.data.message || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      
      // Better error handling
      let errorMessage = 'Failed to create order';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status });
      toast.success('Order status updated successfully!');
      fetchOrders();
      fetchStats();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error(error.response?.data?.message || 'Failed to update order status');
    }
  };

  const resetOrderForm = () => {
    setOrderForm({
      guestId: '',
      items: [{ foodId: '', quantity: 1, specialInstructions: '' }],
      type: 'room_service',
      specialInstructions: ''
    });
  };

  const addOrderItem = () => {
    setOrderForm({
      ...orderForm,
      items: [...orderForm.items, { foodId: '', quantity: 1, specialInstructions: '' }]
    });
  };

  const removeOrderItem = (index: number) => {
    const newItems = orderForm.items.filter((_, i) => i !== index);
    setOrderForm({ ...orderForm, items: newItems.length > 0 ? newItems : [{ foodId: '', quantity: 1, specialInstructions: '' }] });
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const newItems = [...orderForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setOrderForm({ ...orderForm, items: newItems });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.room.number.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesType = typeFilter === 'all' || order.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant="outline" className={statusColors[status as keyof typeof statusColors]}>
        {statusLabels[status as keyof typeof statusLabels]}
      </Badge>
    );
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'delivered'
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

  const canAdvanceStatus = (status: string) => {
    return ['pending', 'confirmed', 'preparing', 'ready'].includes(status);
  };

  // Safe date formatting function
  const formatDateSafely = (dateString: string | undefined, fallbackDate?: string) => {
    try {
      if (dateString) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return formatDistanceToNow(date, { addSuffix: true });
        }
      }
      if (fallbackDate) {
        const fallback = new Date(fallbackDate);
        if (!isNaN(fallback.getTime())) {
          return formatDistanceToNow(fallback, { addSuffix: true });
        }
      }
      return 'Recently';
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Recently';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          // Loading skeleton for stats
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : statsError ? (
          // Error state for stats
          <div className="col-span-full">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-center">
                <div className="text-red-600 mb-2">
                  <AlertCircle className="h-8 w-8 mx-auto" />
                </div>
                <p className="text-red-800 font-medium">{statsError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchStats}
                  className="mt-2"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending?.count || 0}</div>
                <p className="text-xs text-muted-foreground">
                  ₹{stats.pending?.totalAmount || 0} pending
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <ChefHat className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {(stats.confirmed?.count || 0) + (stats.preparing?.count || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Confirmed: {stats.confirmed?.count || 0} | Preparing: {stats.preparing?.count || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ready for Delivery</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.ready?.count || 0}</div>
                <p className="text-xs text-muted-foreground">
                  ₹{stats.ready?.totalAmount || 0} ready
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{stats.totalRevenue || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Period: {stats.period || 'today'}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Additional Stats Row */}
      {!statsLoading && !statsError && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.delivered?.count || 0}</div>
              <p className="text-xs text-muted-foreground">
                ₹{stats.delivered?.totalAmount || 0} completed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled Orders</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.cancelled?.count || 0}</div>
              <p className="text-xs text-muted-foreground">
                ₹{stats.cancelled?.totalAmount || 0} cancelled
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.pending?.count || 0) + 
                 (stats.confirmed?.count || 0) + 
                 (stats.preparing?.count || 0) + 
                 (stats.ready?.count || 0) + 
                 (stats.delivered?.count || 0) + 
                 (stats.cancelled?.count || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                All time orders
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="room_service">Room Service</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="takeaway">Takeaway</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
              <DialogDescription>
                Create a new food order for a guest.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guest">Guest *</Label>
                  <Select value={orderForm.guestId} onValueChange={(value) => setOrderForm({...orderForm, guestId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select guest" />
                    </SelectTrigger>
                    <SelectContent>
                      {guests.map((guest) => (
                        <SelectItem key={guest._id} value={guest._id}>
                          {guest.name} - Room {guest.roomNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Order Type *</Label>
                  <Select value={orderForm.type} onValueChange={(value: any) => setOrderForm({...orderForm, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="room_service">Room Service</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="takeaway">Takeaway</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Order Items *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOrderItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                
                {orderForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                    <div className="col-span-5">
                      <Label className="text-sm">Food Item</Label>
                      <Select 
                        value={item.foodId} 
                        onValueChange={(value) => updateOrderItem(index, 'foodId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select food item" />
                        </SelectTrigger>
                        <SelectContent>
                          {foodItems.map((food) => (
                            <SelectItem key={food._id} value={food._id}>
                              {food.name} - ₹{food.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-sm">Special Instructions</Label>
                      <Input
                        value={item.specialInstructions}
                        onChange={(e) => updateOrderItem(index, 'specialInstructions', e.target.value)}
                        placeholder="Optional..."
                      />
                    </div>
                    <div className="col-span-1">
                      {orderForm.items.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOrderItem(index)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialInstructions">Order Special Instructions</Label>
                <Input
                  id="specialInstructions"
                  value={orderForm.specialInstructions}
                  onChange={(e) => setOrderForm({...orderForm, specialInstructions: e.target.value})}
                  placeholder="Any special instructions for the entire order..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrder} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Order'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Loading orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No orders found matching your criteria.
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">#{order.orderNumber}</h3>
                        {getStatusBadge(order.status)}
                        <Badge variant="secondary" className="capitalize">
                          {order.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {order.guest.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Room {order.room.number}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ₹{order.totalAmount}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateSafely(order.orderDate, order.createdAt || order.updatedAt)}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {order.items.length} item{order.items.length > 1 ? 's' : ''}: {order.items.map(item => `${item.quantity}x ${item.food.name}`).join(', ')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {canAdvanceStatus(order.status) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleUpdateOrderStatus(order._id, getNextStatus(order.status)!)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {getNextStatus(order.status) === 'confirmed' && 'Confirm'}
                        {getNextStatus(order.status) === 'preparing' && 'Start Preparing'}
                        {getNextStatus(order.status) === 'ready' && 'Mark Ready'}
                        {getNextStatus(order.status) === 'delivered' && 'Mark Delivered'}
                      </Button>
                    )}
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateOrderStatus(order._id, 'cancelled')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Order Number</Label>
                  <p className="text-sm">#{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Guest</Label>
                  <p className="text-sm">{selectedOrder.guest.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Room</Label>
                  <p className="text-sm">Room {selectedOrder.room.number}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Order Type</Label>
                  <p className="text-sm capitalize">{selectedOrder.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <p className="text-sm font-semibold">₹{selectedOrder.totalAmount}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Order Items</Label>
                <div className="mt-2 space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">
                          {item.quantity}x {item.food?.name || item.foodName || 'Unknown Item'}
                        </span>
                        {item.specialInstructions && (
                          <p className="text-xs text-muted-foreground">Note: {item.specialInstructions}</p>
                        )}
                      </div>
                      <span className="font-medium">₹{item.price || item.unitPrice || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Order Date</Label>
                  <p className="text-sm">
                    {selectedOrder.orderDate ? 
                      new Date(selectedOrder.orderDate).toLocaleString() :
                      new Date(selectedOrder.createdAt || selectedOrder.updatedAt).toLocaleString()
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Status</Label>
                  <Badge variant={selectedOrder.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                    {selectedOrder.paymentStatus}
                  </Badge>
                </div>
              </div>

              {selectedOrder.specialInstructions && (
                <div>
                  <Label className="text-sm font-medium">Special Instructions</Label>
                  <p className="text-sm">{selectedOrder.specialInstructions}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

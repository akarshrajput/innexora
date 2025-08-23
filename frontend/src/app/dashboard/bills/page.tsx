'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  DollarSign,
  User,
  Building2,
  Receipt,
  CreditCard,
  Percent,
  Eye,
  FileText,
  CheckCircle,
  Calculator
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface BillItem {
  type: 'room_charge' | 'food_order' | 'service_charge' | 'tax' | 'other';
  description: string;
  amount: number;
  quantity?: number;
  date: string;
  reference?: string;
}

interface Payment {
  amount: number;
  method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other';
  reference?: string;
  date: string;
  notes?: string;
}

interface Bill {
  _id: string;
  billNumber: string;
  guest: {
    _id: string;
    name: string;
    phone: string;
  };
  room: {
    _id: string;
    number: string;
  };
  items: BillItem[];
  payments: Payment[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount: number;
  balance: number;
  status: 'active' | 'paid' | 'partially_paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

interface Guest {
  _id: string;
  name: string;
  phone: string;
  roomNumber: string;
}

interface AddItemForm {
  type: 'room_charge' | 'food_order' | 'service_charge' | 'tax' | 'other';
  description: string;
  amount: number;
  quantity: number;
}

interface AddPaymentForm {
  amount: number;
  method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other';
  reference: string;
  notes: string;
}

const statusColors = {
  active: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  partially_paid: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusLabels = {
  active: 'Active',
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  cancelled: 'Cancelled'
};

const itemTypeLabels = {
  room_charge: 'Room Charge',
  food_order: 'Food Order',
  service_charge: 'Service Charge',
  tax: 'Tax',
  other: 'Other'
};

const paymentMethodLabels = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  other: 'Other'
};

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isAddPaymentDialogOpen, setIsAddPaymentDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    paidBills: 0,
    overdueAmount: 0
  });

  const [addItemForm, setAddItemForm] = useState<AddItemForm>({
    type: 'other',
    description: '',
    amount: 0,
    quantity: 1
  });

  const [addPaymentForm, setAddPaymentForm] = useState<AddPaymentForm>({
    amount: 0,
    method: 'cash',
    reference: '',
    notes: ''
  });

  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);

  useEffect(() => {
    fetchBills();
    fetchGuests();
    fetchStats();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await apiClient.get('/bills');
      setBills(response.data.data);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to fetch bills');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGuests = async () => {
    try {
      const response = await apiClient.get('/guests');
      setGuests(response.data.data);
    } catch (error) {
      console.error('Error fetching guests:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/bills/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAddItem = async () => {
    if (!selectedBill) return;
    
    try {
      setIsLoading(true);
      await apiClient.post(`/bills/${selectedBill._id}/items`, addItemForm);
      toast.success('Item added to bill successfully!');
      setIsAddItemDialogOpen(false);
      resetAddItemForm();
      fetchBills();
      fetchStats();
      // Refresh selected bill
      const updatedBill = bills.find(b => b._id === selectedBill._id);
      if (updatedBill) setSelectedBill(updatedBill);
    } catch (error: any) {
      console.error('Error adding item to bill:', error);
      toast.error(error.response?.data?.message || 'Failed to add item to bill');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedBill) return;
    
    try {
      setIsLoading(true);
      await apiClient.post(`/bills/${selectedBill._id}/payments`, addPaymentForm);
      toast.success('Payment added successfully!');
      setIsAddPaymentDialogOpen(false);
      resetAddPaymentForm();
      fetchBills();
      fetchStats();
      // Refresh selected bill
      const updatedBill = bills.find(b => b._id === selectedBill._id);
      if (updatedBill) setSelectedBill(updatedBill);
    } catch (error: any) {
      console.error('Error adding payment:', error);
      toast.error(error.response?.data?.message || 'Failed to add payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!selectedBill) return;
    
    try {
      setIsLoading(true);
      await apiClient.post(`/bills/${selectedBill._id}/discount`, { amount: discountAmount, description: 'Manager Discount' });
      toast.success('Discount applied successfully!');
      setDiscountAmount(0);
      fetchBills();
      fetchStats();
      // Refresh selected bill
      const updatedBill = bills.find(b => b._id === selectedBill._id);
      if (updatedBill) setSelectedBill(updatedBill);
    } catch (error: any) {
      console.error('Error applying discount:', error);
      toast.error(error.response?.data?.message || 'Failed to apply discount');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTax = async () => {
    if (!selectedBill) return;
    
    try {
      setIsLoading(true);
      await apiClient.post(`/bills/${selectedBill._id}/tax`, { percentage: taxAmount, description: 'Service Tax' });
      toast.success('Tax applied successfully!');
      setTaxAmount(0);
      fetchBills();
      fetchStats();
      // Refresh selected bill
      const updatedBill = bills.find(b => b._id === selectedBill._id);
      if (updatedBill) setSelectedBill(updatedBill);
    } catch (error: any) {
      console.error('Error applying tax:', error);
      toast.error(error.response?.data?.message || 'Failed to apply tax');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeBill = async (billId: string) => {
    try {
      setIsLoading(true);
      await apiClient.post(`/bills/${billId}/finalize`);
      toast.success('Bill finalized successfully!');
      fetchBills();
      fetchStats();
    } catch (error: any) {
      console.error('Error finalizing bill:', error);
      toast.error(error.response?.data?.message || 'Failed to finalize bill');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAddItemForm = () => {
    setAddItemForm({
      type: 'other',
      description: '',
      amount: 0,
      quantity: 1
    });
  };

  const resetAddPaymentForm = () => {
    setAddPaymentForm({
      amount: 0,
      method: 'cash',
      reference: '',
      notes: ''
    });
  };

  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.room.number.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant="outline" className={statusColors[status as keyof typeof statusColors]}>
        {statusLabels[status as keyof typeof statusLabels]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹{stats.pendingAmount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Bills</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paidBills}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{stats.overdueAmount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bills..."
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bills List */}
      <Card>
        <CardHeader>
          <CardTitle>Bill Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Loading bills...</div>
            ) : filteredBills.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No bills found matching your criteria.
              </div>
            ) : (
              filteredBills.map((bill) => (
                <div key={bill._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">#{bill.billNumber}</h3>
                        {getStatusBadge(bill.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {bill.guest.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Room {bill.room.number}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Total: ₹{bill.total}
                        </div>
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          Balance: ₹{bill.balance}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {bill.items.length} item{bill.items.length > 1 ? 's' : ''} • 
                        Created {formatDistanceToNow(new Date(bill.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBill(bill);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {bill.status === 'active' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleFinalizeBill(bill._id)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Finalize
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bill Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
            <DialogDescription>
              View and manage bill details, add items, payments, and apply discounts.
            </DialogDescription>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-6">
              {/* Bill Header */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Bill Number</Label>
                  <p className="text-sm">#{selectedBill.billNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedBill.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Guest</Label>
                  <p className="text-sm">{selectedBill.guest.name} - Room {selectedBill.room.number}</p>
                </div>
              </div>

              {/* Bill Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Bill Items</Label>
                  {selectedBill.status === 'active' && (
                    <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Item
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Bill Item</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label>Item Type</Label>
                            <Select value={addItemForm.type} onValueChange={(value: any) => setAddItemForm({...addItemForm, type: value})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(itemTypeLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                              value={addItemForm.description}
                              onChange={(e) => setAddItemForm({...addItemForm, description: e.target.value})}
                              placeholder="Item description"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Amount (₹)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={addItemForm.amount}
                                onChange={(e) => setAddItemForm({...addItemForm, amount: parseFloat(e.target.value) || 0})}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                value={addItemForm.quantity}
                                onChange={(e) => setAddItemForm({...addItemForm, quantity: parseInt(e.target.value) || 1})}
                              />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleAddItem}>Add Item</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <div className="space-y-2">
                  {selectedBill.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{itemTypeLabels[item.type as keyof typeof itemTypeLabels]}</span>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        {item.quantity && item.quantity > 1 && (
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        )}
                      </div>
                      <span className="font-medium">₹{item.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Payments</Label>
                  {selectedBill.status !== 'paid' && (
                    <Dialog open={isAddPaymentDialogOpen} onOpenChange={setIsAddPaymentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Payment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Payment</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Amount (₹)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={addPaymentForm.amount}
                                onChange={(e) => setAddPaymentForm({...addPaymentForm, amount: parseFloat(e.target.value) || 0})}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Payment Method</Label>
                              <Select value={addPaymentForm.method} onValueChange={(value: any) => setAddPaymentForm({...addPaymentForm, method: value})}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Reference</Label>
                            <Input
                              value={addPaymentForm.reference}
                              onChange={(e) => setAddPaymentForm({...addPaymentForm, reference: e.target.value})}
                              placeholder="Transaction reference (optional)"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                              value={addPaymentForm.notes}
                              onChange={(e) => setAddPaymentForm({...addPaymentForm, notes: e.target.value})}
                              placeholder="Payment notes (optional)"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddPaymentDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleAddPayment}>Add Payment</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <div className="space-y-2">
                  {selectedBill.payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payments recorded</p>
                  ) : (
                    selectedBill.payments.map((payment, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded">
                        <div>
                          <span className="font-medium">{paymentMethodLabels[payment.method as keyof typeof paymentMethodLabels]}</span>
                          {payment.reference && (
                            <p className="text-sm text-muted-foreground">Ref: {payment.reference}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.date).toLocaleString()}
                          </p>
                        </div>
                        <span className="font-medium text-green-600">₹{payment.amount}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Discount and Tax Controls */}
              {selectedBill.status === 'active' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Apply Discount</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                        placeholder="Discount amount"
                      />
                      <Button variant="outline" onClick={handleApplyDiscount}>
                        <Percent className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Apply Tax</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={taxAmount}
                        onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                        placeholder="Tax percentage"
                      />
                      <Button variant="outline" onClick={handleApplyTax}>
                        <Calculator className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bill Summary */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{selectedBill.subtotal}</span>
                  </div>
                  {selectedBill.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-₹{selectedBill.discount}</span>
                    </div>
                  )}
                  {selectedBill.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>₹{selectedBill.tax}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>₹{selectedBill.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid Amount:</span>
                    <span className="text-green-600">₹{selectedBill.paidAmount}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Balance:</span>
                    <span className={selectedBill.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                      ₹{selectedBill.balance}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Hotel, Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Room {
  id: string;
  _id: string;
  number: string;
  type: string;
  floor: number;
  price: number;
  capacity: number;
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  description?: string;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [formData, setFormData] = useState({
    number: '',
    type: '',
    floor: 1,
    price: 0,
    capacity: 2,
    status: 'available' as Room['status'],
    description: ''
  });

  const fetchRooms = async () => {
    try {
      console.log('Fetching rooms...');
      const response = await apiClient.get('/rooms');
      console.log('Rooms API Response:', response.data);
      
      // Handle the expected response format: { success: true, data: Room[], count: number }
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const roomsData = response.data.data;
        console.log('Rooms data:', roomsData);
        
        // Transform the data to match our frontend Room interface
        const processedRooms = roomsData.map((room: any) => ({
          ...room,
          id: room._id, // Map _id to id
          _id: room._id, // Keep _id for backward compatibility
          // Ensure all required fields have default values if missing
          number: room.number || '',
          type: room.type || 'Standard',
          floor: room.floor || 1,
          price: room.price || 0,
          capacity: room.capacity || 2,
          amenities: Array.isArray(room.amenities) ? room.amenities : [],
          status: room.status || 'available',
          description: room.description || ''
        }));
        
        console.log('Processed rooms:', processedRooms);
        setRooms(processedRooms);
      } else {
        console.error('Unexpected API response format:', response.data);
        setRooms([]);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      toast.error('Failed to load rooms');
      setRooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    
    try {
      await apiClient.delete(`/rooms/${id}`);
      setRooms(rooms.filter(room => room.id !== id));
      toast.success('Room deleted successfully');
    } catch (error) {
      console.error('Failed to delete room:', error);
      toast.error('Failed to delete room');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Prepare the room data with proper types
      const roomData = {
        ...formData,
        price: Number(formData.price) || 0,
        floor: Number(formData.floor) || 1,
        capacity: Number(formData.capacity) || 2,
      };
      
      if (editingRoom) {
        await apiClient.put(`/rooms/${editingRoom._id}`, roomData);
        toast.success('Room updated successfully');
      } else {
        // For new rooms, the backend will add the manager ID from the auth token
        await apiClient.post('/rooms', roomData);
        toast.success('Room created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingRoom(null);
      setFormData({ 
        number: '', 
        type: '', 
        floor: 1, 
        price: 0, 
        capacity: 2, 
        status: 'available', 
        description: '' 
      });
      fetchRooms();
    } catch (error) {
      console.error('Failed to save room:', error);
      toast.error('Failed to save room');
    }
  };

  const openEditDialog = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      number: room.number,
      type: room.type,
      floor: room.floor,
      price: room.price || 0,
      capacity: room.capacity || 2,
      status: room.status,
      description: room.description || ''
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingRoom(null);
    setFormData({ 
      number: '', 
      type: '', 
      floor: 1, 
      price: 0, 
      capacity: 2, 
      status: 'available', 
      description: '' 
    });
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: Room['status']) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'occupied': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-red-100 text-red-800';
      case 'cleaning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (room.description && room.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
    const matchesType = typeFilter === 'all' || room.type === typeFilter;
    const matchesFloor = floorFilter === 'all' || room.floor.toString() === floorFilter;
    
    const matchesPrice = (() => {
      if (!priceRange.min && !priceRange.max) return true;
      const price = room.price || 0;
      const min = priceRange.min ? parseFloat(priceRange.min) : 0;
      const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
      return price >= min && price <= max;
    })();
    
    return matchesSearch && matchesStatus && matchesType && matchesFloor && matchesPrice;
  });

  const uniqueTypes = Array.from(new Set(rooms.map(room => room.type))).sort();
  const uniqueFloors = Array.from(new Set(rooms.map(room => room.floor))).sort((a, b) => a - b);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setFloorFilter('all');
    setPriceRange({ min: '', max: '' });
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Room Management</h1>
          <p className="text-muted-foreground">Manage hotel rooms and their status</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Room
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Floor Filter */}
            <Select value={floorFilter} onValueChange={setFloorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Floors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Floors</SelectItem>
                {uniqueFloors.map(floor => (
                  <SelectItem key={floor} value={floor.toString()}>Floor {floor}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Price Range */}
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min price"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                className="w-full"
              />
              <Input
                type="number"
                placeholder="Max price"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                className="w-full"
              />
            </div>
            
            {/* Clear Filters */}
            <Button variant="outline" onClick={clearFilters} className="w-full">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5" />
            Rooms ({filteredRooms.length} of {rooms.length})
          </CardTitle>
          <CardDescription>
            Manage all hotel rooms, their types, and current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading rooms...
                  </TableCell>
                </TableRow>
              ) : filteredRooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {rooms.length === 0 ? 'No rooms found. Add your first room to get started.' : 'No rooms match your current filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRooms.map((room) => (
                  <TableRow key={room._id}>
                    <TableCell className="font-medium">{room.number}</TableCell>
                    <TableCell>{room.type}</TableCell>
                    <TableCell>{room.floor}</TableCell>
                    <TableCell>${room.price?.toFixed(2)}</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(room.status)}>
                        {room.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {room.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(room)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(room._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Room Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? 'Edit Room' : 'Add New Room'}
            </DialogTitle>
            <DialogDescription>
              {editingRoom ? 'Update room information' : 'Add a new room to the hotel'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="number">Room Number</Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Room Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Deluxe">Deluxe</SelectItem>
                    <SelectItem value="Suite">Suite</SelectItem>
                    <SelectItem value="Presidential">Presidential</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  type="number"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="price">Price per night ($)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  placeholder="e.g., 99.99"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="10"
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: Room['status']) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Room description or notes"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingRoom ? 'Update Room' : 'Add Room'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

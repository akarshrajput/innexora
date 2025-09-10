"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  UserCheck,
  UserX,
  Plus,
  Search,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  Building2,
  Eye,
  Edit,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Guest {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  idType: string;
  idNumber: string;
  checkInDate: string;
  checkOutDate: string;
  actualCheckOutDate?: string;
  roomNumber: string;
  numberOfGuests: number;
  status: "checked_in" | "checked_out" | "cancelled" | "no_show";
  specialRequests?: string;
  notes?: string;
  room: {
    _id: string;
    number: string;
    type: string;
    floor: number;
    price: number;
  };
  stayDuration: number;
}

interface Room {
  _id: string;
  number: string;
  type: string;
  floor: number;
  price: number;
  status: "available" | "occupied" | "maintenance" | "cleaning";
  capacity: number;
}

interface CheckInForm {
  name: string;
  email: string;
  phone: string;
  idType: string;
  idNumber: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  roomId: string;
  specialRequests: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 10,
  });
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("checked_in");
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    checked_in: 0,
    checked_out: 0,
    occupiedRooms: 0,
    totalRooms: 0,
    occupancyRate: 0,
  });

  const [checkInForm, setCheckInForm] = useState<CheckInForm>({
    name: "",
    email: "",
    phone: "",
    idType: "passport",
    idNumber: "",
    checkInDate: new Date().toISOString().split("T")[0],
    checkOutDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    numberOfGuests: 1,
    roomId: "",
    specialRequests: "",
    address: {
      street: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
    },
    emergencyContact: {
      name: "",
      phone: "",
      relationship: "",
    },
  });

  useEffect(() => {
    fetchGuests();
    fetchAvailableRooms();
    fetchStats();
  }, [pagination.current, searchTerm, statusFilter]);

  useEffect(() => {
    // Refetch guests when status filter changes
    fetchGuests();
  }, [statusFilter]);

  const fetchGuests = async () => {
    try {
      // By default, only fetch active guests (checked-in)
      let endpoint = "/guests/active";

      // If user wants to see all guests or specific status, use the main endpoint
      if (statusFilter === "all" || statusFilter !== "checked_in") {
        endpoint = "/guests";
        const params = new URLSearchParams({
          page: pagination.current.toString(),
          limit: pagination.limit.toString(),
        });

        if (searchTerm) params.append("search", searchTerm);
        if (statusFilter !== "all") params.append("status", statusFilter);

        endpoint += `?${params}`;
      } else {
        // For active guests, add search if provided
        if (searchTerm) {
          endpoint += `?search=${encodeURIComponent(searchTerm)}`;
        }
      }

      const response = await apiClient.get(endpoint);

      // Handle both response formats for backward compatibility
      const guestsData = response.data.data || [];
      const paginationData = response.data.pagination || {
        current: 1,
        pages: 1,
        total: guestsData.length,
        limit: pagination.limit,
      };

      setGuests(guestsData);
      setPagination({
        current: paginationData.current || 1,
        pages: paginationData.pages || 1,
        total: paginationData.total || guestsData.length,
        limit: paginationData.limit || 10,
      });
    } catch (error) {
      console.error("Error fetching guests:", error);
      toast.error("Failed to fetch guests");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableRooms = async () => {
    try {
      const response = await apiClient.get("/rooms");
      setAvailableRooms(
        response.data.data.filter((room: Room) => room.status === "available")
      );
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get("/guests/stats");
      setStats(response.data.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchGuestHistory = async () => {
    try {
      const response = await apiClient.get("/guests/history");
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching guest history:", error);
      return [];
    }
  };

  const handleCheckIn = async () => {
    try {
      setIsLoading(true);
      await apiClient.post("/guests/checkin", checkInForm);
      toast.success("Guest checked in successfully!");
      setIsCheckInDialogOpen(false);
      resetCheckInForm();
      fetchGuests();
      fetchAvailableRooms();
      fetchStats();
    } catch (error: any) {
      console.error("Error checking in guest:", error);
      toast.error(error.response?.data?.message || "Failed to check in guest");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async (guestId: string) => {
    try {
      setIsLoading(true);
      await apiClient.put(`/guests/${guestId}/checkout`, {
        checkedOutBy: "Manager", // This should come from user context
      });
      toast.success("Guest checked out successfully!");
      fetchGuests();
      fetchAvailableRooms();
      fetchStats();
    } catch (error: any) {
      console.error("Error checking out guest:", error);
      toast.error(error.response?.data?.message || "Failed to check out guest");
    } finally {
      setIsLoading(false);
    }
  };

  const resetCheckInForm = () => {
    setCheckInForm({
      name: "",
      email: "",
      phone: "",
      idType: "passport",
      idNumber: "",
      checkInDate: new Date().toISOString().split("T")[0],
      checkOutDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      numberOfGuests: 1,
      roomId: "",
      specialRequests: "",
      address: {
        street: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
      },
      emergencyContact: {
        name: "",
        phone: "",
        relationship: "",
      },
    });
  };

  const filteredGuests = guests.filter((guest) => {
    const matchesSearch =
      guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.roomNumber.includes(searchTerm) ||
      guest.phone.includes(searchTerm);
    const matchesStatus =
      statusFilter === "all" || guest.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "checked_in":
        return <Badge variant="default">Checked In</Badge>;
      case "checked_out":
        return <Badge variant="secondary">Checked Out</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "no_show":
        return <Badge variant="outline">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Guests</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.checked_in}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Occupancy Rate
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupancyRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.occupiedRooms} of {stats.totalRooms} rooms
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Rooms
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableRooms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Check-outs
            </CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.checked_out}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guests..."
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
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              // Navigate to guest history page
              window.location.href = "/dashboard/guest-history";
            }}
          >
            <UserX className="h-4 w-4 mr-2" />
            View Guest History
          </Button>
        </div>

        <Dialog
          open={isCheckInDialogOpen}
          onOpenChange={setIsCheckInDialogOpen}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Check In Guest
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Check In New Guest</DialogTitle>
              <DialogDescription>
                Fill in the guest details to complete check-in process.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={checkInForm.name}
                    onChange={(e) =>
                      setCheckInForm({ ...checkInForm, name: e.target.value })
                    }
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={checkInForm.phone}
                    onChange={(e) =>
                      setCheckInForm({ ...checkInForm, phone: e.target.value })
                    }
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={checkInForm.email}
                    onChange={(e) =>
                      setCheckInForm({ ...checkInForm, email: e.target.value })
                    }
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numberOfGuests">Number of Guests *</Label>
                  <Input
                    id="numberOfGuests"
                    type="number"
                    min="1"
                    value={checkInForm.numberOfGuests}
                    onChange={(e) =>
                      setCheckInForm({
                        ...checkInForm,
                        numberOfGuests: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="idType">ID Type *</Label>
                  <Select
                    value={checkInForm.idType}
                    onValueChange={(value) =>
                      setCheckInForm({ ...checkInForm, idType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="driving_license">
                        Driving License
                      </SelectItem>
                      <SelectItem value="national_id">National ID</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idNumber">ID Number *</Label>
                  <Input
                    id="idNumber"
                    value={checkInForm.idNumber}
                    onChange={(e) =>
                      setCheckInForm({
                        ...checkInForm,
                        idNumber: e.target.value,
                      })
                    }
                    placeholder="Enter ID number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkInDate">Check-in Date *</Label>
                  <Input
                    id="checkInDate"
                    type="date"
                    value={checkInForm.checkInDate}
                    onChange={(e) =>
                      setCheckInForm({
                        ...checkInForm,
                        checkInDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkOutDate">Check-out Date *</Label>
                  <Input
                    id="checkOutDate"
                    type="date"
                    value={checkInForm.checkOutDate}
                    onChange={(e) =>
                      setCheckInForm({
                        ...checkInForm,
                        checkOutDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roomId">Room *</Label>
                  <Select
                    value={checkInForm.roomId}
                    onValueChange={(value) =>
                      setCheckInForm({ ...checkInForm, roomId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((room) => (
                        <SelectItem key={room._id} value={room._id}>
                          Room {room.number} - {room.type} (₹{room.price}/night)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Textarea
                  id="specialRequests"
                  value={checkInForm.specialRequests}
                  onChange={(e) =>
                    setCheckInForm({
                      ...checkInForm,
                      specialRequests: e.target.value,
                    })
                  }
                  placeholder="Any special requests or notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCheckInDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCheckIn} disabled={isLoading}>
                {isLoading ? "Checking In..." : "Check In Guest"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Guests List */}
      <Card>
        <CardHeader>
          <CardTitle>Guest Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Loading guests...</div>
            ) : filteredGuests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No guests found matching your criteria.
              </div>
            ) : (
              filteredGuests.map((guest) => (
                <div
                  key={guest._id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{guest.name}</h3>
                        {getStatusBadge(guest.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Room {guest.roomNumber}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {guest.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(guest.checkInDate), {
                            addSuffix: true,
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {guest.stayDuration} nights
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedGuest(guest);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {guest.status === "checked_in" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCheckOut(guest._id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Check Out
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(pagination.current - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.current * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} guests
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        current: prev.current - 1,
                      }))
                    }
                    disabled={pagination.current === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: Math.min(5, pagination.pages) },
                      (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={
                              pagination.current === page
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              setPagination((prev) => ({
                                ...prev,
                                current: page,
                              }))
                            }
                          >
                            {page}
                          </Button>
                        );
                      }
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        current: prev.current + 1,
                      }))
                    }
                    disabled={pagination.current === pagination.pages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Guest Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Guest Details</DialogTitle>
          </DialogHeader>
          {selectedGuest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm">{selectedGuest.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedGuest.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Room</Label>
                  <p className="text-sm">
                    Room {selectedGuest.roomNumber} - {selectedGuest.room.type}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-sm">{selectedGuest.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Check-in Date</Label>
                  <p className="text-sm">
                    {new Date(selectedGuest.checkInDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Check-out Date</Label>
                  <p className="text-sm">
                    {new Date(selectedGuest.checkOutDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">ID Type</Label>
                  <p className="text-sm capitalize">
                    {selectedGuest.idType.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">ID Number</Label>
                  <p className="text-sm">{selectedGuest.idNumber}</p>
                </div>
              </div>

              {selectedGuest.specialRequests && (
                <div>
                  <Label className="text-sm font-medium">
                    Special Requests
                  </Label>
                  <p className="text-sm">{selectedGuest.specialRequests}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

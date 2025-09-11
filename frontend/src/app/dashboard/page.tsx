"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Users,
  Building,
  ClipboardList,
  TrendingUp,
  DollarSign,
  Bed,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { dashboardApi } from "@/lib/api";

interface DashboardStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  maintenanceRooms: number;
  cleaningRooms: number;
  totalGuests: number;
  checkedInGuests: number;
  totalTickets: number;
  pendingTickets: number;
  occupancyRate: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    maintenanceRooms: 0,
    cleaningRooms: 0,
    totalGuests: 0,
    checkedInGuests: 0,
    totalTickets: 0,
    pendingTickets: 0,
    occupancyRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch rooms using dashboardApi
      try {
        const roomsResponse = await dashboardApi.getRooms();
        if (roomsResponse.success && Array.isArray(roomsResponse.data)) {
          const rooms = roomsResponse.data;

          const roomStats = rooms.reduce(
            (acc: any, room: any) => {
              acc.totalRooms++;
              switch (room.status) {
                case "available":
                  acc.availableRooms++;
                  break;
                case "occupied":
                  acc.occupiedRooms++;
                  break;
                case "maintenance":
                  acc.maintenanceRooms++;
                  break;
                case "cleaning":
                  acc.cleaningRooms++;
                  break;
              }
              return acc;
            },
            {
              totalRooms: 0,
              availableRooms: 0,
              occupiedRooms: 0,
              maintenanceRooms: 0,
              cleaningRooms: 0,
            }
          );

          const occupancyRate =
            roomStats.totalRooms > 0
              ? (roomStats.occupiedRooms / roomStats.totalRooms) * 100
              : 0;

          setStats((prev) => ({
            ...prev,
            ...roomStats,
            occupancyRate: Math.round(occupancyRate),
          }));
        }
      } catch (error) {
        console.error("Failed to fetch rooms:", error);
      }

      // Fetch guests using dashboardApi
      try {
        const guestsResponse = await dashboardApi.getGuests();
        if (guestsResponse.success && Array.isArray(guestsResponse.data)) {
          const guests = guestsResponse.data;

          const guestStats = guests.reduce(
            (acc: any, guest: any) => {
              acc.totalGuests++;
              if (guest.status === "checked_in") {
                acc.checkedInGuests++;
              }
              return acc;
            },
            { totalGuests: 0, checkedInGuests: 0 }
          );

          setStats((prev) => ({
            ...prev,
            ...guestStats,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch guests:", error);
      }

      // Fetch tickets using dashboardApi
      try {
        const ticketsResponse = await dashboardApi.getTickets();
        if (ticketsResponse.success && Array.isArray(ticketsResponse.data)) {
          const tickets = ticketsResponse.data;
          const ticketStats = {
            totalTickets: tickets.length,
            pendingTickets: tickets.filter((t: any) => t.status === "raised")
              .length,
          };

          setStats((prev) => ({
            ...prev,
            ...ticketStats,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch tickets:", error);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error(
        "Please make sure the backend server is running on port 5050"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRooms}</div>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading..." : `${stats.availableRooms} available`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Occupancy Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{`${stats.occupancyRate}%`}</div>
              <p className="text-xs text-muted-foreground">
                {isLoading
                  ? "Loading..."
                  : `${stats.occupiedRooms} of ${stats.totalRooms} rooms`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Guests
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.checkedInGuests}</div>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading..." : `${stats.totalGuests} total guests`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Service Requests
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingTickets}</div>
              <p className="text-xs text-muted-foreground">
                {isLoading
                  ? "Loading..."
                  : `${stats.totalTickets} total requests`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Room Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Room Status Overview</CardTitle>
            <CardDescription>
              Current status of all rooms in the hotel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Available
                  </p>
                  <p className="text-2xl font-bold">{stats.availableRooms}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Bed className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Occupied
                  </p>
                  <p className="text-2xl font-bold">{stats.occupiedRooms}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Maintenance
                  </p>
                  <p className="text-2xl font-bold">{stats.maintenanceRooms}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Cleaning
                  </p>
                  <p className="text-2xl font-bold">{stats.cleaningRooms}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Access key hotel management features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/dashboard/rooms">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Building className="h-6 w-6" />
                  <span>Manage Rooms</span>
                </Button>
              </Link>

              <Link href="/dashboard/guests">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Users className="h-6 w-6" />
                  <span>Guest Management</span>
                </Button>
              </Link>

              <Link href="/dashboard/tickets">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <ClipboardList className="h-6 w-6" />
                  <span>Service Requests</span>
                </Button>
              </Link>

              <Link href="/dashboard/bills">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <DollarSign className="h-6 w-6" />
                  <span>Billing</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your hotel operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading recent activity...
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        System Status: All services operational
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last updated: Just now
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Dashboard loaded successfully
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Data refreshed automatically
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 ">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRooms}</div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Loading..." : `${stats.availableRooms} available`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Occupancy Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{`${stats.occupancyRate}%`}</div>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "Loading..."
                : `${stats.occupiedRooms} of ${stats.totalRooms} rooms`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Guests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.checkedInGuests}</div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Loading..." : `${stats.totalGuests} total guests`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Service Requests
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTickets}</div>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "Loading..."
                : `${stats.totalTickets} total requests`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Room Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Room Status Overview</CardTitle>
          <CardDescription>
            Current status of all rooms in the hotel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Available
                </p>
                <p className="text-2xl font-bold">{stats.availableRooms}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Bed className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Occupied
                </p>
                <p className="text-2xl font-bold">{stats.occupiedRooms}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Maintenance
                </p>
                <p className="text-2xl font-bold">{stats.maintenanceRooms}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Cleaning
                </p>
                <p className="text-2xl font-bold">{stats.cleaningRooms}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Access key hotel management features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard/rooms">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center space-y-2"
              >
                <Building className="h-6 w-6" />
                <span>Manage Rooms</span>
              </Button>
            </Link>

            <Link href="/dashboard/guests">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center space-y-2"
              >
                <Users className="h-6 w-6" />
                <span>Guest Management</span>
              </Button>
            </Link>

            <Link href="/dashboard/tickets">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center space-y-2"
              >
                <ClipboardList className="h-6 w-6" />
                <span>Service Requests</span>
              </Button>
            </Link>

            <Link href="/dashboard/bills">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center space-y-2"
              >
                <DollarSign className="h-6 w-6" />
                <span>Billing</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates from your hotel operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading recent activity...
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      System Status: All services operational
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last updated: Just now
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Dashboard loaded successfully
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Data refreshed automatically
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

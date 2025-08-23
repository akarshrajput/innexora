'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, Ticket, Menu, X, LogOut, Bell, Search, Users, Settings, Hotel, MessageSquare, UtensilsCrossed, Receipt, UserCheck, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuthStore } from '@/store/auth-store';
import { logout } from '@/lib/api/auth';
import { toast } from 'sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, setIsAuthenticated, setUser } = useAuthStore();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Rooms', href: '/dashboard/rooms', icon: Building2 },
    { name: 'Guests', href: '/dashboard/guests', icon: UserCheck },
    { name: 'Guest History', href: '/dashboard/guest-history', icon: History },
    { name: 'Food Menu', href: '/dashboard/food', icon: UtensilsCrossed },
    { name: 'Orders', href: '/dashboard/orders', icon: Receipt },
    { name: 'Bills', href: '/dashboard/bills', icon: Receipt },
    { name: 'Service Requests', href: '/dashboard/tickets', icon: Ticket },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setIsSidebarOpen(false)}
      >
        <div className="fixed inset-0 bg-black/50" />
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-card border-r transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-foreground" />
              <span className="ml-2 text-xl font-semibold text-foreground">Hotel Manager</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-6">
            <nav className="px-3 space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User profile */}
          <div className="p-4 border-t">
            <div className="flex items-center">
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <Avatar>
                  <AvatarFallback>M</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Manager</p>
                  <p className="text-xs text-muted-foreground">Hotel Staff</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-card border-b h-16 flex items-center px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden mr-2"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 flex items-center justify-between">
            <h1 className="text-lg font-semibold">
              {navItems.find((item) => item.href === pathname)?.name || 
               (pathname.startsWith('/dashboard/rooms') ? 'Rooms' : 
                pathname.startsWith('/dashboard/guests') && !pathname.startsWith('/dashboard/guest-history') ? 'Guests' :
                pathname.startsWith('/dashboard/guest-history') ? 'Guest History' :
                pathname.startsWith('/dashboard/food') ? 'Food Menu' :
                pathname.startsWith('/dashboard/orders') ? 'Orders' :
                pathname.startsWith('/dashboard/bills') ? 'Bills' :
                pathname.startsWith('/dashboard/tickets') ? 'Service Requests' : 'Dashboard')}
            </h1>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

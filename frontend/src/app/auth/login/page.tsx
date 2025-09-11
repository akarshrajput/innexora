"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { login, setAuthToken } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth-store";
import { useTenantContext } from "@/components/tenant/tenant-provider";
import { toast } from "sonner";
import Link from "next/link";
import { Hotel, Loader2 } from "lucide-react";
import Image from "next/image";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { setIsAuthenticated, setUser } = useAuthStore();
  const { hotel, isMainDomain, loading } = useTenantContext();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if on main domain
  if (isMainDomain && !loading) {
    router.push("/");
    return null;
  }

  // Show loading while tenant data is being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Show error if no hotel found (this should be handled by RouteGuard)
  if (!hotel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Hotel Not Found
          </h1>
          <p className="text-gray-600">
            This hotel subdomain is not available.
          </p>
        </div>
      </div>
    );
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      const { token, user } = await login(values);
      setAuthToken(token);
      setUser(user);
      setIsAuthenticated(true);
      toast.success("Login successful");
      router.push("/dashboard");
    } catch (error) {
      toast.error("Invalid email or password");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Hotel Header */}
        <div className="text-center space-y-4">
          {hotel.logo_url ? (
            <div className="flex justify-center">
              <Image
                src={hotel.logo_url}
                alt={`${hotel.name} logo`}
                width={80}
                height={80}
                className="rounded-lg"
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-primary/10 rounded-lg flex items-center justify-center">
                <Hotel className="w-10 h-10 text-primary" />
              </div>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{hotel.name}</h1>
            <p className="text-muted-foreground">Management Portal</p>
          </div>
        </div>

        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Sign in to access your hotel management dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Link
                          href="/auth/forgot-password"
                          className="text-sm text-primary hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="Enter your password"
                          type="password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="text-primary hover:underline"
              >
                Register here
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Hotel Info Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Powered by Innexora</p>
          {hotel.website && (
            <Link
              href={hotel.website}
              target="_blank"
              className="text-primary hover:underline"
            >
              Visit {hotel.name} website
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

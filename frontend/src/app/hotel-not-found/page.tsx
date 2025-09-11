"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, Home } from "lucide-react";

export default function HotelNotFound() {
  const handleGoToMain = () => {
    // Redirect to main domain
    window.location.href =
      process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://innexora.app";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border border-red-200 bg-red-50">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-700">
            Hotel Not Found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            The hotel subdomain you&apos;re trying to access doesn&apos;t exist
            or is currently inactive.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This could happen if:
            </p>
            <ul className="text-sm text-muted-foreground text-left space-y-1">
              <li>• The hotel subdomain was typed incorrectly</li>
              <li>• The hotel account has been suspended</li>
              <li>• The hotel is no longer using our service</li>
            </ul>
          </div>
          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={handleGoToMain} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go to Main Site
            </Button>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

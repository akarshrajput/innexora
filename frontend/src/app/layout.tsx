import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { TenantProvider } from "@/components/tenant/tenant-provider";
import { RouteGuard } from "@/components/tenant/route-guard";

export const metadata: Metadata = {
  title: "Innexora - Smart Hotel Management",
  description:
    "Modern hotel management platform with multi-tenant SaaS architecture",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TenantProvider>
            <RouteGuard>{children}</RouteGuard>
            <Toaster />
          </TenantProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

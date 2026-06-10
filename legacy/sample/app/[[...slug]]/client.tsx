"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/DashboardLayout";
import DashboardOverview from "@/pages-content/DashboardOverview";
import CallHistory from "@/pages-content/CallHistory";
import AgentConfig from "@/pages-content/AgentConfig";
import KnowledgeBase from "@/pages-content/KnowledgeBase";
import EmbedCodes from "@/pages-content/EmbedCodes";
import Integrations from "@/pages-content/Integrations";
import Analytics from "@/pages-content/Analytics";
import TeamManagement from "@/pages-content/TeamManagement";
import SettingsPage from "@/pages-content/SettingsPage";
import NotFound from "@/pages-content/NotFound";
import Login from "@/pages-content/Login";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const queryClient = new QueryClient();

// Strips the /admin basePath prefix and trailing slashes to get the logical route
function getLogicalPath(pathname: string): string {
  if (!pathname || pathname === "/" || pathname === "/admin" || pathname === "/admin/") return "/";
  
  let path = pathname;
  // Remove /admin prefix if present (robustness)
  if (path.startsWith("/admin")) {
    path = path.slice(6);
  }
  
  // Normalize: ensure starts with / and remove trailing slash
  if (!path.startsWith("/")) path = "/" + path;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  
  return path || "/";
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated =
    typeof window !== "undefined" &&
    localStorage.getItem("soulbot_auth") === "true";

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;
  return <>{children}</>;
}

// Client-side router — maps pathname to page component
function AppRouter() {
  const pathname = usePathname();
  const logicalPath = getLogicalPath(pathname);

  // Render login page (unprotected)
  if (logicalPath === "/login") {
    return <Login />;
  }

  // Render 404 for truly unknown routes
  const knownRoutes = ["/", "/login", "/calls", "/agent", "/knowledge", "/embed", "/integrations", "/analytics", "/team", "/settings"];
  if (!knownRoutes.includes(logicalPath)) {
    return <NotFound />;
  }

  // Render protected dashboard routes
  const pageMap: Record<string, React.ReactNode> = {
    "/": <DashboardOverview />,
    "/calls": <CallHistory />,
    "/agent": <AgentConfig />,
    "/knowledge": <KnowledgeBase />,
    "/embed": <EmbedCodes />,
    "/integrations": <Integrations />,
    "/analytics": <Analytics />,
    "/team": <TeamManagement />,
    "/settings": <SettingsPage />,
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {pageMap[logicalPath]}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function ClientApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
        <Sonner position="top-center" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

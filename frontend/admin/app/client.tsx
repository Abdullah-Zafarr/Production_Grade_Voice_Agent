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
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

// Strips the /admin basePath prefix and trailing slashes
function getLogicalPath(pathname: string): string {
  if (!pathname || pathname === "/" || pathname === "/admin" || pathname === "/admin/") return "/";
  let path = pathname;
  if (path.startsWith("/admin")) path = path.slice(6);
  if (!path.startsWith("/")) path = "/" + path;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path || "/";
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = true;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;
  return <>{children}</>;
}

function AppRouter() {
  const pathname = usePathname();
  const logicalPath = getLogicalPath(pathname);

  if (logicalPath === "/login") return <Login />;

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

  const page = pageMap[logicalPath];
  if (!page) return <NotFound />;

  return (
    <ProtectedRoute>
      <DashboardLayout>{page}</DashboardLayout>
    </ProtectedRoute>
  );
}

// Root client component for the Admin Dashboard
export default function ClientApp() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

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

"use client";

import {
  LayoutDashboard, Phone, Bot, BookOpen, Code2, Plug, BarChart3,
  Users, Settings, ChevronLeft, ChevronRight, ArrowLeftCircle,
  LogOut
} from "lucide-react";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || "") : "";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Call History", path: "/calls", icon: Phone },
  { title: "Agent Config", path: "/agent", icon: Bot },
  { title: "Knowledge Base", path: "/knowledge", icon: BookOpen },
  { title: "Embed Codes", path: "/embed", icon: Code2 },
  { title: "Integrations", path: "/integrations", icon: Plug },
  { title: "Analytics", path: "/analytics", icon: BarChart3 },
  { title: "Team", path: "/team", icon: Users },
  { title: "Settings", path: "/settings", icon: Settings },
];

// Navigation sidebar for the Admin Panel - defines the main navigation links
export const DashboardSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("soulbot_auth");
    router.push("/login");
  };

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col glass border-r border-border/50 transition-all duration-300 ${collapsed ? "w-16" : "w-60"
        }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-border/30">
        <img src="/admin/logo/favicon.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-glow" />
        {!collapsed && (
          <span className="text-lg font-semibold text-gradient">Soul Imaging</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={active ? "sidebar-item-active" : "sidebar-item"}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-border/20">
          <a
            href={`${API_URL}/orb`}
            target="_blank"
            rel="noreferrer"
            className="sidebar-item hover:bg-primary/10 transition-colors"
          >
            <ArrowLeftCircle className="w-[18px] h-[18px] shrink-0 text-primary" />
            {!collapsed && <span className="text-primary font-medium">Back to Voice Agent</span>}
          </a>


          <button
            onClick={handleLogout}
            className="sidebar-item w-full text-left"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-12 flex items-center justify-center border-t border-border/30 text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
};

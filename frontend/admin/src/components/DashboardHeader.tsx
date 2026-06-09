"use client";

import { Bell, Search, Calendar, PhoneCall, X, LogOut, User } from "lucide-react";
import { AIOrb } from "./AIOrb";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: 'booking' | 'call' | string;
  title: string;
  message: string;
  time: string;
}

interface Props {
  title: string;
}

const API_URL = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || "") : "";

export const DashboardHeader = ({ title }: Props) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/dashboard/notifications`);
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("soulbot_auth");
    localStorage.removeItem("soulbot_user");
    router.push("/login");
  };

  return (
    <header className="h-16 glass border-b border-border/30 flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 glass-card px-3 py-1.5 rounded-lg w-64">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
          />
        </div>

        <AIOrb />

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`relative p-2 rounded-lg transition-all ${isOpen ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-card/95 backdrop-blur-2xl rounded-xl shadow-2xl overflow-hidden border border-white/10 animate-scale-in">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-sm font-semibold">Notifications</span>
                <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  {notifications.length} New
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">No new notifications</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="px-4 py-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 cursor-default">
                      <div className="flex gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${n.type === 'booking' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                          {n.type === 'booking' ? <Calendar className="w-4 h-4" /> : <PhoneCall className="w-4 h-4" />}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold leading-none">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/50">{format(new Date(n.time), "MMM d, HH:mm")}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white shadow-glow hover:scale-105 transition-all outline-none"
          >
            JD
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-3 w-40 bg-[#0f172a]/95 backdrop-blur-2xl rounded-xl shadow-2xl overflow-hidden border border-white/10 animate-scale-in">
              <div className="p-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-3 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-bold uppercase tracking-wider"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
